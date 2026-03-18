# Generate Software Requirements Specification (SRS) Document

## Task

Generate a comprehensive Software Requirements Specification (SRS) document from Jira ticket data following the SRS Documentation Rules and Standards.

## Required Reading (MANDATORY)

**Before generating, you MUST read the rules file:**

- `config/rules/srs_rules.md` - Contains ALL mandatory rules, document structure, formatting standards, and quality checklist

## Input Data Sources

### 1. PRIMARY: Vector DB (RAG) — REQUIRED

**You MUST get context by querying the vector DB**, not by reading the full `staging/aggregated.json`.

- Call the **RAG MCP tool `queryChunks`** with:
  - `docType`: `"srs"`
  - `ticket`: Jira ticket key (e.g. `DEV-123`, `QUANT-5918`) — from `staging/aggregated.json` → `root.key` or from the user/command
  - `project`: Project key (e.g. `DEV`, `QUANT`) — same as the prefix of the ticket key
- Use the **retrieved chunks** (reranked ticket-scoped results, typically up to 15) as the **main source** for requirements. They contain the most relevant pieces from the ticket description, acceptance criteria, linked issues, Confluence pages, and attachment metadata or extracted attachment text when available.
- **Fallback:** If no chunks exist, the RAG server may auto-embed from `staging/aggregated.json` and return chunks, or return fallback content. **Use whatever the tool returns** — including any "Fallback Data (raw aggregated.json)" section in the response. When fallback is returned, use that content together with chunks to satisfy SRS data-source rules.
- **Attachments:** RAG chunks now include attachment filenames, mime types, and any extracted attachment text when available, but they do **not** embed raw base64 or binary payloads. If you need exact binary inspection for screenshots/documents, read `staging/aggregated.json` → `attachments` only when necessary.

### 2. Optional

- **Context document:** If available, read `context/srs_template.md` or a specified context file for project structure and formatting consistency.

## Output

Save the generated SRS document to both:
- `staging/srs.md` for the active working copy
- `docs/teams/<team>/<ticket>/srs.md` for the persistent ticket archive

## Generation Process

1. **Read `config/rules/srs_rules.md` FIRST** — understand all mandatory rules.
2. **Get ticket, project, and team:** From `staging/aggregated.json` read only `root.key` and the minimum team fields needed to build the archive path:
   - `root.key` (e.g. `DEV-123`) → derive `project` from the prefix (e.g. `DEV`)
   - `root.team` if present, otherwise `root.components[0]`, otherwise use `unassigned`; normalize the team folder to lowercase kebab-case for `docs/teams/<team>/...`
3. **Query the vector DB:** Call RAG tool `queryChunks` with `docType: "srs"`, `ticket`, and `project`. Use the returned chunks as the primary input.
4. Optionally read the context file for structure/formatting.
5. Create the SRS from the **chunk content** (including attachment chunks when present) and any fallback content returned by the tool, following ALL rules from `config/rules/srs_rules.md`.
6. Verify against the Quality Checklist in the rules file.
7. Save the same final content to both `staging/srs.md` and `docs/teams/<team>/<ticket>/srs.md`.

## Key Rules Summary (see rules file for complete details)

- Use **FR-X.Y** format for Functional Requirements
- Use **NFR-X** format for Non-Functional Requirements
- Use "shall" or "must" for mandatory requirements
- Mark deprecated features with ⚠️ **DEPRECATED**
- Mark planned features with **PLANNED**
- Every UI element must have at least one corresponding FR

**IMPORTANT:** Follow ALL rules in `config/rules/srs_rules.md` - the rules file is the authoritative source for document structure, formatting, and quality requirements.
