# Jira MCP Server

This is a Model Context Protocol (MCP) server for fetching Jira tickets, linked issues, attachments, and Confluence pages.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Jira Credentials

You need to set up your Jira credentials. You can do this in two ways:

#### Option A: Using a `.env` file (Recommended)

Create a `.env` file in the project root with the following content:

```env
Jira_DOMAIN=yourcompany.atlassian.net
Jira_EMAIL=your.email@example.com
Jira_API_TOKEN=your_api_token_here
```

#### Option B: Using System Environment Variables

Set the following environment variables in your system:
- `Jira_DOMAIN` - Your Jira domain (e.g., yourcompany.atlassian.net)
- `Jira_EMAIL` - Your Jira email address
- `Jira_API_TOKEN` - Your Jira API token

### 3. Generate a Jira API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a label (e.g., "MCP Server")
4. Copy the generated token and use it as `Jira_API_TOKEN`

## Usage

The server runs as an MCP server over stdio. It provides a `fetchTicketBundle` tool that fetches:
- The main Jira ticket
- Linked issues
- Attachments (as base64 encoded data)
- Related Confluence pages

## Tools

### fetchTicketBundle

Fetches a complete Jira ticket bundle including linked issues, attachments, and Confluence pages.

**Parameters:**
- `ticket` (string, required): The Jira ticket ID (e.g., "PROJ-123")

**Returns:**
- `root`: The main Jira ticket object
- `linked`: Array of linked Jira issues
- `attachments`: Array of attachments with base64 encoded content
- `confluence`: Array of related Confluence pages

**Example Usage:**

In Cursor, you can call the MCP tool directly:

```
/tool fetchTicketBundle {"ticket": "DEV-26921"}
```

Or use the command:

```
@fetch-jira DEV-26921
```

The fetched data will be saved to `staging/aggregated.json`.

## Workflow: Generating Documentation

This project provides a complete workflow for generating SRS documents, UI specifications, and test cases from Jira tickets.

### Step 1: Fetch Jira Ticket Data

First, fetch the Jira ticket bundle:

```
/tool fetchTicketBundle {"ticket": "DEV-26921"}
```

Or use the command:

```
@fetch-jira DEV-26921
```

This creates `staging/aggregated.json` with all ticket data, linked issues, attachments, and Confluence pages.

### Step 2: Generate SRS Document

Generate a Software Requirements Specification (SRS) document:

```
@generate_srs
```

**Data Sources:**
- **Primary Source (Required):** `staging/aggregated.json` - Jira ticket data (root ticket, linked tickets, attachments, Confluence pages)
- **Implementation Source (Recommended):** Source code files (e.g., `TestTaker.js`) - Contains actual implementation code where changes were made
- **Reference Source (Optional):** Documentation context files from `context/` folder for formatting and structure

**How It Works:**
1. The system **always reads** `staging/aggregated.json` to extract all requirements, features, and details from the Jira ticket
2. **If source code file is provided** (e.g., `TestTaker.js`), it is **analyzed along with the Jira ticket** to:
   - Understand what was actually implemented
   - Verify implementation matches requirements
   - Extract exact implementation details, functions, and behavior
3. Documentation context files are used as **reference only** for:
   - Document structure and formatting
   - Existing documentation style
   - Project conventions and patterns

**Using Context Files (Optional):**

You can use documentation files, source code files, or both as reference:

**Using Documentation Context:**
```
Generate SRS using testtaker.md from context
```

Or with full path:
```
Generate SRS document using @context/Document/SRS/CJS+Test-Taker/SRS_CJS_Test_Taker_Page.md
```

**Using Source Code Context:**
```
Generate SRS document for DEV-26921 using @context/copernicusjs/frontend/src/views/TestTaker.js
```

**Using Multiple Context Files:**
```
Generate SRS document for DEV-26921 using:
- @context/copernicusjs/frontend/src/views/TestTaker.js
- @context/Document/SRS/CJS+Test-Taker/SRS_CJS_Test_Taker_Page.md
```

