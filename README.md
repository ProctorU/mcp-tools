# Jira MCP Server + RAG Pipeline

MCP server for fetching Jira tickets and generating documentation (SRS, UI specs, test cases, subtasks) with a local RAG (Retrieval-Augmented Generation) pipeline for token-efficient document generation.

## Architecture

```
fetch-jira             → staging/aggregated.json       (Jira only — 0 tokens. Rovo does NOT run here.)
fetch-rovo-context     → aggregated.json enriched      (Separate command. Rovo discovers, then Jira/Confluence details are auto-fetched — 0 tokens.)
embed-ticket           → Vectra vector DB              (AI reads nothing — 0 tokens)
generate_srs           → query DB → reranked chunks → srs.md
generate_ui            → query DB → reranked chunks → ui_document.md
generate_tests         → query DB → reranked chunks → test_cases.json
```

The RAG pipeline reduces token usage by ~95% per full generation run by embedding ticket data into a local vector DB and retrieving only the most relevant chunks per document type.

**Important:** `fetch-jira` and `fetch-rovo-context` are **two separate commands**. Rovo runs only when you explicitly run `fetch-rovo-context` or when you run `generate_all` (which includes both fetch-jira and fetch-rovo-context in its sequence). `fetch-rovo-context` now uses Rovo only to discover related items, then automatically fetches full Jira/Confluence details for unique results before appending them.

## Setup

### 1. Install Dependencies

```bash
npm install
```

This installs all dependencies including the RAG pipeline packages (`@huggingface/transformers`, `vectra`, `md5`).

### 2. Configure Credentials

Create a `.env` file in the project root:

```env
# Jira (Required)
Jira_DOMAIN=yourcompany.atlassian.net
Jira_EMAIL=your.email@example.com
Jira_API_TOKEN=your_api_token_here

# TestRail (Optional - for pushing test cases)
TESTRAIL_URL=https://yourcompany.testrail.io
TESTRAIL_USERNAME=your.email@example.com
TESTRAIL_API_KEY=your_api_key_here
```

**Get Jira API Token:** https://id.atlassian.com/manage-profile/security/api-tokens

**Get TestRail API Key:** TestRail → User Settings → API & Integrations → Generate API Key

> The RAG server reuses the Jira credentials for batch embedding (sprint/epic). No additional env vars are needed.

---

## MCP Servers

| Server | Entry Point | Description |
| --- | --- | --- |
| `jira` | `mcp/jira/server.js` | Fetches tickets, posts test cases, creates Jira issue hierarchies |
| `testrail` | `mcp/testrail/server.js` | Pushes test cases to TestRail |
| `rag` | `mcp/rag/server.js` | Local vector DB embedding and retrieval |
| `atlassian-rovo` | Remote MCP | Semantic search across Jira + Confluence |

---

## Quick Command Reference

> **fetch-jira vs Rovo:** `fetch-jira` only fetches from Jira (ticket, linked issues, attachments, comments, Confluence pages linked from the ticket). **Rovo does not run automatically.** To add semantically related content from Atlassian Rovo, run `fetch-rovo-context` separately, or use `generate_all` (which runs both). `fetch-rovo-context` deduplicates against the existing bundle and hydrates each new related ticket/page with full Jira or Confluence data before writing `rovoContext`.

