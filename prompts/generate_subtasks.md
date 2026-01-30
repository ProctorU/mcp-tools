# Generate Jira Subtasks

## Task
Generate actionable Jira subtasks from aggregated ticket data (Jira tickets, Confluence pages, attachments) following the Subtask Generation Rules and Guidelines.

## Required Reading (MANDATORY)
**Before generating, you MUST read the rules file:**
- `config/rules/subtask_rules.md` - Contains ALL mandatory rules, subtask structure, formatting standards, and quality checklist

## Input Data Sources

1. **Aggregated Jira Data** from `staging/aggregated.json`:
   - `root`: Primary Jira ticket (description, summary, acceptance criteria)
   - `linked`: All linked Jira issues (related tasks, dependencies)
   - `attachments`: All attachments (documents with task breakdowns)
   - `confluence`: All related Confluence pages (specifications, requirements, checklists)
   - `comments`: Ticket comments (may contain action items)

---

## CRITICAL: Reading Large Files

**The `aggregated.json` file is often very large (100k+ characters).** You MUST read ALL sections completely.

### Mandatory Reading Strategy

1. **Search for all sections first** - Use grep/search to locate these keys in the file:
   - `"root":` - Main ticket (usually at the start)
   - `"linked":` - Linked tickets
   - `"confluence":` - Confluence pages (**CRITICAL - often contains detailed breakdowns**)
   - `"attachments":` - Attached documents
   - `"comments":` - Ticket comments

2. **Read Confluence section COMPLETELY** - Confluence pages often contain:
   - Sprint-based timelines
   - Detailed implementation plans
   - Full API scope and test coverage
   - Phase/Part breakdowns
   - Performance targets and exit criteria
   
3. **If file is too large to read at once:**
   - Read in chunks (500-1000 lines at a time)
   - Continue reading until you've covered ALL sections
   - Pay special attention to `confluence` array - read each page's `textContent` fully

### Search Commands to Use

Before generating subtasks, run these searches on `staging/aggregated.json`:
```
Search for: "confluence"    → Find Confluence section start
Search for: "textContent"   → Find actual page content
Search for: "Part 1", "Part 2", "Sprint" → Find phased plans
Search for: "API", "endpoint" → Find API specifications
```

### Priority of Data Sources

When the same topic appears in multiple sources, prioritize:
1. **Confluence pages** (most detailed, often has implementation plans)
2. **Root ticket description** (official requirements)
3. **Linked tickets** (additional context)
4. **Attachments** (supporting documents)
5. **Comments** (clarifications)

---

## Output
Save the generated subtasks to: `staging/subtasks.json`

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

1. **Read `config/rules/subtask_rules.md` FIRST** - understand all mandatory rules

2. **Read `staging/aggregated.json` COMPLETELY** (Critical!):
   - **Step 2a:** Search for section locations (`"root":`, `"confluence":`, `"linked":`)
   - **Step 2b:** Read the `root` section for main ticket details
   - **Step 2c:** Read the `confluence` section FULLY - search for `"textContent"` and read each page
   - **Step 2d:** Read `linked` tickets for additional context
   - **Step 2e:** Check `attachments` and `comments` for supplementary info
   - **DO NOT STOP** after reading only the root ticket!

3. Extract actionable items from ALL sources:
   - Root ticket description and acceptance criteria
   - **Confluence pages (PRIORITY - often has detailed plans, phases, timelines)**
   - Linked tickets (additional context and tasks)
   - Comments (action items mentioned)

4. Identify subtasks using these patterns:
   - Numbered lists (1., 2., 3.)
   - Bullet points with action items
   - Acceptance criteria items
   - Test case scenarios
   - Workflow steps
   - Headings describing distinct tasks
5. **Detect if ticket contains APIs** (see API Processing section below)
6. **Assess difficulty** and subdivide if needed (see Difficulty Assessment section below)
7. Create subtasks following ALL rules from `config/rules/subtask_rules.md`
8. **Order subtasks by logical dependency** (especially for API tickets)
9. Verify against the Quality Checklist in the rules file
10. Save to `staging/subtasks.json`

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
