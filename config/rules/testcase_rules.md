# Test Case Creation Rules and Guidelines

**Document ID:** TC-RULES-001  
**Document Version:** 1.0  
**Last Updated:** 2025-01-28  
**Author:** Kshitij  
**Description:** Comprehensive rules for CJS application test case creation

---

## YAML Metadata Format

This document defines the standardized rules for creating manual test cases for the CJS application.

```yaml
metadata:
  version: "1.0"
  last_updated: "2025-01-28"
  author: "Test Team"
  description: "Comprehensive rules for CJS application test case creation"

file_organization:
  folder_structure: "TestCases/[Feature_Folder]"
  naming_convention: "[Feature_Name]_Test_Cases.[extension]"
  supported_formats:
    - "CSV"
    - "MD" 
    - "XLSX"
  primary_format: "MD"
  test_case_files:
    - "combinedtestcase.md" - All test cases
    - "regression.md" - Regression test cases
    - "sanity.md" - Sanity test cases
```

---

## Metadata

- **Version:** 1.0
- **Last Updated:** 2025-01-28
- **Author:** Test Team
- **Description:** Comprehensive rules for CJS application test case creation

---

## File Organization

### Folder Structure
- **Main Folder:** `TestCases/[Feature_Folder]/`
  - Each feature/module should have its own subfolder (e.g., `CJS+Home/`, `CJS+TT/`)
  - Rules are independent and apply to all subfolders
- **Test Case Files (per feature folder):**
  - `combinedtestcase.md` - All test cases for the feature
  - `regression.md` - Regression test cases for the feature
  - `sanity.md` - Sanity test cases for the feature

### Naming Convention
- **Format:** `[Feature_Name]_Test_Cases.[extension]`
- **Supported Formats:**
  - CSV
  - MD (Markdown)
  - XLSX
- **Primary Format:** MD (Markdown)

---

## Test Case Structure

### Required Fields

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| Serial no | Integer | Sequential numbering (1, 2, 3...) | Yes |
| Title | String | Clear, descriptive test case name | Yes |
| Test Type | Enum | One of: Functional, Negative, UI/UX, Performance, Compatibility, Accessibility, Security, Error Handling | Yes |
| Preconditions | String | Prerequisites before test execution | Yes |
| Testing Steps | String | Detailed step-by-step instructions | Yes |
| Expected Result | String | Clear expected outcome | Yes |
| Created | String | Date/Author | No |
| Reviewer | String | Review status | No |

---

## Naming Conventions

### Test Case Titles
- **Format:** Action-oriented, descriptive
- **Good Examples:**
  - "Connect and New Test Taker Button Functionality"
  - "Environment Configuration Testing"
  - "CJS Home Page Load and Display"
  - "Local Environment Selection for TURN/STUN Credentials"
- **Bad Examples:**
  - "Test 1"
  - "Button Test"
  - "Check functionality"
  - "Verify"

### UI Elements
- **Format:** Exact text in quotes
- **Good Examples:**
  - "Click 'Connect' button"
  - "Verify 'Developers Info' title"
  - "Check 'Kurento Status' indicator"
  - "Enter 'Media Server URL' field"
- **Bad Examples:**
  - "Click the button"
  - "Check the title"
  - "Verify status"
  - "Enter URL"

---

## Test Type Classification

### Functional
- **Description:** Core application functionality
- **Examples:**
  - Button clicks
  - Form submissions
  - Navigation
  - Environment selection
  - Connection establishment

### Negative
- **Description:** Error handling, invalid inputs
- **Examples:**
  - Invalid credentials
  - Empty fields
  - Invalid URLs
  - Wrong format inputs

### UI/UX
- **Description:** User interface and user experience
- **Examples:**
  - Button states
  - Form interactions
  - Visual design
  - Layout verification
  - Theme display

### Performance
- **Description:** Load time, memory usage, response time
- **Examples:**
  - Page load time
  - Memory usage
  - Resource loading
  - Environment switching speed

### Compatibility
- **Description:** Cross-browser, cross-platform
- **Examples:**
  - Browser compatibility (Chrome, Firefox, Edge, Safari)
  - Device testing (Desktop only)
  - Platform testing (Windows, macOS, Linux)

### Accessibility
- **Description:** Screen readers, keyboard navigation
- **Examples:**
  - Keyboard navigation
  - Tab order
  - Focus indicators
  - Color contrast

