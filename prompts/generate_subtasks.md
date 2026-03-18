# Generate Jira Subtasks

## Task
Generate actionable Jira subtasks from aggregated ticket data (Jira tickets, Confluence pages, attachments) following the Subtask Generation Rules and Guidelines.

## Required Reading (MANDATORY)
**Before generating, you MUST read the rules file:**
- `config/rules/subtask_rules.md` - Contains ALL mandatory rules, subtask structure, formatting standards, and quality checklist

## Input Data Sources

### 1. PRIMARY: Vector DB (RAG) — REQUIRED

**You MUST get context by querying the vector DB**, not by reading the full `staging/aggregated.json`.

- Call the **RAG MCP tool `queryChunks`** with:
  - `docType`: `"subtasks"`
  - `ticket`: Jira ticket key (e.g. `DEV-123`) — from `staging/aggregated.json` → `root.key` or from the user/command
  - `project`: Project key (e.g. `DEV`) — prefix of the ticket key
- Use the **retrieved chunks** (reranked ticket-scoped results, typically up to 15) as the **main source** for subtask extraction. They contain the most relevant description, acceptance criteria, linked-ticket context, Confluence content, and attachment metadata or extracted attachment text when available.
- If the tool returns fallback content (e.g. when confidence is low), use that as well.

### 2. Optional

- **Targeted read:** If you need only the ticket key, read `root.key` from `staging/aggregated.json`. Do not read the full file for content; rely on the chunks.

### Priority within chunk content

When the same topic appears in multiple chunks, prioritize: implementation plans and phased breakdowns (e.g. Part 1, Part 2, Sprints), then root ticket requirements, then linked-ticket and comment context.

---

## Output
Save the generated subtasks to both:
- `staging/subtasks.json` for the active working copy
- `docs/teams/<team>/<ticket>/subtasks.json` for the persistent ticket archive

## Output Format (JSON Array)
```json
[
  {
    "summary": "Clear, actionable subtask title (verb + object)",
    "description": "Detailed description with acceptance criteria"
  }
]
```

**Note:** Priority is not specified - Jira's default priority will be used for all subtasks.

## Generation Process

1. **Read `config/rules/subtask_rules.md` FIRST** — understand all mandatory rules.

2. **Get ticket, project, and team:** From `staging/aggregated.json` read only the minimum fields needed:
   - `root.key` → derive `project` (prefix)
   - `root.team` if present, otherwise `root.components[0]`, otherwise use `unassigned`; normalize the team folder to lowercase kebab-case for `docs/teams/<team>/...`

3. **Query the vector DB:** Call RAG tool `queryChunks` with `docType: "subtasks"`, `ticket`, and `project`. Use the returned chunks as the **primary input**.

4. Extract actionable items from the **chunk content** (and any fallback returned by the tool):
   - Description and acceptance criteria
   - Implementation plans, phases, timelines (e.g. Part 1, Part 2, Sprints)
   - Linked-ticket and comment context when present in chunks
   - Attachment-provided checklists, task hints, or referenced artifacts when present in chunks

5. Identify subtasks using these patterns:
   - Numbered lists (1., 2., 3.)
   - Bullet points with action items
   - Acceptance criteria items
   - Test case scenarios
   - Workflow steps
   - Headings describing distinct tasks
6. **Detect if ticket contains APIs** (see API Processing section below)
7. **Assess difficulty** and subdivide if needed (see Difficulty Assessment section below)
8. Create subtasks following ALL rules from `config/rules/subtask_rules.md`
9. **Order subtasks by logical dependency** (especially for API tickets)
10. Verify against the Quality Checklist in the rules file
11. Save the same final JSON to both `staging/subtasks.json` and `docs/teams/<team>/<ticket>/subtasks.json`

---

## API Ticket Processing

### Detect API Tickets
Scan the ticket content for API indicators:
- **Keywords:** "API", "endpoint", "/api/", "REST", "POST", "GET", "PUT", "DELETE"
- **Patterns:** URL paths like `/api/v1/users`, method mentions like "POST /signup"
- **Multiple APIs:** Look for lists of APIs (e.g., "Signup API, Signin API, Dashboard API")

### Order by Dependency (CRITICAL for API tickets)
When multiple APIs are mentioned, determine the correct order:

1. **Identify all APIs** mentioned in the ticket
2. **Determine dependencies** between them:
   - Which API creates data that others need?
   - Which API requires authentication?
   - What is the logical user flow?
