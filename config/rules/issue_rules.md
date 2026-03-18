# Jira Issue Hierarchy Generation Rules

**Document ID:** ISSUE-RULES-001  
**Document Version:** 1.0  
**Last Updated:** 2026-03-12  
**Description:** Rules for generating top-down Jira issue hierarchies from Epic, Story, Task, Bug, and Spike tickets

---

## 1. Purpose

This document defines how to generate Jira issue plans in a hierarchy-aware way.

Use these rules when the goal is to create:
- standard child issues under an `Epic`
- subtasks under a `Story`, `Task`, `Bug`, or `Spike`
- a two-level hierarchy when the request is effectively "from epic create subtasks"

---

## 2. Parent-Type Rules

### 2.1 Epic Parent

If the root ticket is an `Epic`, the generated top-level items must be standard child issues such as:
- `Story`
- `Task`
- `Bug`
- `Spike`

Do **not** output a top-level `Sub-task` directly under an epic.

If the user intent is `subtask` for an epic:
- treat it as a top-down breakdown request
- generate standard child issues first
- add nested `children` entries of type `Sub-task` under those generated child issues

### 2.2 Standard Parent

If the root ticket is a `Story`, `Task`, `Bug`, or `Spike`:
- generate only `Sub-task` items
- output them as top-level items in `items[]`
- do not add nested grandchildren

### 2.3 Sub-task Parent

If the root ticket is already a `Sub-task`:
- do not generate child work
- the Jira creation tool will reject this path

---

## 3. Intent Rules

Use the provided command parameter `intent` when available.

Supported intent values:
- `story`
- `task`
- `bug`
- `spike`
- `subtask`
- `auto`

Interpretation:
- For an epic + `story`/`task`/`bug`/`spike`: all top-level generated items should use that issue type unless source material clearly requires a different type.
- For an epic + `subtask`: produce a two-level hierarchy with standard child issues plus nested subtasks.
- For a standard parent + `subtask`: produce direct subtasks only.
- For `auto`: infer the best structure from the parent ticket type and source content.

---

## 4. Data Sources

Extract issue information from all available sources in this order:
1. Root ticket description and acceptance criteria
2. Confluence content
3. Linked Jira tickets
4. Attachment text and attachment references
5. Comments when they contain actionable implementation detail

When using RAG:
- use `queryChunks` output as the primary source
- use fallback content when provided
- read raw attachment payloads only when binary inspection is necessary

---

## 5. Issue Identification Rules

Create child issues only for actionable units of work that:
- have a clear definition of done
- are understandable without the full parent description
- map to a coherent workstream, feature slice, bug fix area, or research task

Look for candidate issues in:
- numbered implementation plans
- bullet lists of tasks
- acceptance criteria groups
- Confluence sections and phase plans
- linked-ticket breakdowns
- workflow stages

Do not create issues for:
- pure context or background
- already completed items
- duplicate work items
- status notes without an action

---

## 6. Issue Type Selection

### 6.1 Story

Use `Story` when the work represents:
- a user-facing capability
- an end-to-end product slice
- a requirement that delivers visible functionality

### 6.2 Task

Use `Task` when the work is:
- implementation-heavy
- technical setup or integration
- platform or backend work not best expressed as a user story

### 6.3 Bug

Use `Bug` when the source clearly describes:
- a defect
- broken behavior
- regression
- issue reproduction and fix work

### 6.4 Spike

Use `Spike` when the main goal is:
- investigation
- research
- technical validation
- proof of concept

### 6.5 Sub-task

Use `Sub-task` only under a standard issue. Subtasks should be smaller than top-level child issues and usually represent 1-8 hours of work.

---

## 7. Granularity Rules

### 7.1 Epic Children

Top-level epic children should usually represent:
- a feature slice
- a technical workstream
- a defect area
- a research stream

Typical target:
- 2-10 top-level child issues for one epic request

### 7.2 Subtasks

Subtasks should usually represent:
- 1-8 hours of work
- one clear responsibility
- one independently testable step

Typical target:
- 3-15 subtasks per standard issue

---

## 8. Ordering Rules

Order generated items by:
1. logical dependency
2. source-document order
3. implementation flow

For API-heavy work:
- create foundational schemas/setup first
- create create/auth endpoints before dependent endpoints
- create tests and docs after implementation unless the source explicitly requires otherwise

---

## 9. Output Schema

Output must be valid JSON written to `staging/issues.json`. When ticket archiving is enabled, also persist the same JSON to `docs/teams/<team>/<ticket>/issues.json`.

Required schema:

```json
{
  "mode": "epic_children",
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

Rules:
- `mode` must be one of:
  - `epic_children`
  - `subtasks`
  - `hierarchy`
- every item must include:
  - `issueType`
  - `summary`
- `description` is optional but recommended
- `children` is optional
- `children` must only contain `Sub-task` items

---

## 10. Mode Selection

Choose `mode` based on the parent ticket type and intent:
- epic + standard child issue intent -> `epic_children`
- story/task/bug/spike + subtask intent -> `subtasks`
- epic + subtask intent -> `hierarchy`

---

## 11. Writing Rules

### 11.1 Summary

Each summary must:
- start with a verb
- be clear and descriptive
- stay within 5-80 characters
- make sense without the description

### 11.2 Description

Descriptions should include:
- what needs to be done
- acceptance criteria or definition of done
- dependencies when relevant
- technical constraints when useful
- source reference when it helps traceability

Keep descriptions concise and practical.

---

## 12. Quality Checklist

Before finalizing:
- [ ] Parent-type rules were followed
- [ ] No top-level subtasks were created for an epic
- [ ] Every item is actionable
- [ ] Issue types match the user intent and source material
- [ ] Dependencies are reflected in ordering
- [ ] Nested `children` only appear when needed
- [ ] Output is valid JSON and matches the required schema

---

## 13. Special Rule For "From Epic Create Subtask"

Interpret this request as:
1. break the epic into standard child issues
2. break each child issue into nested subtasks when the source supports that level of detail

Preferred top-level type for this case:
- `Task` for technical implementation work
- `Story` when the work is clearly user-facing

Do not create one giant child issue with dozens of subtasks unless the source material clearly describes only a single workstream.