| Command | Description | Output |
| --- | --- | --- |
| `@fetch-jira DEV-123` | Fetch Jira ticket data only (no Rovo). Ticket, linked issues, attachments, comments, Confluence. | `staging/aggregated.json` |
| `@fetch-rovo-context "login flow" DEV` | **Separate step.** Rovo finds related Jira + Confluence items, then the command auto-fetches full Jira/Confluence details for unique matches and appends them to `rovoContext`. | Appends to `staging/aggregated.json` |
| `@embed-ticket DEV-123 DEV` | Embed ticket into vector DB | `vector_db/` |
| `@embed-sprint 42 100 DEV` | Embed all tickets in a sprint | `vector_db/` |
| `@embed-epic DEV-50 DEV` | Embed all tickets under an epic | `vector_db/` |
| RAG tool `clearChunks` | Delete all vector DB chunks for a ticket (no re-embed) | Chunks removed for that ticket |
| `@generate_srs` | Generate SRS document | `staging/srs.md` + `docs/teams/<team>/<ticket>/srs.md` |
| `@generate_ui` | Generate UI specification | `staging/ui_document.md` + `docs/teams/<team>/<ticket>/ui_document.md` |
| `@generate_tests` | Generate test cases | `staging/test_cases.json` or `.feature` + `docs/teams/<team>/<ticket>/...` |
| `@generate_tests_csv` | Convert tests to CSV | `staging/test_cases.csv` + `docs/teams/<team>/<ticket>/test_cases.csv` |
| `@generate_subtasks` | Generate subtasks from ticket | `staging/subtasks.json` + `docs/teams/<team>/<ticket>/subtasks.json` |
| `@generate_issues subtask` | Generate hierarchy-aware issues from ticket using top-down rules | `staging/issues.json` + `docs/teams/<team>/<ticket>/issues.json` |
| `@push_subtasks_to_jira DEV-123` | Push subtasks to Jira | Creates subtasks on ticket |
| `@push_issues_to_jira DEV-50` | Push hierarchy-aware issue plan from `staging/issues.json` or archived docs | Creates epic children and subtasks |
| `@createSubtasks DEV-123 DEV` | Full flow: fetch (Jira only) → embed → generate → push subtasks. No Rovo. | All of the above |
| `@createIssues DEV-50 DEV story` | Full flow: fetch → embed → generate child issues of the requested type → push to Jira | Creates epic child issues |
| `@createHierarchy DEV-50 DEV subtask` | Smart top-down flow: fetch → embed → generate hierarchy from parent type + intent → push to Jira | Creates child issues and subtasks |
| `@post_testcases_to_jira DEV-123` | Post test cases as Jira comment | Comment on ticket |
| `@push_to_testrail 123` | Push test cases to TestRail | Creates test cases in section |
| `@generate_all DEV-123 "login flow" DEV` | Full workflow: fetch-jira **+ fetch-rovo-context** + embed + generate all docs. Only this sequence runs Rovo automatically. | All docs generated |

### Agent behavior (Cursor)

Rules in **`.cursorrules`** tell the AI to **run `@commands` directly**: call the MCP tool / write files **without** first narrating the pipeline (“First I will query RAG…”). Outcome: **minimal reply** (paths, counts) unless you ask for detail.

---

## Workflows

### Documentation Workflow

**Step-by-step (each command is separate):**

```
@fetch-jira DEV-123                    → Jira only: ticket, linked issues, attachments, Confluence. Rovo does NOT run.
@fetch-rovo-context "login flow" DEV  → Optional. Run this if you want Rovo to discover related items and auto-fetch full Jira/Confluence content for unique matches.
@embed-ticket DEV-123 DEV             → Chunks and embeds into local vector DB
@generate_srs                         → Creates SRS from vector DB chunks
@generate_ui                          → Creates UI spec (needs SRS)
@generate_tests                       → Creates test cases (needs SRS + UI)
@generate_tests_csv                   → Converts tests to CSV format
```

**Or run all at once (includes Rovo):**

```
@generate_all DEV-123 "login flow" DEV
```

This runs: fetch-jira **+ fetch-rovo-context** + embed → generate SRS → UI → tests → CSV. Rovo runs only inside `generate_all`; it does not run when you use `fetch-jira` alone. During the Rovo step, related tickets/pages are hydrated into full fetched context before embedding.

> If you run a generate command without embedding first, the RAG server will auto-embed the ticket from `staging/aggregated.json` before querying.

> Generated docs keep a working copy in `staging/` and also persist under `docs/teams/<team>/<ticket>/`, so switching tickets no longer overwrites the older ticket's docs.

### Embedding Workflows

#### Single Ticket

```
@embed-ticket DEV-123 DEV
```

#### Entire Sprint (batch)

```
@embed-sprint 42 100 DEV
```

Where `42` is the board ID and `100` is the sprint ID. Fetches all tickets via the Jira Agile API and embeds them with cross-ticket deduplication.

#### Entire Epic (batch)

```
@embed-epic DEV-50 DEV
```

Fetches all child issues of the epic via JQL and batch-embeds them.

#### Deleting chunks

- **Via RAG MCP:** Use the `clearChunks` tool with the ticket key (e.g. `clearChunks` → `ticket: "DEV-27088"`). Removes all chunks for that ticket; shared Confluence chunks are unlinked from the ticket instead of deleted.
- **Manually:** Delete the vector DB data for the project (e.g. `vector_db/index` and/or `vector_db/indexes/<project>/<team>`). This removes all chunks for that index; re-embed to repopulate.

### Top-Down Jira Workflow