### Security
- **Description:** Authentication, data protection
- **Examples:**
  - Password display (plain text for internal tool)
  - Session management
  - Input sanitization

### Error Handling
- **Description:** Exception scenarios
- **Examples:**
  - Network errors
  - Timeout handling
  - Connection failures
  - Invalid server responses

---

## Preconditions Guidelines

### Requirements
- List all necessary setup steps
- Include browser state, data requirements
- Be specific about environment needs
- Mention any prerequisites clearly

### Good Examples
- "[Feature] page should be loaded with valid credentials"
- "Browser should be open (Chrome preferred)"
- "[Feature] page should be loaded with successful connection established"
- "Staging environment should be configured"
- "User should be logged in"

### Bad Examples
- "System ready"
- "Setup complete"
- "Environment configured"
- "Page loaded"

---

## Testing Steps Format

### Structure Requirements
- Use numbered steps (1, 2, 3...)
- Be specific and actionable
- Include verification points
- Use clear, imperative language
- Include UI element references in quotes
- Maximum 12 steps per test case
- Recommended 6-8 steps

### Good Examples
- "1. Click 'Connect' button"
- "2. Verify 'Developers Info' title appears after clicking Connect"
- "3. Click 'Show' button to open Developers Info in new window tab"
- "4. Verify Developers Info popup opens in new tab with Media Server URL and Kurento Status"
- "5. Configure Turn/Stun Credentials (select 'Staging' button)"
- "6. Configure Connect to Media Server (select 'Staging' button)"

### Bad Examples
- "1. Test the button"
- "2. Check if it works"
- "3. Verify functionality"
- "1. Click button"
- "2. Check result"

---

## Expected Results Guidelines

### Requirements
- Be specific and measurable
- Include UI state changes
- Mention error messages when applicable
- Cover all verification points from steps
- Describe complete expected behavior

### Good Examples
- "Connect button should process the connection, show loading state, update Kurento Status to green if successful, and display 'Developers Info' title"
- "Show button should open Developers Info popup in new window tab with Media Server URL and Kurento Status"
- "New Test Taker button should open new test taker page in a new tab"
- "'Local' button should be highlighted. All three TURN/STUN credential fields should be automatically populated with Local environment values. Password field should display plain text (not masked with asterisks). Fields should be editable."

### Bad Examples
- "Button should work"
- "Popup should open"
- "Status should change"
- "Fields should populate"
- "It should work correctly"

---

## Combination Rules

### Combine When
- Actions are sequential and dependent
- They test the same user workflow
- They share common preconditions
- They test related UI components
- They form a complete user journey

### Keep Separate When
- Testing different user roles
- Testing different error scenarios
- Testing different environments independently
- Testing different system components
- Testing different test types (Functional vs Negative)

### Examples

**Combined:**
- **Title:** "Connect and New Test Taker Button Functionality"
- **Reason:** Sequential workflow: Connect → Developers Info → New Test Taker
- **Steps:** Multiple related actions in one test case

**Separate:**
- **Title:** "Invalid Credentials Connection Attempt"
- **Reason:** Different error scenario, different expected results
- **Steps:** Focused on negative testing

---

## UI Element Standards

### Requirements
- Use exact text from UI in quotes
- Include button labels, field names, titles
- Reference panel names and sections
- Use consistent terminology

### Examples
- **Buttons:** "Click 'Connect' button"
- **Panels:** "Verify 'Turn/Stun Credentials' section"
- **Indicators:** "Check 'Kurento Status' indicator"
- **Fields:** "Enter 'Media Server URL' field"
- **Sections:** "Verify 'Developers Info' section appears"

---

## Environment Testing

### Requirements
- Test all available environments
- Include environment-specific validations
- Test environment switching
- Verify environment-specific data population

### Environments
- Environment testing should cover all available environments for the feature
- Examples (feature-specific):
  - **TURN/STUN Credentials:** Local, Staging, DevApps
  - **Media Server Connection:** Local Copernicus, Staging, DevApp
  - **Application Environments:** Development, Staging, Production
- Note any deprecated environments and mark them appropriately

### Environment-Specific Test Cases
- Each environment should have dedicated test cases
- Test environment switching between different environments
- Verify correct values populate for each environment
- Test connection with each environment

---

## Popup Window Testing

### Requirements
- Test popup appearance and content
- Verify new window/tab opening
- Test popup interactions
- Include popup closure verification

