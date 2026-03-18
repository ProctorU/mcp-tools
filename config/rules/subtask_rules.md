# Subtask Generation Rules and Guidelines

**Document ID:** SUBTASK-RULES-001  
**Document Version:** 1.0  
**Last Updated:** 2026-01-29  
**Description:** Comprehensive rules for generating Jira subtasks from ticket and Confluence data

---

## 1. Purpose

This document establishes mandatory rules and standards for generating Jira subtasks from aggregated ticket data (Jira tickets, Confluence pages, attachments). These rules ensure subtasks are actionable, well-structured, and properly prioritized.

---

## 2. Scope

These rules apply to all subtask generation from:
- Jira ticket descriptions and acceptance criteria
- Linked Jira issues
- Confluence pages (specifications, requirements, test plans)
- Attachments (documents, screenshots)

---

## 3. Data Source Requirements

### 3.1 Complete Data Extraction

**RULE-SUB-DATA-1: Use All Available Sources**
- **Mandatory:** Extract subtask information from ALL available data sources:
  - **Root Ticket:** Primary ticket description, summary, acceptance criteria
  - **Linked Tickets:** Related issues that may contain additional tasks
  - **Confluence Pages:** Detailed specifications, task lists, requirements
  - **Attachments:** Documents containing task breakdowns or checklists
  - When using RAG, use attachment chunks returned by `queryChunks` as the default attachment source for filenames, mime types, and any extracted attachment text
  - Read raw attachment payloads from `staging/aggregated.json` only when binary inspection is required

**RULE-SUB-DATA-2: Priority Order**
- When sources conflict, prioritize in this order:
  1. Root ticket description and acceptance criteria
  2. Confluence pages (detailed specifications)
  3. Linked tickets
  4. Attachments

---

## 4. Subtask Identification Rules

### 4.1 What Qualifies as a Subtask

**RULE-SUB-ID-1: Actionable Items**
- **Mandatory:** Only create subtasks for actionable items that:
  - Can be independently completed
  - Have a clear definition of done
  - Contribute to completing the parent ticket

**RULE-SUB-ID-2: Identify Subtasks From**
- **Mandatory:** Look for subtasks in these content patterns:
  - Numbered lists (1., 2., 3.)
  - Bullet point lists with action items
  - Headings that describe distinct tasks
  - Acceptance criteria items
  - Test case scenarios
  - Checklist items
  - Steps in a workflow or process
  - "TODO" or "Action Required" sections

**RULE-SUB-ID-3: Granularity Guidelines**
- Each subtask should represent 1-8 hours of work (typical)
- Break down large tasks into smaller, manageable subtasks
- Combine trivially small items into logical groups
- Aim for 3-15 subtasks per parent ticket (adjust based on complexity)

### 4.2 What NOT to Create as Subtasks

**RULE-SUB-ID-4: Exclusions**
- Do NOT create subtasks for:
  - Background information or context
  - Notes or comments without action items
  - Already completed items (marked as done)
  - Duplicate items across sources
  - Meta-information about the ticket itself

---

## 5. Subtask Structure Requirements

### 5.1 Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| summary | String | Yes | Clear, actionable subtask title |
| description | String | No | Detailed description of the task |

**Note:** Priority is not specified - Jira's default priority will be used for all subtasks.

### 5.2 Summary (Title) Guidelines

**RULE-SUB-TITLE-1: Format**
- **Mandatory:** Subtask titles must be:
  - Action-oriented (start with a verb)
  - Clear and descriptive
  - 5-80 characters in length
  - Specific enough to understand without reading description

**RULE-SUB-TITLE-2: Good Examples**
- "Implement user authentication API"
- "Create login form UI component"
- "Write unit tests for payment module"
- "Configure database connection pooling"
- "Review and update API documentation"

**RULE-SUB-TITLE-3: Bad Examples**
- "Task 1" (not descriptive)
- "Do the thing" (vague)
- "Authentication" (not action-oriented)
- "This is a very long title that goes on and on describing every detail of what needs to be done which makes it hard to read at a glance" (too long)

### 5.3 Description Guidelines

**RULE-SUB-DESC-1: Content**
- **Recommended:** Include in descriptions:
  - What needs to be done (details beyond the title)
  - Acceptance criteria or definition of done
  - Technical details or constraints
  - Dependencies or prerequisites
  - Reference to source (e.g., "From Confluence page: [page title]")

**RULE-SUB-DESC-2: Format**
- Use clear, concise language
- Use bullet points for multiple items
- Keep descriptions under 500 characters
- Separate paragraphs with blank lines

