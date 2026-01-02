# Generate Software Requirements Specification (SRS) Document

## Task
Generate a comprehensive Software Requirements Specification (SRS) document from Jira ticket data following the SRS Documentation Rules and Standards.

## Required Reading (MANDATORY)
**Before generating, you MUST read the rules file:**
- `config/rules/srs_rules.md` - Contains ALL mandatory rules, document structure, formatting standards, and quality checklist

## Input Data Sources

1. **Context Document** (if available):
   - **If specified:** Read `context/[specified_filename].md` 
   - **If not specified:** Read `context/srs_template.md`
   - Use for project context, structure, and formatting consistency

2. **Aggregated Jira Data** from `staging/aggregated.json`:
   - `root`: Primary Jira ticket (fields, description, summary, etc.)
   - `linked`: All linked Jira issues
   - `attachments`: All attachments (screenshots, documents, images)
   - `confluence`: All related Confluence pages

## Output
Save the generated SRS document to: `staging/srs.md`

## Generation Process

1. **Read `config/rules/srs_rules.md` FIRST** - understand all mandatory rules
2. Read the context file for project/module context
3. Read `staging/aggregated.json` for Jira ticket data
4. Extract and integrate data from ALL sources:
   - Root ticket (primary requirements)
   - Linked tickets (additional context, dependencies)
   - Confluence pages (detailed specifications)
   - Attachments (screenshots for UI elements, documents for specs)
5. Create SRS document following ALL rules from `config/rules/srs_rules.md`
6. Verify against the Quality Checklist in the rules file
7. Save to `staging/srs.md`

## Key Rules Summary (see rules file for complete details)
- Use **FR-X.Y** format for Functional Requirements
- Use **NFR-X** format for Non-Functional Requirements
- Use "shall" or "must" for mandatory requirements
- Mark deprecated features with ⚠️ **DEPRECATED**
- Mark planned features with **PLANNED**
- Every UI element must have at least one corresponding FR

**IMPORTANT:** Follow ALL rules in `config/rules/srs_rules.md` - the rules file is the authoritative source for document structure, formatting, and quality requirements.
