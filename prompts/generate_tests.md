# Generate Test Cases

## Task
Generate comprehensive test cases from Jira ticket data, SRS document, and UI Specification document following the Test Case Creation Rules and Guidelines.

## Required Reading (MANDATORY)
**Before generating, you MUST read the rules file:**
- `config/rules/testcase_rules.md` - Contains ALL mandatory rules, test case structure, formatting standards, and quality checklist

## Input Data Sources

### 1. PRIMARY: Vector DB (RAG) — REQUIRED

**You MUST get context by querying the vector DB**, not by reading the full `staging/aggregated.json`.

- Call the **RAG MCP tool `queryChunks`** with:
  - `docType`: `"tests"`
  - `ticket`: Jira ticket key (e.g. `DEV-123`, `QUANT-5918`) — from `staging/aggregated.json` → `root.key` or from the user/command
  - `project`: Project key (e.g. `DEV`, `QUANT`) — prefix of the ticket key
- Use the **retrieved chunks** (reranked ticket-scoped results, typically up to 15) as the **main source** for test cases. They contain the most relevant acceptance criteria, edge cases, comments, linked-ticket context, and attachment metadata or extracted attachment text when available.
- If the tool returns fallback content, use that as well.

### 2. Optional

- **Context document:** Read `context/srs_template.md` or a specified context file.
- **Generated documents:** Read `staging/srs.md` and `staging/ui_document.md` (if available) for requirements and exact UI element names.
- **Attachments:** If tests depend on screenshots or attached documents, use attachment chunks first. Read `staging/aggregated.json` → `attachments` only when exact binary inspection is necessary.

### 3. Format detection (ticket key)

**Read only `root.key` from `staging/aggregated.json`** to decide output format (see Step 0 below).

---

## Step 0: Detect Output Format And Archive Path

**Read `staging/aggregated.json` and check the minimum fields needed** for format detection and archive output:
- `root.key`
- `root.team` if present, otherwise `root.components[0]`, otherwise use `unassigned`; normalize the team folder to lowercase kebab-case for `docs/teams/<team>/...`

- If the ticket key starts with **`QUANT-`** → use **BDD/Gherkin format** (see Output Format B below)
- If the ticket key starts with **anything else** (e.g., `DEV-`, `PROJ-`, etc.) → use **Standard JSON format** (see Output Format A below)
- Persist the generated output under `docs/teams/<team>/<ticket>/...` using the same filename as the staging copy

---

## Output Format A: Standard JSON (default — non-QUANT tickets)

Save to:
- `staging/test_cases.json`
- `docs/teams/<team>/<ticket>/test_cases.json`

```json
[
  {
    "serial_no": 1,
    "title": "Clear, descriptive test case name",
    "test_type": "Functional|Negative|UI/UX|Performance|Compatibility|Accessibility|Security|Error Handling",
    "preconditions": "Specific prerequisites",
    "testing_steps": "1. Step one\n2. Step two\n3. Step three",
    "expected_result": "Comprehensive expected outcome",
    "created": "Date/Author (optional)",
    "reviewer": "Review status (optional)"
  }
]
```

---

## Output Format B: BDD/Gherkin (QUANT- tickets only)

Save to:
- `staging/test_cases.feature`
- `docs/teams/<team>/<ticket>/test_cases.feature`

Generate test cases in **plain Gherkin syntax**. The output file must be valid `.feature` format:

```gherkin
Feature: <Feature title derived from ticket summary>

Background:
  Given <precondition shared by ALL scenarios>
  And <additional shared precondition>

Scenario: <Descriptive behavior-focused title>
  Given <initial state or context>
  When <user action or trigger>
  Then <expected observable outcome>
  And <additional assertion>

Scenario: <Next scenario title>
  Given <state>
  When <action>
  Then <outcome>
```

### Gherkin Rules