**Available Context Files:**
- **Documentation:**
  - `context/Document/testtaker.md` - Test Taker page context
  - `context/Document/SRS/CJS+Home/SRS_CJS_Home_Page.md` - CJS Home Page SRS template
  - `context/Document/SRS/CJS+Test-Taker/SRS_CJS_Test_Taker_Page.md` - CJS Test Taker Page SRS template
  - `context/Document/SRS/CJS+Home/UI_Specification_CJS_Home_Page.md` - CJS Home Page UI template
  - `context/Document/SRS/CJS+Test-Taker/UI_Specification_CJS_Test_Taker_Page.md` - CJS Test Taker Page UI template
- **Source Code:**
  - `context/copernicusjs/frontend/src/views/TestTaker.js` - Test Taker React component (for DEV-26921 and similar tickets)
  - Other source code files as needed

**Default Behavior:**
- If no context file is specified, the system will look for `context/srs_template.md` (if it exists)
- If no template is found, it will generate the SRS from scratch using **only the Jira ticket JSON data**

**Important:** 
- The SRS content (requirements, features, details) always comes from the Jira ticket JSON
- Source code files (like `TestTaker.js`) are analyzed alongside the Jira ticket to understand actual implementation
- Documentation context files only influence formatting, structure, and provide additional reference information

The SRS document will be saved to `staging/srs.md`.

### Step 3: Generate UI Specification Document

Generate a UI Specification document (requires SRS to be generated first):

```
@generate_ui
```

**Data Sources:**
- **Primary Source (Required):** `staging/aggregated.json` - Jira ticket data (especially screenshots and UI-related information)
- **Implementation Source (Recommended):** Source code files (e.g., `TestTaker.js`) - Contains actual UI implementation code
- **Reference Source (Optional):** Documentation context files from `context/` folder for formatting and structure

**How It Works:**
1. The system **always reads** `staging/aggregated.json` to extract UI elements from screenshots, ticket descriptions, and attachments
2. **If source code file is provided** (e.g., `TestTaker.js`), it is **analyzed along with the Jira ticket** to understand actual UI implementation
3. Documentation context files are used as **reference only** for document structure and formatting

**Using Context Files (Optional):**

**Using Documentation Context:**
```
Generate UI document using UI_Specification_CJS_Test_Taker_Page.md from context
```

Or with full path:
```
Generate UI document using @context/Document/SRS/CJS+Test-Taker/UI_Specification_CJS_Test_Taker_Page.md
```

**Using Source Code Context:**
```
Generate UI document for DEV-26921 using @context/copernicusjs/frontend/src/views/TestTaker.js
```

**Using Multiple Context Files:**
```
Generate UI document for DEV-26921 using:
- @context/copernicusjs/frontend/src/views/TestTaker.js
- @context/Document/SRS/CJS+Test-Taker/UI_Specification_CJS_Test_Taker_Page.md
```

**Important:** 
- UI elements and details are extracted from screenshots and ticket data in `staging/aggregated.json`
- Source code files (like `TestTaker.js`) are analyzed alongside to understand actual UI implementation
- Documentation context files only provide formatting reference

The UI document will be saved to `staging/ui_document.md`.

### Step 4: Generate Test Cases

Generate test cases in JSON format (requires both SRS and UI documents):

```
@generate_tests
```

**Data Sources:**
- **Primary Source (Required):** 
  - `staging/aggregated.json` - Jira ticket data (test scenarios, acceptance criteria, etc.)
  - `staging/srs.md` - Generated SRS document (functional requirements)
  - `staging/ui_document.md` - Generated UI document (UI elements and interactions)
- **Implementation Source (Recommended):** Source code files (e.g., `TestTaker.js`) - Contains actual implementation code
- **Reference Source (Optional):** Documentation context files from `context/` folder for additional context

**How It Works:**
1. The system **always reads** `staging/aggregated.json`, `staging/srs.md`, and `staging/ui_document.md` to generate test cases
2. **If source code file is provided** (e.g., `TestTaker.js`), it is **analyzed along with the data** to understand actual implementation and generate accurate test cases
3. Documentation context files are used as **reference only** for additional context or formatting

**Using Context Files (Optional):**

