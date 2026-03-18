// ─────────────────────────────────────────────────────────────────────────────
// Cross-Ticket Deduplication
// Confluence pages shared across tickets are stored once per section,
// referenced by all linking tickets. Uses canonical IDs that include
// both page ID and chunk ID so multi-section pages are fully preserved.
// ─────────────────────────────────────────────────────────────────────────────

const db = require("./db");

async function storeWithDedup(chunk, vector) {
    if (chunk.source !== "confluence" || !chunk.pageId) {
        const metadata = { ...chunk };
        delete metadata.text;
        metadata.textContent = chunk.text;
        metadata.textPreview = chunk.text.substring(0, 300);
        await db.insertItem(chunk.id, vector, metadata);
        return;
    }

    const canonicalId = chunk.id;
    const existing = await db.getItem(canonicalId).catch(() => null);

    if (existing) {
        const updatedLinkedFrom = [
            ...new Set([...(existing.metadata?.linkedFrom || []), chunk.ticket]),
        ];
        await db.deleteItem(canonicalId, { dbPath: existing.dbPath });
        const metadata = { ...existing.metadata, linkedFrom: updatedLinkedFrom };
        await db.insertItem(canonicalId, existing.vector, metadata, { dbPath: existing.dbPath });
        return;
    }

    const metadata = { ...chunk, id: canonicalId };
    delete metadata.text;
    metadata.textContent = chunk.text;
    metadata.textPreview = chunk.text.substring(0, 300);
    await db.insertItem(canonicalId, vector, metadata);
}

module.exports = { storeWithDedup };