---

## 6. Output Format

### 6.1 JSON Schema

**RULE-SUB-OUTPUT-1: Format**
- **Mandatory:** Output must be a valid JSON array:

```json
[
  {
    "summary": "Clear, actionable subtask title",
    "description": "Detailed description of what needs to be done"
  }
]
```

### 6.2 Ordering

**RULE-SUB-OUTPUT-2: Subtask Order**
- Order subtasks by:
  1. Logical dependency (prerequisites first)
  2. Original order in source document

---

## 7. Quality Checklist

Before finalizing subtasks, verify:

- [ ] All subtasks are actionable (start with a verb)
- [ ] All subtasks are independently completable
- [ ] No duplicate subtasks exist
- [ ] Summaries are clear and descriptive (5-80 chars)
- [ ] Descriptions add value beyond the title
- [ ] Subtasks cover all major items from source data
- [ ] Output is valid JSON format
- [ ] Subtask count is reasonable (3-15 typical)

---

## 8. Examples

### 8.1 Good Subtask Example

```json
{
  "summary": "Implement JWT authentication for API endpoints",
  "description": "Add JWT token validation middleware to all protected API routes.\n\nAcceptance Criteria:\n- Tokens expire after 24 hours\n- Invalid tokens return 401 status\n- Token refresh endpoint available"
}
```

### 8.2 Extracting from Numbered List

**Source (from Confluence):**
```
Implementation Steps:
1. Set up database schema
2. Create API endpoints
3. Build frontend components
4. Write integration tests
```

**Output:**
```json
[
  {
    "summary": "Set up database schema",
    "description": "Create database tables and relationships as per specification"
  },
  {
    "summary": "Create API endpoints",
    "description": "Implement REST API endpoints for the feature"
  },
  {
    "summary": "Build frontend components",
    "description": "Create UI components for the feature"
  },
  {
    "summary": "Write integration tests",
    "description": "Create integration tests to verify end-to-end functionality"
  }
]
```

### 8.3 Extracting from Acceptance Criteria

**Source (from Jira ticket):**
```
Acceptance Criteria:
- User can log in with email/password
- User can reset password via email
- Session expires after 30 minutes of inactivity
- Failed login attempts are logged
```

**Output:**
```json
[
  {
    "summary": "Implement email/password login functionality",
    "description": "Allow users to log in using email and password credentials"
  },
  {
    "summary": "Implement password reset via email",
    "description": "Send password reset link to user's email address"
  },
  {
    "summary": "Implement session timeout after inactivity",
    "description": "Session should expire after 30 minutes of inactivity"
  },
  {
    "summary": "Implement failed login attempt logging",
    "description": "Log all failed login attempts for security monitoring"
  }
]
```

---

## 9. Special Cases

### 9.1 Test Cases as Subtasks

**RULE-SUB-SPECIAL-1: Test Cases**
- When source contains test cases, create subtasks for:
  - Each distinct test scenario (if granular subtasks needed)
  - OR grouped by test type (Functional, UI, Performance)

### 9.2 Documentation Tasks

**RULE-SUB-SPECIAL-2: Documentation**
- Create separate subtasks for documentation when:
  - Explicitly mentioned in requirements
  - API documentation is needed
  - User guides are required

### 9.3 Empty or Insufficient Data

**RULE-SUB-SPECIAL-3: Insufficient Data**
- If source data lacks clear actionable items:
  - Create a single subtask: "Review requirements and break down tasks"
  - Note in description that source data needs clarification

---

## 10. Best Practices

### 10.1 General Guidelines

- Keep subtasks focused on a single responsibility
- Use consistent naming conventions across subtasks
- Avoid technical jargon in titles (keep descriptions technical)
- Reference source documents in descriptions for traceability
- Consider the team's workflow when ordering subtasks

### 10.2 Common Patterns

- **Feature Implementation:** Setup → Backend → Frontend → Testing → Documentation
- **Bug Fix:** Investigate → Fix → Test → Deploy
- **Research:** Research → Analyze → Document → Present

---

## 11. API Subtask Ordering Rules

### 11.1 Dependency-Based Ordering

**RULE-API-ORDER-1: Logical Dependency Order**
- **Mandatory:** When a ticket contains multiple APIs, create subtasks in logical dependency order:
  - APIs that other APIs depend on come **first**
  - Authentication/registration APIs before protected resource APIs
  - Entity creation APIs before APIs that consume those entities
  - CRUD order when applicable: Create → Read → Update → Delete