**Using Documentation Context:**
```
Generate test cases using testtaker.md from context
```

**Using Source Code Context:**
```
Generate test cases for DEV-26921 using @context/copernicusjs/frontend/src/views/TestTaker.js
```

**Using Multiple Context Files (Recommended):**
```
Generate test cases for DEV-26921 using:
- @context/copernicusjs/frontend/src/views/TestTaker.js (for code implementation details)
- @context/Document/SRS/CJS+Test-Taker/SRS_CJS_Test_Taker_Page.md (for requirements context)
- @context/Document/testtaker.md (for general context)
```

**Important:** 
- Test cases are generated from the Jira ticket data, SRS, and UI documents
- Source code files (like `TestTaker.js`) are analyzed alongside to understand actual implementation and generate accurate test cases
- Documentation context files provide additional reference but are not the primary source

The test cases will be saved to `staging/test_cases.json`.

### Step 5: Generate Test Cases CSV

Convert test cases from JSON format to CSV format:

```
@generate_tests_csv
```

Or use the command:

```
Generate CSV from test cases
```

**Prerequisites:**
- Test cases must be generated first (Step 4) and saved to `staging/test_cases.json`

**What it does:**
- Reads test cases from `staging/test_cases.json` (or `staging/test_cases.md` if JSON is not available)
- Converts test cases to CSV format with proper formatting
- Handles multiline fields (Testing Steps) with newlines preserved
- Properly escapes commas, quotes, and special characters
- Saves the CSV file to `staging/test_cases.csv`

**CSV Format:**
The CSV file includes the following columns:
- Serial no
- Title
- Test Type
- Preconditions
- Testing Steps (with newlines preserved)
- Expected Result
- Created
- Reviewer

**CSV File Location:**
The generated CSV file will be saved to `staging/test_cases.csv` and can be opened in Excel, Google Sheets, or any spreadsheet application.

### Step 6: Post Test Cases to Jira as Comments

Post test cases from `staging/test_cases.json` as comments to a Jira ticket:

```
@post_testcases_to_jira DEV-26921
```

Or use the MCP tool directly:

```
/tool postTestCasesToJira {"ticket": "DEV-26921"}
```

**Prerequisites:**
- Test cases must be generated first (Step 4) and saved to `staging/test_cases.json`
- Jira credentials must be configured (see Setup section)

**What it does:**
- Reads test cases from `staging/test_cases.json`
- Combines all test cases into a single formatted comment with:
  - Test Cases Summary header with total count
  - Each test case formatted with:
    - Test Case Title
    - Serial No
    - Test Type
    - Priority
    - Preconditions
    - Testing Steps
    - Expected Result
  - Clear separators between test cases
- Posts all test cases as a single combined comment to the specified Jira ticket

**Output:**
- All test cases are posted as a single combined comment on the Jira ticket
- Returns a summary with:
  - Total number of test cases posted
  - Success status
  - Comment ID of the posted comment

**Example Usage:**

```
@post_testcases_to_jira DEV-26921
```

This will post all test cases from `staging/test_cases.json` as a single combined comment to ticket DEV-26921.

### Step 7: Push Test Cases to TestRail

Push test cases from `staging/test_cases.json` to TestRail:

```
@push_to_testrail <sectionId>
```

Or use the MCP tool directly:

```
/tool pushTestRail {"sectionId": "123"}
```

