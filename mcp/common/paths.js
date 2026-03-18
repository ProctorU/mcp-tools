const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "../..");
const STAGING_ROOT = path.join(REPO_ROOT, "staging");
const DOCS_ROOT = path.join(REPO_ROOT, "docs");
const DOCS_TEAMS_ROOT = path.join(DOCS_ROOT, "teams");
const VECTOR_DB_ROOT = path.join(REPO_ROOT, "vector_db");

function sanitizeTeamFolder(team, fallback = "unassigned") {
    return String(team || fallback)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || fallback;
}

function sanitizeTicketFolder(ticket, fallback = "UNKNOWN-TICKET") {
    return String(ticket || fallback)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || fallback;
}

function getStagingPath(filename = "aggregated.json") {
    return path.join(STAGING_ROOT, filename);
}

function getTicketDocsDir(team, ticket) {
    return path.join(
        DOCS_TEAMS_ROOT,
        sanitizeTeamFolder(team),
        sanitizeTicketFolder(ticket)
    );
}

function getTicketDocPath(team, ticket, filename) {
    return path.join(getTicketDocsDir(team, ticket), filename);
}

function resolveTicketDocPath(ticket, filename) {
    if (!fs.existsSync(DOCS_TEAMS_ROOT)) {
        return null;
    }

    const ticketFolder = sanitizeTicketFolder(ticket);
    const teamEntries = fs.readdirSync(DOCS_TEAMS_ROOT, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name));

    for (const teamEntry of teamEntries) {
        const candidate = path.join(DOCS_TEAMS_ROOT, teamEntry.name, ticketFolder, filename);
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

module.exports = {
    REPO_ROOT,
    STAGING_ROOT,
    DOCS_ROOT,
    DOCS_TEAMS_ROOT,
    VECTOR_DB_ROOT,
    sanitizeTeamFolder,
    sanitizeTicketFolder,
    getStagingPath,
    getTicketDocsDir,
    getTicketDocPath,
    resolveTicketDocPath,
};
