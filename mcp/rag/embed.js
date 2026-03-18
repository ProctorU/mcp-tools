// ─────────────────────────────────────────────────────────────────────────────
// Embedding Pipeline
// Chunks aggregated.json, embeds with MiniLM-L6-v2 via @huggingface/transformers,
// stores in Vectra. Supports incremental embedding (skip unchanged chunks).
// ─────────────────────────────────────────────────────────────────────────────

const { pipeline } = require("@huggingface/transformers");
const { getChunkHash } = require("./hash");
const { chunkAggregatedJSON } = require("./chunk");
const { storeWithDedup } = require("./dedup");
const { loadMeta, isStale, markEmbedded } = require("./staleness");
const db = require("./db");

let embedder = null;

function log(msg) {
    console.error(msg);
}

async function getEmbedder() {
    if (!embedder) {
        log("[RAG] Loading embedding model Xenova/all-MiniLM-L6-v2...");
        embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
        log("[RAG] Embedding model loaded.");
    }
    return embedder;
}

async function embed(text) {
    const fn = await getEmbedder();
    const output = await fn(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
}

function mergeLinkedFrom(existingLinkedFrom = [], ticket) {
    return [...new Set([...(existingLinkedFrom || []), ticket].filter(Boolean))];
}

async function clearTicketChunks(ticketKey, options = {}) {
    const keepIds = options.keepIds ? new Set(options.keepIds) : null;
    let removed = 0;
    let unlinked = 0;

    const items = await db.listItemsByFilter((item) => {
        const metadata = item.metadata || {};
        const linkedFrom = Array.isArray(metadata.linkedFrom) ? metadata.linkedFrom : [];
        return metadata.ticket === ticketKey || linkedFrom.includes(ticketKey);
    });

    for (const item of items) {
        if (keepIds?.has(item.id)) continue;

        const metadata = item.metadata || {};
        const linkedFrom = Array.isArray(metadata.linkedFrom) ? metadata.linkedFrom : [];
        const isSharedConfluence = metadata.source === "confluence" && linkedFrom.includes(ticketKey);

        if (isSharedConfluence) {
            const remainingLinkedFrom = linkedFrom.filter((linkedTicket) => linkedTicket !== ticketKey);
            if (remainingLinkedFrom.length > 0) {
                await db.deleteItem(item.id, { dbPath: item.dbPath });
                await db.insertItem(item.id, item.vector, {
                    ...metadata,
                    ticket: remainingLinkedFrom[0],
                    linkedFrom: remainingLinkedFrom,
                }, { dbPath: item.dbPath });
                unlinked++;
                continue;
            }
        }

        await db.deleteItem(item.id, { dbPath: item.dbPath });
        removed++;
    }

    return { removed, unlinked };
}

async function embedIncrementally(chunks) {
    let embedded = 0, skipped = 0, updated = 0;
    const currentChunkIds = new Set(chunks.map((chunk) => chunk.id));

    if (chunks.length > 0) {
        const cleanup = await clearTicketChunks(chunks[0].ticket, { keepIds: currentChunkIds });
        if (cleanup.removed || cleanup.unlinked) {
            log(`[RAG] Cleaned obsolete chunks: removed=${cleanup.removed} unlinked=${cleanup.unlinked}`);
        }
    }

    for (const chunk of chunks) {
        const currentHash = getChunkHash(chunk.text);
        const existing = await db.getItem(chunk.id).catch(() => null);
        const isSharedConfluence = chunk.source === "confluence" && chunk.pageId;

        if (existing && existing.metadata?.hash === currentHash) {
            if (isSharedConfluence) {
                const mergedLinkedFrom = mergeLinkedFrom(existing.metadata?.linkedFrom, chunk.ticket);
                const linkedFromChanged = mergedLinkedFrom.length !== (existing.metadata?.linkedFrom || []).length;

                if (linkedFromChanged) {
                    await db.deleteItem(chunk.id, { dbPath: existing.dbPath });
                    await db.insertItem(chunk.id, existing.vector, {
                        ...existing.metadata,
                        linkedFrom: mergedLinkedFrom,
                    }, { dbPath: existing.dbPath });
                }
            }

            skipped++;
            continue;
        }

        if (existing) {
            await db.deleteItem(chunk.id, { dbPath: existing.dbPath });
            updated++;
        } else {
            embedded++;
        }

        const vector = await embed(chunk.text);

        await storeWithDedup(
            {
                ...chunk,
                hash: currentHash,
                linkedFrom: isSharedConfluence
                    ? mergeLinkedFrom(existing?.metadata?.linkedFrom, chunk.ticket)
                    : chunk.linkedFrom,
            },
            vector
        );
    }

    log(`[RAG] Embedded: ${embedded} | Updated: ${updated} | Skipped: ${skipped}`);
    return { embedded, updated, skipped };
}

async function embedTicket(aggregated, project) {
    const meta = loadMeta();
    const ticketKey = aggregated.root.key;

    if (isStale(ticketKey, aggregated.metadata?.fetchedAt, meta)) {
        log(`[RAG] ${ticketKey} updated since last embed — re-embedding changed chunks`);
    }

    const chunks = chunkAggregatedJSON(aggregated, project);
    log(`[RAG] Chunked ${ticketKey} into ${chunks.length} chunks`);

    const result = await embedIncrementally(chunks);
    markEmbedded(ticketKey, meta);

    return result;
}

async function embedBatch(tickets, project) {
    let totalEmbedded = 0, totalUpdated = 0, totalSkipped = 0;

    for (const aggregated of tickets) {
        const result = await embedTicket(aggregated, project);
        totalEmbedded += result.embedded;
        totalUpdated += result.updated;
        totalSkipped += result.skipped;
    }

    return {
        ticketCount: tickets.length,
        embedded: totalEmbedded,
        updated: totalUpdated,
        skipped: totalSkipped,
    };
}

module.exports = {
    embed,
    embedIncrementally,
    embedTicket,
    embedBatch,
    clearTicketChunks,
    getEmbedder,
};
