# Jira MCP Server

MCP server for fetching Jira tickets and generating documentation (SRS, UI specs, test cases, subtasks).

## Setup

### 1. Install Dependencies

```bash
npm install
```

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

---

## Quick Command Reference

| Command | Description | Output |
|---------|-------------|--------|
| `@fetch-jira DEV-123` | Fetch Jira ticket data | `staging/aggregated.json` |
| `@generate_srs` | Generate SRS document | `staging/srs.md` |
| `@generate_ui` | Generate UI specification | `staging/ui_document.md` |
| `@generate_tests` | Generate test cases | `staging/test_cases.json` |
| `@generate_tests_csv` | Convert tests to CSV | `staging/test_cases.csv` |
| `@generate_subtasks` | Generate subtasks from ticket | `staging/subtasks.json` |
| `@push_subtasks_to_jira DEV-123` | Push subtasks to Jira | Creates subtasks on ticket |
| `@createSubtasks DEV-123` | Full flow: fetch → generate → push subtasks | All of the above |
| `@post_testcases_to_jira DEV-123` | Post test cases as Jira comment | Comment on ticket |
| `@push_to_testrail 123` | Push test cases to TestRail | Creates test cases in section |
| `@generate_all DEV-123` | Full documentation workflow | All docs generated |

---

## Workflows

### Documentation Workflow

```
@fetch-jira DEV-123     → Fetches ticket, linked issues, attachments, Confluence pages
@generate_srs           → Creates SRS from aggregated.json
@generate_ui            → Creates UI spec (needs SRS)
@generate_tests         → Creates test cases (needs SRS + UI)
@generate_tests_csv     → Converts tests to CSV format
```

**Or run all at once:**
```
@generate_all DEV-123
```

### Subtask Workflow

Subtasks can be generated from Jira ticket data and automatically created on the parent ticket.

#### Option 1: Full Automated Flow (Recommended)

```
@createSubtasks DEV-123
```

This single command:
1. Fetches the Jira ticket bundle (`staging/aggregated.json`)
2. Generates subtasks following rules (`staging/subtasks.json`)
3. Creates all subtasks on the parent ticket in Jira

#### Option 2: Step-by-Step

```bash
# Step 1: Fetch Jira ticket (if not already fetched)
@fetch-jira DEV-123

# Step 2: Generate subtasks JSON
@generate_subtasks

# Step 3: Review/edit staging/subtasks.json if needed

# Step 4: Push subtasks to Jira
@push_subtasks_to_jira DEV-123
```

#### Subtask JSON Format

The generated `staging/subtasks.json` follows this format:

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
|----------------|----------------|
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

All generated files are saved to the `staging/` folder:

| File | Description |
|------|-------------|
| `aggregated.json` | Raw Jira ticket data (root, linked, attachments, confluence) |
| `srs.md` | Software Requirements Specification |
| `ui_document.md` | UI Specification Document |
| `test_cases.json` | Test cases in JSON format |
| `test_cases.csv` | Test cases in CSV format (for Excel/Sheets) |
| `subtasks.json` | Generated subtasks ready for Jira |
