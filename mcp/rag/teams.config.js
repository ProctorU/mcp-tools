// ─────────────────────────────────────────────────────────────────────────────
// Team Registry
// Known teams per project for validation. Team assignment comes from Jira's
// native Team custom field, NOT from manual ticket mapping.
// Fallback chain: Team field → Components[0] → "unassigned"
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
    DEV: {
        teams: ["video-processing", "frontend", "backend", "mobile"],
        defaultTeam: "unassigned",
    },
};
