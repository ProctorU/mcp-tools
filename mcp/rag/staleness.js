// ─────────────────────────────────────────────────────────────────────────────
// Staleness Detection
// Tracks when each ticket was last embedded. If the ticket's fetchedAt is newer
// than our record, the content is stale and needs re-embedding.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const { VECTOR_DB_ROOT } = require("../common/paths");

const META_PATH = path.join(VECTOR_DB_ROOT, "meta.json");
const LEGACY_META_PATH = path.resolve(__dirname, "../../staging/vector_db/meta.json");

function loadMeta() {
    try {
        if (fs.existsSync(META_PATH)) {
            return JSON.parse(fs.readFileSync(META_PATH, "utf-8"));
        }
        if (fs.existsSync(LEGACY_META_PATH)) {
            return JSON.parse(fs.readFileSync(LEGACY_META_PATH, "utf-8"));
        }
    } catch {
        // Corrupted file — start fresh
    }
    return {};
}

function saveMeta(meta) {
    const dir = path.dirname(META_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
}

function isStale(ticketId, fetchedAt, meta) {
    const entry = meta[ticketId];
    if (!entry) return true;
    if (!fetchedAt) return true;
    return new Date(fetchedAt) > new Date(entry.lastEmbedded);
}

function markEmbedded(ticketId, meta) {
    meta[ticketId] = { lastEmbedded: new Date().toISOString() };
    saveMeta(meta);
}

module.exports = { loadMeta, saveMeta, isStale, markEmbedded };
