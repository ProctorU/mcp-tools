// ─────────────────────────────────────────────────────────────────────────────
// Content Hashing
// MD5-based hashing for incremental embedding — skip unchanged chunks
// ─────────────────────────────────────────────────────────────────────────────

const md5 = require("md5");

function getChunkHash(text) {
    return md5(text);
}

module.exports = { getChunkHash };