**Example Ordering:**
```
1. Signup API (creates user - no dependencies)
2. Signin API (depends on user existing from Signup)
3. Dashboard API (depends on authenticated session from Signin)
```

**RULE-API-ORDER-2: Identify Dependencies**
- **Mandatory:** Look for these dependency indicators to determine order:
  - **Authentication requirements:** "requires login", "requires token", "authenticated users only"
  - **Data requirements:** "requires user to exist", "needs entity ID", "depends on [entity]"
  - **Workflow sequences:** Steps mentioned in requirements flow
  - **Temporal language:** "after", "once", "then", "following", "next"
  - **Prerequisite mentions:** "prerequisite", "depends on", "requires"

**Dependency Detection Examples:**

| API Mention | Dependency Indicator | Order Position |
|-------------|---------------------|----------------|
| Signup API | "Creates new user" | 1st (no dependency) |
| Signin API | "User must exist" | 2nd (depends on Signup) |
| Profile API | "Requires authentication" | 3rd (depends on Signin) |
| Dashboard API | "Shows user data" | 4th (depends on Profile/Signin) |

### 11.2 API Subtask Naming

**RULE-API-ORDER-3: Include Dependency in Description**
- When creating API subtasks, include dependency information in the description:
  - Note which APIs must be completed first
  - Mention data dependencies explicitly

**Example:**
```json
{
  "summary": "Implement Dashboard API endpoint",
  "description": "Create GET /api/dashboard endpoint.\n\nDepends on: Signin API (requires authenticated session)"
}
```

---

## 12. Difficulty-Based Subdivision Rules

### 12.1 High Difficulty Identification

**RULE-SUB-DIFFICULTY-1: Identify High Difficulty Subtasks**
- **Mandatory:** Assess each potential subtask for difficulty level based on:

| Indicator | Description | Action |
|-----------|-------------|--------|
| Multiple endpoints | Task involves 2+ API endpoints | Subdivide |
| Complex business logic | Validation, calculations, workflows | Subdivide |
| Multiple integrations | External services, databases, queues | Subdivide |
| Estimated effort > 8 hours | Large scope of work | Subdivide |
| Keywords present | "complex", "multiple", "integration", "full flow", "complete" | Subdivide |

### 12.2 Subdivision Guidelines

**RULE-SUB-DIFFICULTY-2: How to Subdivide**
- **Mandatory:** When difficulty is too high, subdivide the subtask:
  - Break into **2-4 smaller, focused subtasks**
  - Each sub-subtask should be completable in **2-4 hours**
  - Maintain dependency order within subdivisions
  - Each subdivision must be independently testable

**Subdivision Patterns:**

| Original Task Type | Subdivision Pattern |
|-------------------|---------------------|
| "Implement complete [feature] flow" | Schema/Models → API Endpoint → Business Logic → Tests |
| "Full CRUD for [entity]" | Create → Read → Update → Delete |
| "Integration with [service]" | Setup/Config → Implementation → Error Handling → Tests |
| "Complex validation" | Schema Definition → Validation Rules → Error Messages → Tests |

### 12.3 Subdivision Examples

**Example 1: High Difficulty Task**

Before (Too Complex):
```json
{
  "summary": "Implement complete user registration flow",
  "description": "Full registration with validation, email verification, and profile creation"
}
```

After (Subdivided):
```json
[
  {
    "summary": "Create user validation schema",
    "description": "Define validation rules for user registration fields (email, password, name)"
  },
  {
    "summary": "Implement Signup API endpoint",
    "description": "Create POST /api/signup endpoint with validation"
  },
  {
    "summary": "Add email verification logic",
    "description": "Implement email sending and verification token handling"
  },
  {
    "summary": "Write unit tests for registration",
    "description": "Create tests for signup endpoint and validation"
  }
]
```

**Example 2: Multiple API Task**

Before (Multiple APIs in one):
```json
{
  "summary": "Implement user authentication APIs",
  "description": "Create signup, signin, and password reset APIs"
}
```

After (Subdivided by API with correct order):
```json
[
  {
    "summary": "Implement Signup API endpoint",
    "description": "Create POST /api/signup for user registration"
  },
  {
    "summary": "Implement Signin API endpoint",
    "description": "Create POST /api/signin for authentication.\n\nDepends on: Signup API"
  },
  {
    "summary": "Implement Password Reset API endpoint",
    "description": "Create POST /api/password-reset for password recovery.\n\nDepends on: Signup API (user must exist)"
  }
]
```

---

**Document End**

*These rules are guidelines to ensure high-quality subtask generation. Apply judgment based on specific context and requirements.*