### Examples
- "Verify 'Developers Info' popup opens in new tab"
- "Check popup contains Media Server URL and Kurento Status"
- "Test popup can be closed"
- "Verify popup displays correct information"

---

## Data Validation

### Test Scenarios
- Valid data
- Invalid data
- Empty fields
- Boundary values
- Special characters
- Format validation

### Examples
- **Valid:** "Enter valid staging credentials"
- **Invalid:** "Enter invalid URL format"
- **Empty:** "Clear all input fields"
- **Boundary:** "Enter maximum field length"
- **Format:** "Enter URL in correct format"

---

## Quality Checklist

### Before Finalizing
- [ ] All steps are clear and actionable
- [ ] Expected results match the steps
- [ ] Preconditions are complete
- [ ] UI elements are referenced correctly
- [ ] Test case covers the complete workflow
- [ ] Related functionality is combined appropriately
- [ ] Test case is not too complex (max 10-12 steps)
- [ ] Test case can be executed independently
- [ ] Test case title is descriptive
- [ ] Steps are in logical order

### Review Criteria
- [ ] Test case title is descriptive
- [ ] Steps are in logical order
- [ ] All UI interactions are specified
- [ ] Expected results are comprehensive
- [ ] Test case is maintainable
- [ ] Test case follows naming conventions
- [ ] Test type is correctly classified
- [ ] Preconditions are specific and complete

---

## Best Practices

### General
- One test case per major functionality (unless combining related actions)
- Clear, step-by-step instructions that anyone can follow
- Specific UI element references using exact text
- Comprehensive expected results covering all verification points
- Logical test case organization by feature or workflow
- Consistent formatting across all test cases
- Regular review and updates to maintain accuracy

### Complexity Limits
- **Max Steps:** 12
- **Max Verification Points:** 8
- **Recommended Steps:** 6-8
- **Keep test cases focused and maintainable**

### Maintenance
- Update test cases when UI changes
- Review and update test cases quarterly
- Remove obsolete test cases
- Add new test cases for new features
- Keep test cases focused and maintainable
- Document deprecated features

---

## Examples

### Good Test Case

**Title:** "Connect and New Test Taker Button Functionality"

**Test Type:** Functional

**Preconditions:** "CJS Home Page should be loaded with valid credentials"

**Testing Steps:**
1. Configure Turn/Stun Credentials (select "Staging" button)
2. Configure Connect to Media Server (select "Staging" button)
3. Click "Connect" button
4. Verify "Developers Info" title appears after clicking Connect
5. Click "Show" button to open Developers Info in new window tab
6. Verify Developers Info popup opens in new tab with Media Server URL and Kurento Status
7. Click "New Test Taker" button
8. Verify new test taker page tab is opened

**Expected Result:** "Connect button should process the connection, show loading state, update Kurento Status to green if successful, and display 'Developers Info' title. Show button should open Developers Info popup in new window tab with Media Server URL and Kurento Status. New Test Taker button should open new test taker page in a new tab"

---

### Environment Testing Example

**Title:** "Environment Configuration Testing"

**Test Type:** Functional

**Preconditions:** "CJS Home Page should be loaded"

**Testing Steps:**
1. Test Staging Environment:
   - Click "Staging" button under Turn/Stun Credentials
   - Click "Staging" button under Connect to Media Server
   - Verify field values are populated with staging environment values
   - Verify Kurento Status turns green
2. Test Local Environment:
   - Click "Local" button under Turn/Stun Credentials
   - Click "Local Copernicus" button under Connect to Media Server
   - Verify field values are populated with local environment values

**Expected Result:** "All environment buttons should populate their respective input fields with correct environment-specific values. Staging environment should show green Kurento Status when connected, while Local and DevApps environments should populate fields with their respective configuration values"

---

## Test Case Distribution

### Regression Test Cases
- **Focus:** Critical functionality that must work in every release
- **Test Type Priority:** Primarily Functional test cases
- **Step Combination:** Steps should be combined when actions are sequential and dependent
- **Core Workflows:** User journeys and integration scenarios
- **High-Priority Features:** Essential functionality that impacts core business processes
- **Format:** Follow CSV structure (implemented as MD table)
- **Example:** "Connect and New Test Taker Button Functionality" - combines Connect → Developers Info → New Test Taker workflow

