// ─────────────────────────────────────────────────────────────────────────────
// Query Engine
// Hybrid search (vector + keyword boost), per-document query profiles,
// project+team scope filters, confidence-gated fallback to raw JSON,
// and auto-embed fallback when a ticket hasn't been embedded yet.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const db = require("./db");
const { adfToText } = require("./chunk");
const { loadMeta, isStale } = require("./staleness");

let _embed = null;
function getEmbed() {
  if (!_embed) _embed = require("./embed");
  return _embed;
}

function log(msg) {
  console.error(msg);
}

// ── Per-Document Query Profiles ──────────────────────────────────────────────

const QUERY_PROFILES = {
  srs: {
    query:
      "functional requirements acceptance criteria business rules user stories",
    chunkTypes: [
      "description",
      "acceptance_criteria",
      "attachment_text",
      "attachment_reference",
      "attachment_image",
      "linked_ticket_summary",
      "confluence_section",
      "rovo_related_ticket",
    ],
  },
  ui: {
    query:
      "screens user flow frontend interaction wireframes UI components layout",
    chunkTypes: [
      "attachment_image",
      "attachment_text",
      "attachment_reference",
      "ui_notes",
      "confluence_section",
      "rovo_related_page",
      "description",
    ],
  },
  tests: {
    query:
      "edge cases validation errors failure scenarios acceptance criteria bugs",
    chunkTypes: [
      "acceptance_criteria",
      "attachment_text",
      "attachment_reference",
      "attachment_image",
      "bug_ticket",
      "comment",
      "linked_ticket_summary",
    ],
  },
  subtasks: {
    query: "tasks implementation steps technical breakdown work items",
    chunkTypes: [
      "description",
      "acceptance_criteria",
      "attachment_text",
      "attachment_reference",
      "linked_ticket_summary",
    ],
  },
  issues: {
    query: "epic breakdown workstreams child issues implementation phases stories tasks bugs spikes subtasks",
    chunkTypes: [
      "description",
      "acceptance_criteria",
      "attachment_text",
      "attachment_reference",
      "linked_ticket_summary",
      "confluence_section",
      "comment",
    ],
  },
  traceability: {
    query: "requirements mapping test coverage dependency trace validation",
    chunkTypes: [
      "acceptance_criteria",
      "description",
      "attachment_text",
      "attachment_reference",
      "linked_ticket_summary",
      "bug_ticket",
    ],
  },
};

// ── Scope Filters ────────────────────────────────────────────────────────────

function buildScopeFilter(scope) {
  const filter = {};
  if (scope.project) filter.project = scope.project;
  if (scope.team) filter.team = scope.team.toLowerCase();
  return filter;
}

/** Cosine similarity for ranking ticket-scoped chunks. */
function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function passesFilter(meta, filters) {
  for (const [key, val] of Object.entries(filters)) {
    const metaValue = meta[key];
    if (Array.isArray(val)) {
      if (Array.isArray(metaValue)) {
        if (!metaValue.some((entry) => val.includes(entry))) return false;
      } else if (!val.includes(metaValue)) {
        return false;
      }
    } else if (Array.isArray(metaValue)) {
      if (!metaValue.includes(val)) return false;
    } else if (metaValue !== val) {
      return false;
    }
  }
  return true;
}

// ── Hybrid Search ────────────────────────────────────────────────────────────
// When ticket is in filters we rank all embedded chunks for the ticket first,
// then cap the returned set so prompts stay focused. For global search we use
// vector top-K with filtering.
// Preferred chunk types get a score boost so they surface first for each
// doc-type query, but non-preferred chunks are still included to maximise
// context available to the LLM.