The repo now supports hierarchy-aware Jira creation from the top of the parent ticket type.

#### Parent-Type Semantics

- `Epic` parent:
  - `story` / `task` / `bug` / `spike` intents create standard child issues under the epic
  - `subtask` intent is treated as a top-down breakdown request, so the flow creates standard child issues first and then nested subtasks under each created child issue
- `Story`, `Task`, `Bug`, or `Spike` parent:
  - `subtask` intent creates direct subtasks under that parent
- `Sub-task` parent:
  - child creation is rejected

#### Smart Flow (Recommended)

```bash
@createHierarchy DEV-50 DEV subtask
```

This single command:

1. Fetches the Jira ticket bundle into `staging/aggregated.json`
2. Embeds the ticket into the vector DB
3. Generates a hierarchy-aware issue plan in `staging/issues.json` and archives it under `docs/teams/<team>/<ticket>/issues.json`
4. Creates the required Jira issues based on the parent ticket type

#### Explicit Child-Issue Flow

```bash
@createIssues DEV-50 DEV story
```

Use this when you want explicit child issue types under an epic.

#### Step-by-Step

```bash
# Step 1: Fetch Jira ticket
@fetch-jira DEV-50

# Step 2: Embed into vector DB
@embed-ticket DEV-50 DEV

# Step 3: Generate hierarchy-aware issues
@generate_issues subtask

# Step 4: Review/edit `staging/issues.json` or the archived ticket copy if needed

# Step 5: Push the issue plan to Jira
@push_issues_to_jira DEV-50
```

#### Issue Plan JSON Format

The generated `staging/issues.json` (also archived per ticket) follows this format:

```json
{
  "mode": "hierarchy",
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

### Subtask Workflow

Subtasks can still be generated directly for a standard parent ticket and automatically created on that parent ticket.

#### Option 1: Full Automated Flow (Recommended)

```
@createSubtasks DEV-123 DEV
```

This single command:

1. Fetches the Jira ticket bundle (`staging/aggregated.json`) — Jira only, no Rovo
2. Embeds the ticket into the vector DB
3. Generates subtasks following rules (`staging/subtasks.json`, also archived per ticket)
4. Creates all subtasks on the parent ticket in Jira

#### Option 2: Step-by-Step

```bash
# Step 1: Fetch Jira ticket (if not already fetched)
@fetch-jira DEV-123

# Step 2: Embed into vector DB
@embed-ticket DEV-123 DEV

# Step 3: Generate subtasks JSON
@generate_subtasks

# Step 4: Review/edit `staging/subtasks.json` or the archived ticket copy if needed

# Step 5: Push subtasks to Jira
@push_subtasks_to_jira DEV-123
```

#### Subtask JSON Format

The generated `staging/subtasks.json` (also archived per ticket) follows this format:

```json
[
  {
    "summary": "Implement user login API",
    "description": "Create POST /api/login endpoint.\n\nAcceptance Criteria:\n- Returns JWT token on success\n- Returns 401 on invalid credentials"
  },
  {
    "summary": "Add password validation",
    "description": "Implement password strength validation.\n\nDepends on: User login API"
  }
]
```

**Subtask Rules:**

- `summary` (required): Action-oriented title starting with a verb (5-80 chars)
- `description` (optional): Detailed description with acceptance criteria
- Priority uses Jira's project default

#### How Subtasks are Generated

1. **Data Sources:** Reads `staging/aggregated.json` which contains:
   - Root ticket (description, acceptance criteria)
   - Linked issues
   - Confluence pages (often has detailed implementation plans)
   - Attachments and comments

2. **Extraction Logic:**
   - Numbered lists and bullet points → subtasks
   - Acceptance criteria → individual subtasks
   - API endpoints → ordered by dependency
   - Phased plans (Part 1, Part 2) → grouped subtasks

3. **API Ordering:** For tickets with multiple APIs, subtasks are ordered by dependency:

   ```
   Signup API → Signin API → Dashboard API (requires auth)
   ```

4. **Difficulty Check:** Complex tasks are automatically subdivided into 2-8 hour chunks

### Push Test Cases to TestRail

After generating test cases, you can push them directly to TestRail.

**Prerequisites:**

- Test cases generated (`staging/test_cases.json`)
- TestRail credentials configured in `.env`
- TestRail section ID where you want to create test cases

**Command:**

```
@push_to_testrail 123
```

(Replace `123` with your TestRail section ID)

**Finding Your Section ID:**

1. Navigate to your test suite in TestRail
2. Click on the section where you want to add test cases
3. The section ID is in the URL: `https://yourcompany.testrail.io/index.php?/suites/view/XX&group_id=123`
   - The `group_id=123` or `/sections/view/123` contains your section ID