- **One Feature per ticket** — the Feature title comes from the ticket summary
- **Background section** — contains preconditions shared by ALL scenarios (e.g., login state, feature flags, data setup). Only include steps here if they apply to every single scenario.
- **One Scenario per behavior/flow** — each Scenario tests exactly one distinct user action or system behavior
- **Given** — state setup or preconditions specific to this scenario
- **When** — the user action or system event being tested
- **Then** — the expected observable outcome or assertion
- **And / But** — continuation of the previous step type (Given And, Then And, etc.)
- **Scenario titles** — descriptive, behavior-focused (e.g., "Modal can be closed using Escape key", not "Test escape key")
- **Use exact UI element text in quotes** — same rule as standard format (e.g., `When I click the "Cancel" button`)
- **Cover all test types** — include scenarios for happy path, negative cases, edge cases, accessibility, and feature flag states
- **No serial numbers or test_type fields** — Gherkin format does not use these; the scenario title and steps convey the intent

### Gherkin Example (for reference)

```gherkin
Feature: Unified Re-score Modal

Background:
  Given I am logged in as an admin user
  And the simplified rescoring feature flag is enabled for the account
  And an exam exists with completed results
  And I am on the Exam Shell "Review" tab

Scenario: Unified Re-score button is visible when feature flag is enabled
  Given the simplified rescoring feature flag is enabled
  When I view the Exam Shell "Review" tab
  Then I should see a new "Re-score" button
  And the button should appear below the existing "Rescore" button

Scenario: Open Unified Re-score modal from Review tab
  Given I am on the Exam Shell "Review" tab
  When I click the new "Re-score" button
  Then a modal should open
  And the modal title should display "Re-score"
  And the modal layout should match the approved Figma design

Scenario: Modal can be closed using Cancel button
  Given the Unified Re-score modal is open
  When I click the "Cancel" button
  Then the modal should close
  And no changes should be made to the exam
  And the original exam state should remain unchanged

Scenario: Modal and button are hidden when feature flag is disabled
  Given the simplified rescoring feature flag is disabled for the account
  When I navigate to the Exam Shell "Review" tab
  Then the new "Re-score" button should not be visible
  And the Unified Re-score modal should not be accessible
```

---

## Generation Process

1. **Read `config/rules/testcase_rules.md` FIRST** — understand all mandatory rules.
2. **Get ticket, project, and team:** From `staging/aggregated.json` read `root.key` and the minimum team fields needed for archive output. Derive `project` from the ticket prefix and use `root.team` or `root.components[0]` for the team folder, falling back to `unassigned`. Normalize the team folder to lowercase kebab-case.
3. **Query the vector DB:** Call RAG tool `queryChunks` with `docType: "tests"`, `ticket`, and `project`. Use the returned chunks as the **primary input** for test case content.
4. Optionally read context file, `staging/srs.md`, and `staging/ui_document.md`.
5. **Check `root.key` prefix** to determine output format (Step 0 above).
6. **If QUANT- ticket:** Generate Gherkin `.feature` file from **chunk content** (including attachment chunks when present) and optional SRS/UI docs, following Gherkin Rules above → save the same final content to both `staging/test_cases.feature` and `docs/teams/<team>/<ticket>/test_cases.feature`.
7. **If non-QUANT ticket:** Create test cases from **chunk content** (including attachment chunks when present) and optional SRS/UI docs, following ALL rules from `config/rules/testcase_rules.md` → save the same final content to both `staging/test_cases.json` and `docs/teams/<team>/<ticket>/test_cases.json`.
8. Verify against the Quality Checklist in the rules file.

## Key Rules Summary (see rules file for complete details)
- Use exact UI element text in quotes (e.g., "Click 'Connect' button")
- Maximum 12 steps per test case (recommended 6-8) — applies to standard JSON format
- Combine steps when actions are sequential and dependent — applies to standard JSON format
- Test all environments
- Include all test types (Functional, Negative, UI/UX, etc.)
- For Gherkin: one Scenario per behavior, Background for shared preconditions

**IMPORTANT:** Follow ALL rules in `config/rules/testcase_rules.md` - the rules file is the authoritative source for test case structure, naming conventions, and quality requirements. For Gherkin format, apply the quality principles (exact UI text, comprehensive coverage, clear assertions) within the Given/When/Then structure.
