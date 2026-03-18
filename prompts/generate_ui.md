# Generate UI Specification Document

## Task
Generate a comprehensive UI Specification Document from Jira ticket data and screenshots following the UI Specification Document Rules and Standards.

## Required Reading (MANDATORY)
**Before generating, you MUST read the rules file:**
- `config/rules/ui_rules.md` - Contains ALL mandatory rules, document structure, formatting standards, and quality checklist

## Input Data Sources

### 1. PRIMARY: Vector DB (RAG) — REQUIRED

**You MUST get context by querying the vector DB**, not by reading the full `staging/aggregated.json`.

- Call the **RAG MCP tool `queryChunks`** with:
  - `docType`: `"ui"`
  - `ticket`: Jira ticket key (e.g. `DEV-123`) — from `staging/aggregated.json` → `root.key` or from the user/command
  - `project`: Project key (e.g. `DEV`) — prefix of the ticket key
- Use the **retrieved chunks** (reranked ticket-scoped results, typically up to 15) as the **main source** for UI spec. They contain relevant content from UI notes, Confluence design docs, ticket description, and attachment metadata or extracted attachment text when available.
- If the tool returns fallback content (e.g. from aggregated.json when confidence is low), use that as well.

### 2. Optional

- **Context document:** Read `context/srs_template.md` or a specified context file for project consistency.
- **SRS document:** Read `staging/srs.md` (if available) for requirements context.
- **Screenshots:** RAG may return screenshot or attachment chunks with filenames, mime types, and any extracted text. If you need exact image-only details that are not captured in text, you may read `staging/aggregated.json` → `attachments` for filenames/base64 only when necessary.

## Output
Save the generated UI Specification document to both:
- `staging/ui_document.md` for the active working copy
- `docs/teams/<team>/<ticket>/ui_document.md` for the persistent ticket archive

## Generation Process

1. **Read `config/rules/ui_rules.md` FIRST** — understand all mandatory rules.
2. **Get ticket, project, and team:** From `staging/aggregated.json` read `root.key` plus the minimum team fields needed for the archive path:
   - `root.key` → derive `project` (prefix)
   - `root.team` if present, otherwise `root.components[0]`, otherwise use `unassigned`; normalize the team folder to lowercase kebab-case for `docs/teams/<team>/...`
3. **Query the vector DB:** Call RAG tool `queryChunks` with `docType: "ui"`, `ticket`, and `project`. Use the returned chunks as the primary input.
4. Optionally read context file and `staging/srs.md`.
5. Create the UI Specification from the **chunk content** (including attachment chunks when present) and any fallback, following ALL rules from `config/rules/ui_rules.md`. Document every UI element; use exact text/labels; reference screenshot filenames when available.
6. Verify against the Quality Checklist in the rules file.
7. Save the same final content to both `staging/ui_document.md` and `docs/teams/<team>/<ticket>/ui_document.md`.

## Key Rules Summary (see rules file for complete details)
- **Screenshots are PRIMARY source** - document every visible element
- Document all fields with: label, type, location, editable status, default value, validation
- Document all dropdowns with: ALL options listed, default value, deprecated options marked
- Document all buttons with: text, location, states (default, hover, disabled, selected), actions
- Document all tables with: columns, data types, actions
- Mark deprecated elements with ⚠️ **DEPRECATED**
- Mark planned features with **PLANNED**

**IMPORTANT:** Follow ALL rules in `config/rules/ui_rules.md` - the rules file is the authoritative source for document structure, UI element documentation, and quality requirements.