### Sanity Test Cases
- **Focus:** Quick verification of critical paths
- **Test Type Priority:** Primarily Functional test cases
- **Step Combination:** Steps should be combined for quick execution
- **Essential Functionality:** Minimum viable functionality checks
- **Smoke Tests:** Major features verification
- **Format:** Follow CSV structure (implemented as MD table)
- **Execution Time:** Should be quick (5-10 minutes total)

### Combined Test Cases
- All test cases including:
  - Functional tests
  - Negative tests
  - UI/UX tests
  - Performance tests
  - Compatibility tests
  - Accessibility tests
  - Security tests
  - Error handling tests

---

## Regression and Sanity Test Case Rules

### Primary Focus
- **Regression and Sanity test cases should focus MAJORLY on Functional test cases**
- Steps should be combined when they test sequential and dependent actions
- Follow the combination rules: combine when actions are sequential and dependent, they test the same user workflow, they share common preconditions, or they test related UI components

### Step Combination Guidelines for Regression/Sanity

#### Combine Steps When:
- Actions are sequential and dependent (e.g., Connect → Developers Info → New Test Taker)
- They test the same user workflow
- They share common preconditions
- They test related UI components

#### Example of Combined Steps:
```
Testing Steps:
1. Configure Turn/Stun Credentials (Staging)
2. Configure Connect to Media Server (Staging)
3. Click 'Connect' button
4. Verify 'Developers Info' title appears after clicking Connect
5. Click 'Show' button to open Developers Info in new window tab
6. Verify Developers Info popup opens in new tab with Media Server URL and Kurento Status
7. Click 'New Test Taker' button
8. Verify new test taker page tab is opened
```

#### Example of Environment Testing with Combined Steps:
```
Testing Steps:
1. Test Staging Environment:
   - Click 'Staging' button under Turn/Stun Credentials
   - Click 'Staging' button under Connect to Media Server
   - Verify field values are populated with staging environment values
   - Verify Kurento Status turns green
2. Test Local Environment:
   - Click 'Local' button under Turn/Stun Credentials
   - Click 'Local Copernicus' button under Connect to Media Server
   - Verify field values are populated with local environment values
```

### CSV Format Structure (Implemented as MD Table)

The test case structure follows CSV format requirements but is implemented as Markdown tables:

| Serial no | Title | Test Type | Preconditions | Testing Steps | Expected Result | Created | Reviewer |
|-----------|-------|-----------|---------------|---------------|-----------------|---------|----------|

**Field Requirements:**
- **Serial no:** Integer - Sequential numbering (1, 2, 3...)
- **Title:** String - Clear, descriptive test case name (action-oriented)
- **Test Type:** Enum - One of: Functional, Negative, UI/UX, Performance, Compatibility, Accessibility, Security, Error Handling
- **Preconditions:** String - Prerequisites before test execution (be specific)
- **Testing Steps:** String - Detailed step-by-step instructions (numbered, combined when appropriate)
- **Expected Result:** String - Clear expected outcome (comprehensive)
- **Created:** String - Date/Author (optional)
- **Reviewer:** String - Review status (optional)

### Regression Test Case Characteristics
- **Primary Test Type:** Functional (majority)
- **Step Count:** 6-12 steps (combine related actions)
- **Focus Areas:**
  - Environment configuration and selection
  - Connection establishment workflows
  - Complete user journeys
  - Integration between components
- **Combination:** Steps should be combined to test complete workflows

### Sanity Test Case Characteristics
- **Primary Test Type:** Functional (majority)
- **Step Count:** 4-8 steps (quick verification)
- **Focus Areas:**
  - Critical path verification
  - Essential functionality
  - Quick smoke tests
  - Core workflows only
- **Combination:** Steps should be combined for efficiency

---

## Feature-Specific Notes

### Deprecated Features
- Document any deprecated features in test cases
- Mark deprecated features with appropriate indicators (⚠️ DEPRECATED)
- Test cases should note these as deprecated but still testable if needed

### Not Currently Implemented
- Document features that are planned but not yet implemented
- These should be noted in test cases but not tested as implemented features
- Use comments or notes to indicate future implementation

### Application Context
- Document application-specific context (internal tool, customer-facing, etc.)
- Note platform requirements (desktop-only, mobile support, etc.)
- Document browser requirements and preferences
- Note any special design decisions (e.g., plain text passwords for internal tools)

---

**Document End**

