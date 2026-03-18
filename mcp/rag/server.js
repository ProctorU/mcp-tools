// ─────────────────────────────────────────────────────────────────────────────
// RAG MCP Server
// Local vector-based retrieval-augmented generation pipeline.
// Tools: embedTicket, queryChunks, inspectChunks, queryDebug,
//        embedSprint, embedEpic, listTeams
// ─────────────────────────────────────────────────────────────────────────────

const path = require("path");
const fs = require("fs");

// ── .env discovery (same pattern as jira/server.js and testrail/server.js) ──

let envPath = null;
let currentDir = __dirname;
const maxDepth = 5;
let depth = 0;
while (depth < maxDepth && !envPath) {
    const testPath = path.join(currentDir, ".env");
    if (fs.existsSync(testPath)) {
        envPath = testPath;
        break;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
    depth++;
}
if (envPath) {
    require("dotenv").config({ path: envPath });
} else {
    require("dotenv").config();
}

const { Jira_DOMAIN, Jira_EMAIL, Jira_API_TOKEN } = process.env;

// ── Imports ──────────────────────────────────────────────────────────────────

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

const { embedTicket, embedBatch, clearTicketChunks } = require("./embed");
const { queryWithFallback, queryDebug: runQueryDebug } = require("./query");
const db = require("./db");

function log(msg) {
    console.error(msg);
}

// ── Jira REST helpers for batch embedding ────────────────────────────────────

function getAuthHeader() {
    if (!Jira_DOMAIN || !Jira_EMAIL || !Jira_API_TOKEN) return null;
    return "Basic " + Buffer.from(`${Jira_EMAIL}:${Jira_API_TOKEN}`).toString("base64");
}

function getCleanDomain() {
    if (!Jira_DOMAIN) return null;
    return Jira_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

async function jiraFetch(urlPath) {
    const domain = getCleanDomain();
    if (!domain) throw new Error("Jira credentials not configured");
    const fetch = (await import("node-fetch")).default;
    const res = await fetch(`https://${domain}${urlPath}`, {
        headers: {
            Authorization: getAuthHeader(),
            "Content-Type": "application/json",
        },
    });
    if (!res.ok) throw new Error(`Jira API ${res.status}: ${await res.text()}`);
    return res.json();
}

// ── Staging path helper ─────────────────────────────────────────────────────

function getStagingPath(filename) {
    return path.resolve(__dirname, "../../staging", filename || "aggregated.json");
}

// ── MCP Server Setup ─────────────────────────────────────────────────────────

const server = new Server(
    { name: "rag-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

// ── Tool Definitions ─────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "embedTicket",
                description: "Chunk and embed a single ticket from staging/aggregated.json into the local vector DB. Incremental — skips unchanged chunks. Use force=true to clear and re-embed all chunks.",
                inputSchema: {
                    type: "object",
                    properties: {
                        ticket:  { type: "string", description: "Jira ticket key e.g. DEV-123" },
                        project: { type: "string", description: "Jira project key e.g. DEV" },
                        force:   { type: "boolean", description: "If true, clears all existing chunks for this ticket and re-embeds from scratch. Use after schema changes." },
                    },
                    required: ["ticket", "project"],
                },
            },
            {
                name: "queryChunks",
                description: "Query the vector DB for relevant chunks scoped by document type, ticket, project, and optional team. Auto-embeds if no chunks exist.",
                inputSchema: {
                    type: "object",
                    properties: {
                        docType: { type: "string", description: "Document type: srs, ui, tests, subtasks, issues, traceability" },
                        ticket:  { type: "string", description: "Jira ticket key" },
                        project: { type: "string", description: "Project key" },
                        team:    { type: "string", description: "Team name (optional — omit for full project scope)" },
                    },
                    required: ["docType", "ticket", "project"],
                },
            },
            {
                name: "inspectChunks",
                description: "List all stored chunks for a ticket with their types, hashes, and timestamps. Use to verify embedding worked correctly.",
                inputSchema: {
                    type: "object",
                    properties: {
                        ticket:  { type: "string", description: "Jira ticket key" },
                        project: { type: "string", description: "Project key" },
                    },
                    required: ["ticket"],
                },
            },
            {
                name: "queryDebug",
                description: "Run a raw vector search and return results with similarity scores, chunk types, and text previews. Use to debug low-confidence retrievals.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query:   { type: "string", description: "Free-text search query" },
                        project: { type: "string", description: "Project key (optional)" },
                        team:    { type: "string", description: "Team name (optional)" },
                        docType: { type: "string", description: "Document type filter (optional)" },
                    },
                    required: ["query"],
                },
            },
            {
                name: "embedSprint",
                description: "Fetch all tickets in a Jira sprint and batch-embed them into the vector DB.",
                inputSchema: {
                    type: "object",
                    properties: {
                        boardId:  { type: "string", description: "Jira board ID" },
                        sprintId: { type: "string", description: "Jira sprint ID" },
                        project:  { type: "string", description: "Project key" },
                    },
                    required: ["boardId", "sprintId", "project"],
                },
            },
            {
                name: "embedEpic",
                description: "Fetch all tickets under a Jira epic and batch-embed them into the vector DB.",
                inputSchema: {
                    type: "object",
                    properties: {
                        epicKey: { type: "string", description: "Epic ticket key e.g. DEV-50" },
                        project: { type: "string", description: "Project key" },
                    },
                    required: ["epicKey", "project"],
                },
            },
            {
                name: "listTeams",
                description: "Discover boards and teams for a Jira project via the Agile API. Returns board names, team mappings, and active sprints.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectKey: { type: "string", description: "Jira project key e.g. DEV" },
                    },
                    required: ["projectKey"],
                },
            },
            {
                name: "clearChunks",
                description: "Delete all vector DB chunks for a ticket. Use to remove a ticket's data without re-embedding. Shared Confluence chunks are unlinked from the ticket instead of removed.",
                inputSchema: {
                    type: "object",
                    properties: {
                        ticket: { type: "string", description: "Jira ticket key e.g. DEV-123" },
                    },
                    required: ["ticket"],
                },
            },
        ],
    };
});

