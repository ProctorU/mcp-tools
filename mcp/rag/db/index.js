// ─────────────────────────────────────────────────────────────────────────────
// Vectra LocalIndex Wrapper
// Provides a unified interface over Vectra's folder-based vector index
// ─────────────────────────────────────────────────────────────────────────────

const path = require("path");
const fs = require("fs");
const { LocalIndex } = require("vectra");
const { VECTOR_DB_ROOT } = require("../../common/paths");

const INDEX_ROOT = path.join(VECTOR_DB_ROOT, "indexes");
const LEGACY_DB_PATH = path.join(VECTOR_DB_ROOT, "index");
const STAGING_VECTOR_DB_ROOT = path.resolve(__dirname, "../../../staging/vector_db");
const STAGING_LEGACY_DB_PATH = path.join(STAGING_VECTOR_DB_ROOT, "index");
const STAGING_INDEX_ROOT = path.join(STAGING_VECTOR_DB_ROOT, "indexes");

const indexCache = new Map();

function sanitizePathPart(value, fallback = "unassigned") {
    return String(value || fallback)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || fallback;
}

function getDbPathForMetadata(metadata = {}) {
    const project = sanitizePathPart(metadata.project, "shared");
    const team = sanitizePathPart(metadata.team, "unassigned");
    return path.join(INDEX_ROOT, project, team);
}

function listKnownDbPaths() {
    const dbPaths = [];

    if (fs.existsSync(LEGACY_DB_PATH)) {
        dbPaths.push(LEGACY_DB_PATH);
    }

    if (fs.existsSync(STAGING_LEGACY_DB_PATH)) {
        dbPaths.push(STAGING_LEGACY_DB_PATH);
    }

    if (!fs.existsSync(INDEX_ROOT)) {
        if (!fs.existsSync(STAGING_INDEX_ROOT)) {
            return dbPaths;
        }
    }

    if (fs.existsSync(INDEX_ROOT)) {
        const projects = fs.readdirSync(INDEX_ROOT, { withFileTypes: true });
        for (const projectEntry of projects) {
            if (!projectEntry.isDirectory()) continue;

            const projectPath = path.join(INDEX_ROOT, projectEntry.name);
            const teams = fs.readdirSync(projectPath, { withFileTypes: true });

            for (const teamEntry of teams) {
                if (!teamEntry.isDirectory()) continue;
                dbPaths.push(path.join(projectPath, teamEntry.name));
            }
        }
    }

    if (fs.existsSync(STAGING_INDEX_ROOT)) {
        const projects = fs.readdirSync(STAGING_INDEX_ROOT, { withFileTypes: true });
        for (const projectEntry of projects) {
            if (!projectEntry.isDirectory()) continue;

            const projectPath = path.join(STAGING_INDEX_ROOT, projectEntry.name);
            const teams = fs.readdirSync(projectPath, { withFileTypes: true });

            for (const teamEntry of teams) {
                if (!teamEntry.isDirectory()) continue;
                dbPaths.push(path.join(projectPath, teamEntry.name));
            }
        }
    }

    return [...new Set(dbPaths)];
}

async function getIndex(dbPath) {
    const resolvedPath = dbPath || LEGACY_DB_PATH;

    if (indexCache.has(resolvedPath)) {
        return indexCache.get(resolvedPath);
    }

    if (!fs.existsSync(resolvedPath)) {
        fs.mkdirSync(resolvedPath, { recursive: true });
    }

    const index = new LocalIndex(resolvedPath);

    if (!await index.isIndexCreated()) {
        await index.createIndex();
    }

    indexCache.set(resolvedPath, index);
    return index;
}

async function getAllIndexes() {
    const dbPaths = listKnownDbPaths();
    const indexes = await Promise.all(dbPaths.map(async (dbPath) => ({
        dbPath,
        index: await getIndex(dbPath),
    })));

    return indexes;
}

async function insertItem(id, vector, metadata, options = {}) {
    const dbPath = options.dbPath || getDbPathForMetadata(metadata);
    const index = await getIndex(dbPath);
    await index.insertItem({
        id,
        vector,
        metadata,
    });
}

async function getItem(id, options = {}) {
    if (options.dbPath) {
        const index = await getIndex(options.dbPath);
        const item = await index.getItem(id);
        return item ? { ...item, dbPath: options.dbPath } : item;
    }

    const indexes = await getAllIndexes();
    for (const { dbPath, index } of indexes) {
        const item = await index.getItem(id).catch(() => null);
        if (item) {
            return { ...item, dbPath };
        }
    }

    return null;
}

async function deleteItem(id, options = {}) {
    if (options.dbPath) {
        const index = await getIndex(options.dbPath);
        await index.deleteItem(id);
        return;
    }

    const indexes = await getAllIndexes();
    for (const { index } of indexes) {
        await index.deleteItem(id).catch(() => null);
    }
}

async function queryItems(vector, topK = 8, options = {}) {
    const indexes = options.dbPath
        ? [{ dbPath: options.dbPath, index: await getIndex(options.dbPath) }]
        : await getAllIndexes();

    const results = await Promise.all(indexes.map(async ({ dbPath, index }) => {
        const matches = await index.queryItems(vector, topK).catch(() => []);
        return matches.map((match) => ({
            ...match,
            item: match.item ? { ...match.item, dbPath } : match.item,
        }));
    }));

    return results
        .flat()
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}

async function listItemsByFilter(filterFn, options = {}) {
    const indexes = options.dbPath
        ? [{ dbPath: options.dbPath, index: await getIndex(options.dbPath) }]
        : await getAllIndexes();

    const allItems = await Promise.all(indexes.map(async ({ dbPath, index }) => {
        const items = await index.listItems();
        return items.map((item) => ({ ...item, dbPath }));
    }));

    return allItems.flat().filter(filterFn);
}

module.exports = {
    getIndex,
    getAllIndexes,
    insertItem,
    getItem,
    deleteItem,
    queryItems,
    listItemsByFilter,
    getDbPathForMetadata,
    VECTOR_DB_ROOT,
    INDEX_ROOT,
    LEGACY_DB_PATH,
};