// topK: max chunks when no ticket filter (global search). ticketTopK: max chunks
// returned for a ticket-scoped query after reranking. threshold: if top chunk
// score < threshold we set fallback=true (can add raw JSON); we do NOT filter out
// low-score chunks.
async function hybridSearch(query, filters, options = {}) {
  const {
    topK = 20,
    ticketTopK = 15,
    threshold = 0.35,
    preferredTypes = [],
  } = options;
  const { embed } = getEmbed();

  const queryVector = await embed(query);
  const keywords = query.toLowerCase().split(/\s+/);

  let rawResults;
  if (filters.ticket) {
    const projectFilter = filters.project;
    const ticketItems = await db.listItemsByFilter((item) => {
      const m = item.metadata || {};
      const linkedFrom = Array.isArray(m.linkedFrom) ? m.linkedFrom : [];
      return (
        (m.ticket === filters.ticket || linkedFrom.includes(filters.ticket)) &&
        (!projectFilter || m.project === projectFilter)
      );
    });
    if (ticketItems.length === 0) {
      rawResults = [];
    } else {
      const scored = ticketItems.map((item) => ({
        item,
        score: cosineSimilarity(queryVector, item.vector || []),
      }));
      scored.sort((a, b) => b.score - a.score);
      rawResults = scored;
    }
    log(`[RAG] Ticket-scoped: ${rawResults.length} chunks for ${filters.ticket}`);
  } else {
    const scopeFilters = { ...filters };
    delete scopeFilters.type;
    rawResults = await db.queryItems(queryVector, topK * 3).then((results) =>
      results
        .map((r) => ({ item: r.item, score: r.score }))
        .filter((r) => passesFilter(r.item?.metadata || {}, scopeFilters))
    );
  }

  const reranked = rawResults.map((result) => {
    const meta = result.item?.metadata || {};
    const searchText = (meta.textContent || meta.textPreview || "").toLowerCase();
    const keywordHits = keywords.filter((k) => searchText.includes(k)).length;

    let typeBoost = 0;
    if (preferredTypes.length > 0 && preferredTypes.includes(meta.type)) {
      typeBoost = 0.10;
    }

    return {
      ...result,
      score: result.score + keywordHits * 0.03 + typeBoost,
      metadata: meta,
    };
  });

  reranked.sort((a, b) => b.score - a.score);

  const topScore = reranked[0]?.score || 0;
  const resultCount = filters.ticket
    ? Math.min(reranked.length, ticketTopK)
    : topK;

  if (topScore < threshold) {
    log(`[RAG] Low confidence retrieval (${topScore.toFixed(2)}) — triggering fallback`);
    return { results: reranked.slice(0, resultCount), fallback: true };
  }

  return { results: reranked.slice(0, resultCount), fallback: false };
}

// ── Fallback Strategy ────────────────────────────────────────────────────────

const FALLBACK_FIELDS = {
  srs: ["root.description", "root.summary", "linked", "attachments"],
  ui: ["confluence", "root.description", "attachments"],
  tests: ["root.description", "comments", "linked", "attachments"],
  subtasks: ["root.description", "root.summary", "linked", "attachments"],
  issues: ["root.description", "root.summary", "root.issueType", "linked", "confluence", "comments", "attachments"],
  traceability: ["root.description", "linked", "comments", "attachments"],
};

