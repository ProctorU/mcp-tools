const fs = require("fs");
const path = require("path");
const {
    getStagingPath,
    getTicketDocsDir,
    getTicketDocPath,
    sanitizeTeamFolder,
    sanitizeTicketFolder,
} = require("./paths");

const ARCHIVABLE_FILES = [
    "srs.md",
    "ui_document.md",
    "test_cases.json",
    "test_cases.feature",
    "test_cases.csv",
    "subtasks.json",
    "issues.json",
];

function resolveTeamAndTicket() {
    const aggregatedPath = getStagingPath("aggregated.json");
    if (!fs.existsSync(aggregatedPath)) {
        throw new Error("staging/aggregated.json not found. Run fetch-jira first.");
    }

    const aggregated = JSON.parse(fs.readFileSync(aggregatedPath, "utf8"));
    const root = aggregated.root || {};

    const ticket = sanitizeTicketFolder(root.key);
    const rawTeam = root.team || (root.components && root.components[0]) || "unassigned";
    const team = sanitizeTeamFolder(rawTeam);

    return { team, ticket };
}

function archiveToTeamDocs() {
    const { team, ticket } = resolveTeamAndTicket();

    const destDir = getTicketDocsDir(team, ticket);
    fs.mkdirSync(destDir, { recursive: true });

    const copied = [];
    const skipped = [];

    for (const filename of ARCHIVABLE_FILES) {
        const src = getStagingPath(filename);
        if (fs.existsSync(src)) {
            const dest = getTicketDocPath(team, ticket, filename);
            fs.copyFileSync(src, dest);
            copied.push(filename);
        } else {
            skipped.push(filename);
        }
    }

    return {
        team,
        ticket,
        destDir,
        copied,
        skipped,
    };
}

module.exports = { archiveToTeamDocs, resolveTeamAndTicket, ARCHIVABLE_FILES };