**Prerequisites:**
- Test cases must be generated first (Step 4) and saved to `staging/test_cases.json`
- TestRail credentials must be configured in environment variables:
  - `TESTRAIL_URL` - Your TestRail instance URL (e.g., https://yourcompany.testrail.io)
  - `TESTRAIL_USERNAME` or `TESTRAIL_EMAIL` - Your TestRail username or email
  - `TESTRAIL_API_KEY` - Your TestRail API key
- You need the TestRail section ID where you want to push the test cases

**What it does:**
- Reads test cases from `staging/test_cases.json`
- Maps test case fields to TestRail format:
  - `title` → Test case title
  - `test_type` → TestRail type_id (Functional, Regression, etc.)
  - `priority_id` → TestRail priority_id (1=Low, 2=Medium, 3=High)
  - `serial_no` → TestRail refs field (formatted as AUTO-{serial_no})
  - `preconditions` → TestRail custom_preconds field
  - `testing_steps` → TestRail custom_steps field (formatted as text)
  - `expected_result` → TestRail custom_expected field
- Creates test cases in the specified TestRail section
- Returns a summary with success/failure counts and created case IDs

**TestRail Configuration:**

Add the following to your `.env` file:

```env
TESTRAIL_URL=https://yourcompany.testrail.io
TESTRAIL_USERNAME=your.email@example.com
TESTRAIL_API_KEY=your_api_key_here
```

Or set them as system environment variables.

**Getting TestRail API Key:**
1. Log in to your TestRail instance
2. Go to User Settings → API & Integrations
3. Generate or copy your API key

**Getting TestRail Section ID:**
1. Navigate to the test suite/section in TestRail where you want to add test cases
2. The section ID is in the URL: `https://yourcompany.testrail.io/index.php?/cases/section/{sectionId}`
3. Or use TestRail's API to list sections

**Output:**
- Returns a summary with:
  - Number of successfully created test cases
  - Number of failed test cases
  - Section ID used
  - List of created case IDs (e.g., C123, C124, C125)
- Failed cases will have error details in the console logs

**Example Usage:**

```
@push_to_testrail 123
```

This will push all test cases from `staging/test_cases.json` to TestRail section 123.

**Note:** If `TESTRAIL_SECTION_ID` is set in your environment variables, you can omit the sectionId parameter:

```
@push_to_testrail
```

### Complete Workflow (All Steps)

You can run all steps in sequence using:

```
@generate_all DEV-26921
```

This will:
1. Fetch the Jira ticket (`fetch-jira`)
2. Generate SRS document (`generate_srs`)
3. Generate UI document (`generate_ui`)
4. Generate test cases (`generate_tests`)
5. Generate test cases CSV (`generate_tests_csv`)

**Note:** The CSV generation step is optional and can be run separately after test cases are generated.

**Additional Steps (Optional):**

After generating test cases, you can:

6. **Post test cases to Jira as comments:**
   ```
   @post_testcases_to_jira DEV-26921
   ```

7. **Push test cases to TestRail:**
   ```
   @push_to_testrail <sectionId>
   ```

These steps require the test cases to be generated first and saved to `staging/test_cases.json`.

## Context Files Usage

**Important:** All documents (SRS, UI, Test Cases) are **always generated from the Jira ticket data** stored in `staging/aggregated.json`. However, context files serve different purposes:

### Primary Data Source
- The Jira ticket JSON (`staging/aggregated.json`) is the **primary and mandatory source** for all generated documents
- This JSON contains: root ticket, linked tickets, attachments, and Confluence pages
- All requirements, features, and details are extracted from this JSON data

### Types of Context Files and Their Roles

#### 1. **Source Code Files** (JavaScript, TypeScript, etc.) - **Implementation Analysis**
   - **Purpose:** Analyze actual implementation alongside Jira ticket data
   - **Role:** These files contain the code where changes were implemented
   - **Usage:** Should be analyzed together with Jira ticket to understand:
     - What was actually implemented vs what was requested
     - Exact implementation details, functions, and behavior
     - Code structure and patterns
   - **Examples:**
     - `context/copernicusjs/frontend/src/views/TestTaker.js` - Contains actual implementation for DEV-26921
     - React components, view files, utility functions
   - **Important:** Source code files are analyzed as part of the data, not just formatting reference

#### 2. **Documentation Files** (Markdown) - **Formatting and Structure Reference**
   - **Purpose:** Provide formatting templates and structure reference
   - **Role:** Used for maintaining consistency with existing documentation style
   - **Usage:** Reference only for:
     - Document structure and formatting
     - Existing documentation style
     - Project conventions and patterns
   - **Examples:**
     - SRS documents
     - UI specifications
     - Test case templates
     - General documentation

#### 3. **Configuration Files** - **Reference Material**
   - **Purpose:** Provide additional reference information
   - **Role:** Reference for configuration patterns and mappings
   - **Examples:**
     - Configuration templates
     - Mapping files
     - Other config files

### Key Distinction

**Source Code Files (e.g., TestTaker.js):**
- **Analyzed along with Jira ticket** to understand actual implementation
- Contains the code where changes were made
- Used to verify what was implemented matches requirements
- Part of the data analysis process

**Documentation Files:**
- **Reference only** for formatting and structure
- Do not replace Jira ticket data
- Used to maintain documentation consistency

### How to Specify Context Files

When generating documents, you can specify a context file in your instruction using the `@context/` prefix:

**For SRS Generation with Documentation Context:**
```
Generate SRS document using @context/Document/SRS/CJS+Test-Taker/SRS_CJS_Test_Taker_Page.md
```

**For SRS Generation with Source Code Context:**
```
Generate SRS document for DEV-26921 using @context/copernicusjs/frontend/src/views/TestTaker.js
```

**For UI Generation:**
```
Generate UI document using @context/Document/SRS/CJS+Test-Taker/UI_Specification_CJS_Test_Taker_Page.md
```

**For Test Cases with Multiple Context Files:**
```
Generate test cases for DEV-26921 using:
- @context/copernicusjs/frontend/src/views/TestTaker.js (for code context)
- @context/Document/SRS/CJS+Test-Taker/SRS_CJS_Test_Taker_Page.md (for SRS context)
```

**Using Short Form (from context folder):**
```
Generate SRS document using testtaker.md from context 
```

### Examples of Context File Usage

**Example 1: Using JS Code File for Ticket DEV-26921**
```
Generate SRS document for DEV-26921 using @context/copernicusjs/frontend/src/views/TestTaker.js
```

This will:
- **Primary:** Read `staging/aggregated.json` (Jira ticket data) to extract all requirements and features
- **Implementation Analysis:** Analyze TestTaker.js source code alongside the Jira ticket to understand:
  - What was actually implemented in the code
  - Exact functions, components, and behavior
  - How the implementation matches (or differs from) the requirements
- Generate SRS that reflects both the Jira ticket requirements AND the actual implementation
- Ensure requirements accurately describe what was implemented in the code

**Example 2: Using SRS Template for Documentation**
```
Generate SRS document using @context/Document/SRS/CJS+Test-Taker/SRS_CJS_Test_Taker_Page.md
```

This will:
- **Primary:** Read `staging/aggregated.json` (Jira ticket data) to extract all requirements and features
- **Reference:** Use the existing SRS as a template for formatting and structure
- Maintain consistency with existing documentation style
- Generate new SRS following the same format while content comes from Jira ticket data

**Example 3: Combining Multiple Context Files**
```
Generate test cases for DEV-26921 using:
- @context/copernicusjs/frontend/src/views/TestTaker.js
- @context/Document/SRS/CJS+Test-Taker/SRS_CJS_Test_Taker_Page.md
- @context/Document/testtaker.md
```

This will:
- **Primary:** Read `staging/aggregated.json`, `staging/srs.md`, and `staging/ui_document.md` to generate test cases
- **Implementation Analysis:** Analyze TestTaker.js source code alongside the data to understand actual implementation and generate accurate test cases
- **Reference:** Use SRS template and general documentation for formatting and additional context
- Generate comprehensive test cases covering all aspects from the primary sources, enhanced by actual implementation analysis and context file references

### Context File Structure

The `context/` folder contains:
- `Document/` - Documentation files
  - `testtaker.md` - General test taker context
  - `SRS/` - SRS templates and examples
    - `CJS+Home/` - CJS Home Page documentation
    - `CJS+Test-Taker/` - CJS Test Taker Page documentation
  - `Mapping/` - Traceability matrices and mappings
- `copernicusjs/` - Source code files
  - `frontend/src/views/TestTaker.js` - Test Taker React component
  - Other source code files as needed
- `TestCases/` - Test case examples and templates

### Best Practices

1. **Always fetch the ticket first** before generating any documents
2. **Use context files** when you have existing documentation to maintain consistency
3. **Generate documents in order**: SRS → UI → Test Cases (each depends on the previous)
4. **Review generated documents** and update context files if needed for future use