function getAttachmentTextContent(attachment = {}) {
  const textFields = [
    "textContent",
    "text",
    "extractedText",
    "ocrText",
    "summary",
    "content",
  ];

  for (const field of textFields) {
    const value = attachment?.[field];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function sanitizeAttachmentForFallback(attachment = {}) {
  const textContent = getAttachmentTextContent(attachment);
  return {
    filename: attachment.filename || null,
    mimeType: attachment.mimeType || attachment.contentType || attachment.type || null,
    url: attachment.url || null,
    hasBinary: Boolean(attachment.base64),
    textContent: textContent
      ? textContent.substring(0, 2000)
      : null,
  };
}

function extractFields(obj, paths) {
  return paths.reduce((acc, dotPath) => {
    const keys = dotPath.split(".");
    let value = obj;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    if (value !== undefined && value !== null) {
      if (dotPath === "attachments" && Array.isArray(value)) {
        acc[dotPath] = value.map((attachment) => sanitizeAttachmentForFallback(attachment));
      } else if (typeof value === "object" && value.type === "doc") {
        acc[dotPath] = adfToText(value);
      } else {
        acc[dotPath] = value;
      }
    }
    return acc;
  }, {});
}

// ── Auto-Embed Fallback ─────────────────────────────────────────────────────

async function ensureEmbedded(ticketId, project, aggregatedPath) {
  const items = await db.listItemsByFilter(
    (item) => {
      const metadata = item.metadata || {};
      const linkedFrom = Array.isArray(metadata.linkedFrom) ? metadata.linkedFrom : [];
      return metadata.ticket === ticketId || linkedFrom.includes(ticketId);
    },
  );

  const resolvedPath = path.resolve(aggregatedPath);
  if (!fs.existsSync(resolvedPath)) {
    if (items.length === 0) {
      log(`[RAG] Cannot auto-embed: ${resolvedPath} not found`);
    }
    return false;
  }

  const aggregated = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
  if (aggregated.root?.key !== ticketId) {
    if (items.length === 0) {
      log(`[RAG] Cannot auto-embed ${ticketId}: bundle root is ${aggregated.root?.key || "unknown"}`);
    }
    return false;
  }

  const meta = loadMeta();
  const stale = isStale(ticketId, aggregated.metadata?.fetchedAt, meta);

  if (items.length > 0 && !stale) return false;

  log(
    items.length === 0
      ? `[RAG] No chunks found for ${ticketId} — auto-embedding from ${aggregatedPath}`
      : `[RAG] ${ticketId} is stale — refreshing embeddings from ${aggregatedPath}`,
  );

  const { embedTicket } = getEmbed();
  await embedTicket(aggregated, project);
  return true;
}

// ── Main Query Functions ─────────────────────────────────────────────────────

async function queryForDocType(docType, ticketId, scope) {
  const profile = QUERY_PROFILES[docType];
  if (!profile) throw new Error(`Unknown docType: ${docType}`);

  const filters = {
    ticket: ticketId,
    ...buildScopeFilter(scope),
  };

  return hybridSearch(profile.query, filters, {
    preferredTypes: profile.chunkTypes,
    ticketTopK: 15,
  });
}

async function queryWithFallback(docType, ticketId, scope, aggregatedPath) {
  const resolvedPath = aggregatedPath || "staging/aggregated.json";

  await ensureEmbedded(ticketId, scope.project, resolvedPath);

  const { results, fallback } = await queryForDocType(docType, ticketId, scope);

  if (fallback && results.length === 0) {
    log(`[RAG] Falling back to direct JSON read for ${docType} — ${ticketId}`);
    const fullPath = path.resolve(resolvedPath);
    if (!fs.existsSync(fullPath)) {
      return { results, fallback: true, fallbackData: null };
    }
    const aggregated = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    const fallbackData = extractFields(
      aggregated,
      FALLBACK_FIELDS[docType] || [],
    );
    return { results, fallback: true, fallbackData };
  }

  return { results, fallback: results.length === 0 };
}

async function queryDebug(query, scope, docType) {
  const profile = docType ? QUERY_PROFILES[docType] : null;
  const searchQuery = profile ? profile.query + " " + query : query;

  const filters = {
    ...(profile ? { type: profile.chunkTypes } : {}),
    ...buildScopeFilter(scope),
  };

  const { embed } = getEmbed();
  const queryVector = await embed(searchQuery);
  const rawResults = await db.queryItems(queryVector, 20);

  return rawResults.map((r) => ({
    score: r.score,
    item: r.item,
  }))
    .filter((r) => passesFilter(r.item?.metadata || {}, filters))
    .map((r) => ({
      score: r.score,
      id: r.item?.metadata?.id || r.item?.id,
      type: r.item?.metadata?.type,
      ticket: r.item?.metadata?.ticket,
      source: r.item?.metadata?.source,
      textPreview: r.item?.metadata?.textPreview,
    }));
}

module.exports = {
  QUERY_PROFILES,
  hybridSearch,
  queryForDocType,
  queryWithFallback,
  queryDebug,
  ensureEmbedded,
};
