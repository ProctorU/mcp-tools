# Generate Test Cases

## Task
Generate comprehensive test cases from Jira ticket data, SRS document, and UI Specification document following the Test Case Creation Rules and Guidelines.

## Required Reading (MANDATORY)
**Before generating, you MUST read the rules file:**
- `config/rules/testcase_rules.md` - Contains ALL mandatory rules, test case structure, formatting standards, and quality checklist

## Input Data Sources

1. **Context Document** (if available):
   - **If specified:** Read `context/[specified_filename].md`
   - **If not specified:** Read `context/srs_template.md`
   - Use for project context and consistency

2. **Aggregated Jira Data** from `staging/aggregated.json`:
   - `root`: Primary Jira ticket (acceptance criteria, test scenarios)
   - `linked`: All linked Jira issues (edge cases, related functionality)
   - `attachments`: Screenshots (critical for exact UI element names)
   - `confluence`: Test scenarios, acceptance criteria

3. **Generated Documents:**
   - `staging/srs.md` - Functional requirements and test scenarios
   - `staging/ui_document.md` - UI elements and exact element names for test steps

## Output
Save the generated test cases to: `staging/test_cases.json`

## Output Format (JSON Array)
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

## Generation Process

1. **Read `config/rules/testcase_rules.md` FIRST** - understand all mandatory rules
2. Read the context file for project/module context
3. Read `staging/aggregated.json` for Jira ticket data
4. Read `staging/srs.md` for functional requirements
5. Read `staging/ui_document.md` for exact UI element names
6. Extract data from ALL sources (root, linked, confluence, attachments)
7. Create test cases following ALL rules from `config/rules/testcase_rules.md`
8. Verify against the Quality Checklist in the rules file
9. Save to `staging/test_cases.json`

## Key Rules Summary (see rules file for complete details)
- Use exact UI element text in quotes (e.g., "Click 'Connect' button")
- Maximum 12 steps per test case (recommended 6-8)
- Combine steps when actions are sequential and dependent
- Test all environments
- Include all test types (Functional, Negative, UI/UX, etc.)

**IMPORTANT:** Follow ALL rules in `config/rules/testcase_rules.md` - the rules file is the authoritative source for test case structure, naming conventions, and quality requirements.
