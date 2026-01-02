# Generate UI Specification Document

## Task
Generate a comprehensive UI Specification Document from Jira ticket data and screenshots following the UI Specification Document Rules and Standards.

## Required Reading (MANDATORY)
**Before generating, you MUST read the rules file:**
- `config/rules/ui_rules.md` - Contains ALL mandatory rules, document structure, formatting standards, and quality checklist

## Input Data Sources

1. **Context Document** (if available):
   - **If specified:** Read `context/[specified_filename].md`
   - **If not specified:** Read `context/srs_template.md`
   - Use for project context and consistency

2. **Aggregated Jira Data** from `staging/aggregated.json`:
   - `root`: Primary Jira ticket (UI-related information)
   - `linked`: All linked Jira issues (UI elements, interactions)
   - `attachments`: **Screenshots are the PRIMARY source** for UI documentation
   - `confluence`: Design documents, style guides, UI specifications

3. **SRS Document** (if available):
   - `staging/srs.md` - Requirements context

## Output
Save the generated UI Specification document to: `staging/ui_document.md`

## Generation Process

1. **Read `config/rules/ui_rules.md` FIRST** - understand all mandatory rules
2. Read the context file for project/module context
3. Read `staging/aggregated.json` for Jira ticket data
4. Read `staging/srs.md` (if available) for requirements context
5. **Analyze screenshots FIRST** - they are the PRIMARY source:
   - Document EVERY UI element visible in screenshots
   - Use exact text/labels from screenshots
   - Reference screenshot filenames
6. Extract data from ALL sources (root, linked, confluence, attachments)
7. Create UI Specification following ALL rules from `config/rules/ui_rules.md`
8. Verify against the Quality Checklist in the rules file
9. Save to `staging/ui_document.md`

## Key Rules Summary (see rules file for complete details)
- **Screenshots are PRIMARY source** - document every visible element
- Document all fields with: label, type, location, editable status, default value, validation
- Document all dropdowns with: ALL options listed, default value, deprecated options marked
- Document all buttons with: text, location, states (default, hover, disabled, selected), actions
- Document all tables with: columns, data types, actions
- Mark deprecated elements with ⚠️ **DEPRECATED**
- Mark planned features with **PLANNED**

**IMPORTANT:** Follow ALL rules in `config/rules/ui_rules.md` - the rules file is the authoritative source for document structure, UI element documentation, and quality requirements.