**Field Mapping:**

| Test Case JSON | TestRail Field |
| --- | --- |
| `title` | Title |
| `test_type` | Type (Functional, Regression, etc.) |
| `priority` | Priority |
| `serial_no` | References (AUTO-{serial_no}) |
| `preconditions` | Preconditions |
| `testing_steps` | Steps |
| `expected_result` | Expected Result |

**Output:**

- Returns count of successfully created test cases
- Lists created case IDs (e.g., C123, C124, C125)

---

## Using Context Files (Optional)

All documents are generated from `staging/aggregated.json`. You can optionally add context files for additional reference.

### What is the Context Folder?

The `context/` folder is for storing reference files that help improve document generation:

- **Source code files** - Actual implementation code for analysis
- **Documentation templates** - Existing SRS/UI docs for formatting reference
- **Other references** - Any relevant project files

### How to Add Context

1. Create a `context/` folder in the project root
2. Add your reference files (source code, docs, templates)
3. Reference them when generating documents:

```
Generate SRS using @context/your-file.js
Generate test cases using @context/your-template.md
```

### Example Structure

```
context/
├── src/
│   └── MyComponent.js      # Source code for implementation analysis
├── docs/
│   └── srs_template.md     # SRS formatting template
└── specs/
    └── ui_spec.md          # UI specification reference
```

**Note:** Context files are optional. Without them, documents are generated purely from Jira ticket data.

---

## Output Files

Working files remain in `staging/`, while persistent generated docs are archived per ticket under `docs/teams/<team>/<ticket>/`:

| File | Description |
| --- | --- |
| `staging/aggregated.json` | Raw Jira ticket data (root, linked, attachments, comments, confluence, metadata) |
| `vector_db/index/` | Vectra vector index (folder-based, all projects + teams) |
| `vector_db/meta.json` | Staleness and hash registry per ticket |
| `staging/srs.md` + `docs/teams/<team>/<ticket>/srs.md` | Software Requirements Specification |
| `staging/ui_document.md` + `docs/teams/<team>/<ticket>/ui_document.md` | UI Specification Document |
| `staging/test_cases.json` or `.feature` + archived copy | Test cases in source format |
| `staging/test_cases.csv` + `docs/teams/<team>/<ticket>/test_cases.csv` | Test cases in CSV format (for Excel/Sheets) |
| `staging/subtasks.json` + `docs/teams/<team>/<ticket>/subtasks.json` | Generated subtasks ready for Jira |
| `staging/issues.json` + `docs/teams/<team>/<ticket>/issues.json` | Generated hierarchy plan ready for Jira |

---

## RAG Pipeline

### How It Works

1. **Fetch** -- `fetch-jira` (Jira MCP only) collects the ticket, linked issues, attachments, comments, and Confluence pages linked from the ticket into `staging/aggregated.json`. Rovo does not run. AI reads nothing (0 tokens).
2. **Enrich** -- `fetch-rovo-context` is a **separate command**. It uses Atlassian Rovo MCP to discover semantically related tickets and Confluence pages, then automatically fetches full Jira/Confluence details for unique results and appends them to `aggregated.json` under `rovoContext`. Run it only if you want Rovo content; it is not automatic after fetch-jira. (It runs automatically only inside `generate_all`.)
3. **Embed** -- `embed-ticket` chunks the aggregated data by semantic boundary (description, acceptance criteria, comments, linked tickets, confluence sections, rovo results), embeds each chunk with MiniLM-L6-v2, and stores in a local Vectra vector DB. Incremental -- unchanged chunks are skipped.
4. **Query** -- When generating documents, the RAG server reranks all ticket chunks, returns up to 15 ticket-scoped results, and uses hybrid search (vector similarity + keyword boost) to keep prompts focused.

### Token Savings

| Stage | Before (raw JSON) | After (RAG) |
| --- | --- | --- |
| generate_srs | 20,000-60,000 | 1,000-3,000 |
| generate_ui | 20,000-60,000 | 1,000-3,000 |
| generate_tests | 20,000-60,000 | 1,000-3,000 |
| **Total per run** | **60,000-180,000** | **3,000-9,000** |

### Chunk Types