// ── Tool Handlers ────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // ── embedTicket ──────────────────────────────────────────────────────
    if (name === "embedTicket") {
        try {
            const aggregatedPath = getStagingPath("aggregated.json");
            if (!fs.existsSync(aggregatedPath)) {
                return {
                    content: [{ type: "text", text: `Error: ${aggregatedPath} not found. Run fetch-jira first.` }],
                    isError: true,
                };
            }
            const aggregated = JSON.parse(fs.readFileSync(aggregatedPath, "utf-8"));
            const bundleTicket = aggregated.root?.key;

            if (bundleTicket !== args.ticket) {
                return {
                    content: [{
                        type: "text",
                        text: `embedTicket error: staging/aggregated.json contains ${bundleTicket || "no root ticket"}, not ${args.ticket}. Run fetch-jira for ${args.ticket} first.`,
                    }],
                    isError: true,
                };
            }

            if (args.force) {
                const cleared = await clearTicketChunks(args.ticket);
                log(`[RAG] Force re-embed: cleared ${cleared.removed} chunks and unlinked ${cleared.unlinked} shared chunks for ${args.ticket}`);
            }

            const result = await embedTicket(aggregated, args.project);
            return {
                content: [{
                    type: "text",
                    text: `Embedded ${args.ticket} (project: ${args.project})${args.force ? " [FORCE]" : ""}\n` +
                          `New: ${result.embedded} | Updated: ${result.updated} | Skipped: ${result.skipped}`,
                }],
            };
        } catch (err) {
            return { content: [{ type: "text", text: `embedTicket error: ${err.message}` }], isError: true };
        }
    }

    // ── clearChunks ─────────────────────────────────────────────────────
    if (name === "clearChunks") {
        try {
            const result = await clearTicketChunks(args.ticket);
            return {
                content: [{
                    type: "text",
                    text: `Cleared chunks for ${args.ticket}: removed=${result.removed} unlinked(shared)=${result.unlinked}`,
                }],
            };
        } catch (err) {
            return { content: [{ type: "text", text: `clearChunks error: ${err.message}` }], isError: true };
        }
    }

    // ── queryChunks ──────────────────────────────────────────────────────
    if (name === "queryChunks") {
        try {
            const scope = { project: args.project, team: args.team };
            const result = await queryWithFallback(args.docType, args.ticket, scope, getStagingPath("aggregated.json"));

            const chunks = result.results.map((r) => ({
                score: r.score?.toFixed(3),
                type: r.metadata?.type,
                ticket: r.metadata?.ticket,
                source: r.metadata?.source,
                id: r.metadata?.id,
                text: r.metadata?.textContent || r.metadata?.textPreview || "(no content)",
            }));

            let text = `Query: ${args.docType} for ${args.ticket} (${args.project}${args.team ? "/" + args.team : ""})\n`;
            text += `Results: ${chunks.length} chunks${result.fallback ? " (FALLBACK — low confidence or no chunks)" : ""}\n\n`;

            chunks.forEach((c, i) => {
                text += `--- Chunk ${i + 1} [score=${c.score} type=${c.type} source=${c.source} ticket=${c.ticket}] ---\n`;
                text += `${c.text}\n\n`;
            });

            if (result.fallback && result.fallbackData) {
                text += `\n--- Fallback Data (raw aggregated.json) ---\n${JSON.stringify(result.fallbackData, null, 2)}`;
            }

            return { content: [{ type: "text", text }] };
        } catch (err) {
            return { content: [{ type: "text", text: `queryChunks error: ${err.message}` }], isError: true };
        }
    }

    // ── inspectChunks ────────────────────────────────────────────────────
    if (name === "inspectChunks") {
        try {
            const items = await db.listItemsByFilter(
                (item) => {
                    const metadata = item.metadata || {};
                    const linkedFrom = Array.isArray(metadata.linkedFrom) ? metadata.linkedFrom : [];
                    return metadata.ticket === args.ticket || linkedFrom.includes(args.ticket);
                }
            );

            const typeCounts = {};
            items.forEach((item) => {
                const t = item.metadata?.type || "unknown";
                typeCounts[t] = (typeCounts[t] || 0) + 1;
            });

            let text = `Chunks for ${args.ticket}: ${items.length} total\n`;
            text += `Types: ${Object.entries(typeCounts).map(([t, c]) => `${t}(${c})`).join(", ")}\n\n`;

            items.forEach((item, i) => {
                const m = item.metadata || {};
                text += `[${i + 1}] id=${m.id || item.id} type=${m.type} source=${m.source} hash=${m.hash}\n`;
                text += `    team=${m.team} project=${m.project} timestamp=${m.timestamp}\n`;
                text += `    db=${item.dbPath || "(unknown)"}\n`;
                const content = m.textContent || m.textPreview || "(no content)";
                text += `    ${content.substring(0, 200)}${content.length > 200 ? "..." : ""}\n\n`;
            });

            return { content: [{ type: "text", text }] };
        } catch (err) {
            return { content: [{ type: "text", text: `inspectChunks error: ${err.message}` }], isError: true };
        }
    }

    // ── queryDebug ───────────────────────────────────────────────────────
    if (name === "queryDebug") {
        try {
            const scope = { project: args.project, team: args.team };
            const results = await runQueryDebug(args.query, scope, args.docType);

            let text = `Debug query: "${args.query}"${args.docType ? ` (profile: ${args.docType})` : ""}\n`;
            text += `Results: ${results.length}\n\n`;

            results.forEach((r, i) => {
                text += `[${i + 1}] score=${r.score?.toFixed(3)} id=${r.id} type=${r.type} ticket=${r.ticket} source=${r.source}\n`;
                text += `    ${r.textPreview || ""}\n\n`;
            });

            return { content: [{ type: "text", text }] };
        } catch (err) {
            return { content: [{ type: "text", text: `queryDebug error: ${err.message}` }], isError: true };
        }
    }

    // ── embedSprint ──────────────────────────────────────────────────────
    if (name === "embedSprint") {
        try {
            const data = await jiraFetch(
                `/rest/agile/1.0/board/${args.boardId}/sprint/${args.sprintId}/issue?maxResults=100`
            );
            const issues = data.issues || [];
            log(`[RAG] Sprint has ${issues.length} issues`);

            const tickets = issues.map((issue) => ({
                root: {
                    id: issue.id,
                    key: issue.key,
                    summary: issue.fields?.summary,
                    description: issue.fields?.description,
                    status: issue.fields?.status?.name,
                    issueType: issue.fields?.issuetype?.name,
                    labels: issue.fields?.labels,
                    team: issue.fields?.customfield_10001?.name
                        || issue.fields?.customfield_10001?.value
                        || null,
                    components: (issue.fields?.components || []).map((c) => c.name),
                },
                linked: [],
                attachments: [],
                comments: [],
                confluence: [],
                metadata: { fetchedAt: new Date().toISOString() },
            }));

            const result = await embedBatch(tickets, args.project);
            return {
                content: [{
                    type: "text",
                    text: `Sprint embed complete: ${result.ticketCount} tickets\n` +
                          `New: ${result.embedded} | Updated: ${result.updated} | Skipped: ${result.skipped}`,
                }],
            };
        } catch (err) {
            return { content: [{ type: "text", text: `embedSprint error: ${err.message}` }], isError: true };
        }
    }

    // ── embedEpic ────────────────────────────────────────────────────────
    if (name === "embedEpic") {
        try {
            const jql = encodeURIComponent(`"Epic Link" = ${args.epicKey}`);
            const data = await jiraFetch(
                `/rest/api/3/search?jql=${jql}&maxResults=100`
            );
            const issues = data.issues || [];
            log(`[RAG] Epic ${args.epicKey} has ${issues.length} child issues`);

            const tickets = issues.map((issue) => ({
                root: {
                    id: issue.id,
                    key: issue.key,
                    summary: issue.fields?.summary,
                    description: issue.fields?.description,
                    status: issue.fields?.status?.name,
                    issueType: issue.fields?.issuetype?.name,
                    labels: issue.fields?.labels,
                    team: issue.fields?.customfield_10001?.name
                        || issue.fields?.customfield_10001?.value
                        || null,
                    components: (issue.fields?.components || []).map((c) => c.name),
                },
                linked: [],
                attachments: [],
                comments: [],
                confluence: [],
                metadata: { fetchedAt: new Date().toISOString() },
            }));

            const result = await embedBatch(tickets, args.project);
            return {
                content: [{
                    type: "text",
                    text: `Epic embed complete: ${args.epicKey} → ${result.ticketCount} tickets\n` +
                          `New: ${result.embedded} | Updated: ${result.updated} | Skipped: ${result.skipped}`,
                }],
            };
        } catch (err) {
            return { content: [{ type: "text", text: `embedEpic error: ${err.message}` }], isError: true };
        }
    }

    // ── listTeams ────────────────────────────────────────────────────────
    if (name === "listTeams") {
        try {
            const boardsData = await jiraFetch(
                `/rest/agile/1.0/board?projectKeyOrId=${args.projectKey}&maxResults=50`
            );
            const boards = boardsData.values || [];

            const results = [];
            for (const board of boards) {
                const config = await jiraFetch(`/rest/agile/1.0/board/${board.id}/configuration`).catch(() => null);

                let activeSprints = [];
                try {
                    const sprintData = await jiraFetch(`/rest/agile/1.0/board/${board.id}/sprint?state=active`);
                    activeSprints = (sprintData.values || []).map((s) => ({
                        id: s.id,
                        name: s.name,
                        startDate: s.startDate,
                        endDate: s.endDate,
                    }));
                } catch {
                    // Board may not support sprints (Kanban)
                }

                results.push({
                    boardId: board.id,
                    boardName: board.name,
                    boardType: board.type,
                    filterName: config?.filter?.name || null,
                    activeSprints,
                });
            }

            return {
                content: [{
                    type: "text",
                    text: `Boards for ${args.projectKey}: ${results.length}\n\n` +
                          results
                              .map((b) =>
                                  `Board: ${b.boardName} (id=${b.boardId}, type=${b.boardType})\n` +
                                  `  Filter: ${b.filterName || "N/A"}\n` +
                                  `  Active sprints: ${b.activeSprints.length > 0
                                      ? b.activeSprints.map((s) => `${s.name} (id=${s.id})`).join(", ")
                                      : "none"
                                  }`
                              )
                              .join("\n\n"),
                }],
            };
        } catch (err) {
            return { content: [{ type: "text", text: `listTeams error: ${err.message}` }], isError: true };
        }
    }

    return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
    };
});

// ── Start Server ─────────────────────────────────────────────────────────────

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    log("[RAG] MCP server running on stdio");
}

main().catch((err) => {
    console.error("[RAG] Fatal:", err);
    process.exit(1);
});
