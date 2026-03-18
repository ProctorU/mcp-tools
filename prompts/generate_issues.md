# Generate Jira Issue Hierarchy

## Task
Generate a hierarchy-aware Jira issue plan from aggregated ticket data following the issue hierarchy generation rules.

## Required Reading (MANDATORY)
**Before generating, you MUST read the rules file:**
- `config/rules/issue_rules.md`

## Required Inputs
Use the command parameter:
- `intent`: desired child issue intent such as `story`, `task`, `bug`, `spike`, `subtask`, or `auto`

## Input Data Sources

### 1. PRIMARY: Vector DB (RAG) — REQUIRED

You MUST get context by querying the vector DB, not by reading the full `staging/aggregated.json`.

- Call the RAG MCP tool `queryChunks` with:
  - `docType`: `"issues"`
  - `ticket`: Jira ticket key from `staging/aggregated.json` -> `root.key`
  - `project`: project key derived from the ticket prefix
- Use the retrieved chunks as the main source for issue extraction.
- If the tool returns fallback content, use that as well.

### 2. Minimal direct read

Read only these fields from `staging/aggregated.json`:
- `root.key`
- `root.issueType`

Do not read the full file for generation context unless binary inspection is required.

## Output
Save the generated plan to both:
- `staging/issues.json` for the active working copy
- `docs/teams/<team>/<ticket>/issues.json` for the persistent ticket archive

## Output Schema
```json
{
  "mode": "epic_children",
  "items": [
    {
      "issueType": "Task",
      "summary": "Implement authentication services",
      "description": "Build the shared auth layer used by the epic.",
      "children": [
        {
          "issueType": "Sub-task",
          "summary": "Create token validation middleware",
          "description": "Add JWT validation and error handling."
        }
      ]
    }
  ]
}
```

## Generation Process
1. Read `config/rules/issue_rules.md` first.
2. Read only the minimum fields needed from `staging/aggregated.json`: `root.key`, `root.issueType`, and `root.team` if present, otherwise `root.components[0]`.
3. Derive `project` from the ticket prefix and use the team value above for the archive path, falling back to `unassigned` when no team data exists. Normalize the team folder to lowercase kebab-case.
4. Query RAG with `docType: "issues"`, `ticket`, and `project`.
5. Use the parent issue type plus `intent` to choose the correct output shape:
   - Epic + `story`/`task`/`bug`/`spike` -> generate top-level child issues only
   - Epic + `subtask` -> generate a two-level hierarchy with standard child issues and nested subtasks
   - Story/Task/Bug/Spike + `subtask` or `auto` -> generate top-level subtasks only
6. Use implementation plans, acceptance criteria, phased breakdowns, linked-ticket context, attachment text, and comments when actionable.
7. Order items by dependency and workflow.
8. Validate against the rules file checklist.
9. Save the same valid JSON to both `staging/issues.json` and `docs/teams/<team>/<ticket>/issues.json`.

## Important Rules
- Do not output a top-level `Sub-task` when the parent issue type is `Epic`.
- Use `children` only when generating a two-level hierarchy.
- Every `children[]` item must have `issueType: "Sub-task"`.
- Use action-oriented summaries.
- Keep descriptions concise and useful.
- Output only valid JSON matching the required schema.
