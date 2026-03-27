#!/usr/bin/env node
"use strict";

const { archiveToTeamDocs } = require("../mcp/common/archive");

try {
    const result = archiveToTeamDocs();
    console.log(`Archived to: docs/teams/${result.team}/${result.ticket}/`);
    if (result.copied.length > 0) {
        console.log(`Copied (${result.copied.length}): ${result.copied.join(", ")}`);
    } else {
        console.log("No staging files found to copy.");
    }
    if (result.skipped.length > 0) {
        console.log(`Skipped (not in staging): ${result.skipped.join(", ")}`);
    }
} catch (err) {
    console.error("Archive failed:", err.message);
    process.exit(1);
}
