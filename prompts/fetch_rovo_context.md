# Rovo Context Enrichment

## Goal

Enrich the existing `staging/aggregated.json` bundle with **new** related Jira tickets and Confluence pages discovered by Atlassian Rovo.

Rovo is the **discovery layer** only. After Rovo finds candidate tickets/pages, you must call the local Jira MCP hydration tools so the bundle stores **full fetched details**, not shallow search hits.

## Required Inputs

Use the command parameters:

- `functionality`: feature keyword or phrase to search
- `project`: Jira project key

## Required Process

1. Read `staging/aggregated.json` only to identify:
   - `root.key`
   - linked ticket keys in `linked[]`
   - page IDs in `confluence[]`
   - any existing `rovoContext[]` ticket/page IDs
2. Use `atlassian-rovo.search` with the provided `functionality` and `project`.
3. If the Rovo server exposes `searchJiraIssuesUsingJql`, run a second scoped pass for the same project to catch additional Jira issues.
4. From the Rovo results, extract candidate Jira ticket keys and Confluence page IDs/URLs.
5. For each **new** Jira ticket candidate, call `jira.appendRovoIssueToBundle({ ticket })`.
   - This tool automatically fetches the related Jira ticket details, comments, attachments, and linked Confluence pages.
   - It also appends any newly discovered linked Confluence pages from that ticket.
6. For each **new** Confluence page candidate, call `jira.appendRovoPageToBundle({ pageId })` or `jira.appendRovoPageToBundle({ pageUrl })`.
7. Stop when all new candidates have been processed.

## Important Rules

- Do **not** replace the root Jira bundle.
- Do **not** append raw Rovo search results directly.
- Do **not** create duplicate entries for:
  - the root ticket
  - already linked Jira tickets
  - already fetched Confluence pages
  - items already present in `rovoContext`
- Prefer page IDs over URLs when both are available.
- Do not summarize the results; just enrich `staging/aggregated.json`.

## Expected Result

`staging/aggregated.json` gains or updates a `rovoContext` array containing hydrated items like:

```json
{
  "type": "ticket",
  "id": "PROJ-456",
  "issueKey": "PROJ-456",
  "source": "rovo",
  "content": "Fully fetched Jira ticket context..."
}
```

```json
{
  "type": "page",
  "id": "123456789",
  "pageId": "123456789",
  "source": "rovo",
  "content": "Fully fetched Confluence page content..."
}
```