3. **Order subtasks:** Independent APIs first, dependent APIs after

**Dependency Indicators to Look For:**
- "requires authentication" → depends on Signin/Login API
- "requires user to exist" → depends on Signup/Create User API
- "uses [entity] ID" → depends on API that creates that entity
- "after", "then", "once" → indicates sequence

**Example - Correct API Ordering:**

Input ticket mentions: "Implement Signup API, Signin API, and Dashboard API"

Correct subtask order:
```
1. Signup API     → No dependency (creates users)
2. Signin API     → Depends on Signup (user must exist)
3. Dashboard API  → Depends on Signin (requires authentication)
```

### Include Dependencies in Descriptions
For API subtasks, always note dependencies:
```json
{
  "summary": "Implement Signin API endpoint",
  "description": "Create POST /api/signin for authentication.\n\nDepends on: Signup API (user must exist first)"
}
```

---

## Difficulty Assessment

### Identify High Difficulty Items
Before creating a subtask, assess if it's too complex:

| Indicator | Example | Action |
|-----------|---------|--------|
| Multiple APIs in one task | "Implement auth APIs" | Subdivide into separate API subtasks |
| "Complete flow" language | "Complete user registration flow" | Break into steps |
| Multiple integrations | "Integrate with email and SMS" | Separate subtasks per integration |
| Estimated > 8 hours | Large implementation scope | Split into smaller pieces |
| Complex keywords | "complex", "full", "complete", "multiple" | Review and subdivide |

### Subdivision Guidelines
When difficulty is too high:

1. **Break into 2-4 smaller subtasks**
2. **Each should be 2-4 hours of work**
3. **Maintain dependency order**
4. **Each must be independently testable**

**Subdivision Example:**

Before (Too Complex):
```
"Implement complete user authentication"
```

After (Subdivided with correct order):
```
1. "Create user validation schema"
2. "Implement Signup API endpoint"
3. "Implement Signin API endpoint"
4. "Add session/token management"
5. "Write authentication tests"
```

---

## Phased/Sprint-Based Plans

When Confluence pages contain phased implementation plans (Part 1, Part 2, Part 3 or Sprint-based):

### Detect Phased Plans
Look for these patterns in Confluence content:
- "Part 1:", "Part 2:", "Part 3:"
- "Sprint 1", "Sprint 2"
- "Phase 1", "Phase 2"
- "Option A: 3 separate sprints"
- Section headers with numbered parts

### Organize Subtasks by Phase
When a phased plan exists:
1. **Group subtasks by phase** in the correct order
2. **Add phase identifier** to each subtask description (e.g., "Part 1: Core API Testing")
3. **Maintain dependencies** within and across phases
4. **Include all items** from each phase - don't skip any

### Example - Phased Subtask Organization
```json
[
  {"summary": "Set up test framework", "description": "...\n\nPart 1: Core API Testing"},
  {"summary": "Create Users API tests", "description": "...\n\nPart 1: Core API Testing"},
  {"summary": "Create Reservation tests", "description": "...\n\nPart 2: Reservation Lifecycle"},
  {"summary": "Execute load tests", "description": "...\n\nPart 3: Performance Testing"}
]
```

---

## Key Rules Summary (see rules file for complete details)

- **Titles must be action-oriented** (start with a verb)
- **Each subtask must be independently completable**
- **Keep titles 5-80 characters**
- **Aim for 3-25 subtasks per ticket** (more for complex multi-phase projects)
- **No duplicate subtasks**
- **Output must be valid JSON array**

### API-Specific Rules
- **Order APIs by dependency** - Independent APIs first, dependent APIs after
- **Include dependency info** in descriptions (e.g., "Depends on: Signup API")
- **Example order:** Signup → Signin → Dashboard (not random order)

### Difficulty Rules
- **If difficulty is high, subdivide** into smaller subtasks
- **Each subtask should be 2-8 hours** of work
- **Break "complete flow" tasks** into individual steps

## After Generation

Once `staging/subtasks.json` is generated, you can push the subtasks to Jira using:
- Call the `createSubtasks` MCP tool with the parent ticket ID

**IMPORTANT:** Follow ALL rules in `config/rules/subtask_rules.md` - the rules file is the authoritative source for subtask structure, naming conventions, and quality requirements.