| Type | Source | Used For |
| --- | --- | --- |
| `description` | Jira | SRS, subtasks |
| `acceptance_criteria` | Jira (extracted from ADF description) | SRS, tests |
| `comment` | Jira | Tests, context |
| `linked_ticket_summary` | Jira | SRS, subtasks |
| `bug_ticket` | Jira | Tests |
| `confluence_section` | Confluence | SRS, UI |
| `ui_notes` | Confluence | UI |
| `rovo_related_ticket` | Rovo | SRS, context |
| `rovo_related_page` | Rovo | SRS, UI |

### Query Profiles

Each document type uses a different query and chunk type filter:

| Profile | Chunk Types Retrieved |
| --- | --- |
| `srs` | description, acceptance_criteria, linked_ticket_summary, confluence_section |
| `ui` | ui_notes, confluence_section, rovo_related_page, description |
| `tests` | acceptance_criteria, bug_ticket, comment, linked_ticket_summary |
| `subtasks` | description, acceptance_criteria, linked_ticket_summary |
| `traceability` | acceptance_criteria, description, linked_ticket_summary, bug_ticket |

### RAG MCP Tools

The RAG server exposes these tools:

| Tool | Description |
| --- | --- |
| `embedTicket` | Embed a single ticket from `staging/aggregated.json` |
| `queryChunks` | Query vector DB by document type, ticket, project, and optional team |
| `inspectChunks` | List all stored chunks for a ticket (types, hashes, timestamps) |
| `queryDebug` | Raw vector search with similarity scores for debugging |
| `embedSprint` | Batch-embed all tickets in a Jira sprint |
| `embedEpic` | Batch-embed all tickets under a Jira epic |
| `listTeams` | Discover boards, teams, and active sprints for a project |

### Team Detection

Team assignment comes from Jira's native Team custom field (via `slimIssue()` in `mcp/jira/server.js`). Fallback chain:

1. Jira Team field (`customfield_10001`)
2. First Jira Component
3. `"unassigned"`

Team is a filter dimension on the vector DB, not a separate database. Use the `team` parameter to scope queries to a specific team, or omit it for full project context.

### Key Features

- **Incremental embedding** -- only new or changed chunks are embedded; unchanged chunks are skipped via MD5 hashing
- **Staleness detection** -- warns if a ticket was updated since the last embed and triggers re-embedding
- **Cross-ticket deduplication** -- Confluence pages shared across tickets are stored once, referenced by all
- **Confidence gate** -- if the top retrieval score is below 0.75, falls back to reading targeted sections from `aggregated.json`
- **Auto-embed fallback** -- if `queryChunks` is called for a ticket with no chunks, it auto-embeds from `staging/aggregated.json` first

---

## Project Structure

```
mcp/
├── jira/
│   └── server.js              ← Jira MCP (fetch tickets, post comments, create subtasks)
├── testrail/
│   └── server.js              ← TestRail MCP (push test cases)
└── rag/
    ├── server.js              ← RAG MCP server (7 tools, stdio transport)
    ├── embed.js               ← Embedding pipeline (MiniLM-L6-v2, incremental)
    ├── query.js               ← Hybrid search, query profiles, fallback, auto-embed
    ├── chunk.js               ← ADF parsing, acceptance criteria extraction, semantic chunking
    ├── hash.js                ← MD5 content hashing
    ├── dedup.js               ← Cross-ticket Confluence deduplication
    ├── staleness.js           ← Staleness detection
    ├── teams.config.js        ← Team registry (known teams per project)
    └── db/
        └── index.js           ← Vectra LocalIndex wrapper

staging/
├── aggregated.json            ← Raw ticket bundle (root/linked/attachments/comments/confluence/metadata)
├── srs.md
├── ui_document.md
├── test_cases.json
├── test_cases.csv
├── subtasks.json
└── issues.json

vector_db/
├── index/                     ← Legacy single-index fallback
├── indexes/
│   └── <project>/<team>/      ← Team-scoped Vectra indexes
└── meta.json                  ← Staleness + hash registry per ticket

docs/
└── teams/
    └── <team>/
        └── <ticket>/
            ├── srs.md
            ├── ui_document.md
            ├── test_cases.json | test_cases.feature | test_cases.csv
            ├── subtasks.json
            └── issues.json

prompts/                       ← Generation prompts (unchanged)
config/rules/                  ← Generation rules (SRS, UI, tests, subtasks, traceability)
```
