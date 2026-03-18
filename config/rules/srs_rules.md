# SRS Documentation Rules and Standards
## Rules for Creating Software Requirements Specification (SRS) Documents

**Document ID:** DOC-RULES-SRS-001  
**Document Version:** 1.0  
**Date:** 18 September 2025  
**Project:** General Documentation Standards

---

## 1. Purpose

This document establishes mandatory rules and standards for creating and maintaining Software Requirements Specification (SRS) Documents for any page or project. These rules ensure consistency, completeness, testability, and traceability of functional and non-functional requirements.

---

## 2. Scope

These rules apply to all SRS Documents:
- Format: SRS-[PROJECT]-[PAGE]-XXX
- All pages, modules, and projects
- All functional requirements (FR)
- All non-functional requirements (NFR)

---

## 2.1 Data Source Requirements

**RULE-SRS-DATA-1: Complete Data Extraction**
- **Mandatory:** When creating SRS documents from Jira tickets, you MUST extract and use data from ALL available sources:
  - **Root Ticket:** Primary ticket data (fields, description, summary, etc.)
  - **Linked Tickets:** All linked Jira issues (inward and outward links)
  - **Confluence Pages:** All related Confluence documentation pages
  - **Attachments:** All attached files (screenshots, documents, images, etc.)

**RULE-SRS-DATA-2: Linked Tickets Usage**
- **Mandatory:** Extract and incorporate information from linked tickets:
  - Review all linked issues for additional requirements, context, or related functionality
  - Include requirements from linked tickets that are relevant to the current SRS
  - Document relationships between requirements from different tickets
  - Use linked ticket data to provide complete context and traceability
  - Include linked ticket keys/IDs for reference in the SRS document

**RULE-SRS-DATA-3: Confluence Pages Usage**
- **Mandatory:** Extract and incorporate information from Confluence pages:
  - Review all linked Confluence pages for detailed specifications, design documents, or technical documentation
  - Include relevant requirements, specifications, or context from Confluence pages
  - Use Confluence content to supplement and enrich SRS requirements
  - Reference Confluence pages in the "Related documents" section
  - Extract any functional or non-functional requirements documented in Confluence

**RULE-SRS-DATA-4: Attachments Usage**
- **Mandatory:** Extract and use information from all attachments:
  - **Screenshots:** Use screenshots to identify UI elements, understand visual requirements, and document UI specifications
  - **Documents:** Extract requirements, specifications, or context from attached documents (PDFs, Word docs, etc.)
  - **Images:** Use images to understand design requirements, mockups, or visual specifications
  - **Other Files:** Review all attachment types for relevant information
  - When using RAG, treat attachment chunks returned by `queryChunks` as the default attachment source for filenames, mime types, and any extracted attachment text
  - Read raw attachment payloads from `staging/aggregated.json` only when exact binary inspection is required (for example, screenshot-only details or non-text documents)
  - Reference attachments when documenting requirements derived from them
  - Use attachment filenames to identify the source of requirements

**RULE-SRS-DATA-5: Data Integration**
- **Mandatory:** Integrate data from all sources cohesively:
  - Combine information from root ticket, linked tickets, Confluence pages, and attachments
  - Resolve any conflicts or contradictions between sources
  - Ensure all relevant information is included in the SRS
  - Maintain traceability to original data sources
  - Document any assumptions made when data sources conflict

---

## 3. Document Structure Requirements

### 3.1 Mandatory Document Sections

Every SRS Document MUST include the following sections:

1. **Document Header**
   - Document ID
   - Document Version
   - Date
   - Project Name
   - Page/Module Name

2. **Introduction**
   - Purpose of the document
   - Scope
   - Definitions, Acronyms, and Abbreviations
   - Related documents

3. **Overall Description**
   - Product Perspective
   - Product Functions
   - Application Context
   - User Characteristics

4. **Functional Requirements**
   - Organized by features/functionality
   - Each feature with description and requirements
   - All Functional Requirements (FR-X.Y)

5. **Non-Functional Requirements**
   - Performance Requirements
   - Usability Requirements
   - Reliability Requirements
   - Security Requirements
   - Compatibility Requirements
   - All Non-Functional Requirements (NFR-X)

6. **System Behavior**
   - Initial state behavior
   - User interaction flows
   - State transitions

---

## 4. Mandatory Rules for Functional Requirements

### 4.1 Requirement Creation and UI Validation

**RULE-SRS-1: Complete UI Element Coverage**
- **Mandatory:** Every UI element documented in the UI Specification Document MUST have at least one corresponding Functional Requirement (FR) in the SRS document.
- **Exception:** Implementation-level details (data binding, state management specifics) may be excluded from SRS but must be documented in UI spec.
- **Verification:** Use the Traceability Matrix to verify 100% mapping coverage.

**RULE-SRS-2: SRS Creation and UI Validation**
- **Mandatory:** The SRS Document must be created first based on requirements and specifications.
- **Process:** 
  1. Create Functional Requirements in the SRS document based on requirements and specifications
  2. Review UI Specification Document to validate and verify SRS completeness
  3. Ensure every UI element has at least one corresponding FR in the SRS
  4. Update SRS if any UI elements are missing corresponding requirements

**RULE-SRS-3: Requirement Granularity**
- **Mandatory:** Requirements must be appropriately granular:
  - Simple elements may map to a single FR
  - Complex elements (e.g., tables with multiple columns) may map to multiple FRs
  - Each FR should be independently testable

---

### 4.2 Functional Requirement Format

**RULE-SRS-4: Requirement ID Format**
- **Mandatory:** All Functional Requirements must use the format: **FR-X.Y**
  - X = Feature/Function number
  - Y = Requirement number within the feature
  - Example: FR-1.1, FR-1.2, FR-2.1, FR-2.2

**RULE-SRS-5: Requirement Completeness**
- **Mandatory:** Each Functional Requirement MUST include:
  - Unique requirement ID (FR-X.Y)
  - Clear, testable requirement statement (using "shall" or "must")
  - Description (what the system should do)
  - Preconditions (if applicable - when the requirement applies)
  - Expected behavior/outcome (what should happen)
  - Post-conditions (if applicable - state after requirement is met)
  - Notes about implementation status (if not currently implemented)
  - Related requirements (if applicable)

**RULE-SRS-6: Requirement Statement Quality**
- **Mandatory:** Requirement statements must be:
  - Clear and unambiguous
  - Testable (can be verified)
  - Specific (not vague)
  - Complete (no missing information)
  - Written in present tense or using "shall"/"must"

---

### 4.3 Feature Organization

**RULE-SRS-7: Feature-Based Organization**
- **Mandatory:** Functional Requirements must be organized by features/functions.
- **Requirement:** 
  - Each feature section must have a description
  - All related FRs grouped under the feature
  - Features organized logically (by page layout or functionality)

**RULE-SRS-8: Feature Numbering**
- **Mandatory:** Features must be numbered sequentially (Feature 1, Feature 2, etc.).
- **Requirement:** Feature numbers should align with UI sections where possible.

---

### 4.4 Field Requirements Documentation

**RULE-SRS-9: Field Requirement Documentation**
- **Mandatory:** For every input field in UI spec, document:
  - Field display requirement
  - Field input requirement
  - Field validation requirement (if applicable)
  - Field behavior requirement
  - Field editability requirement

**RULE-SRS-10: Dropdown Options Documentation**
- **Mandatory:** For every dropdown, document:
  - All available options must be listed
  - Default value must be specified
  - Option selection behavior
  - Deprecated options must be marked

**RULE-SRS-11: Environment-Specific Values**
- **Mandatory:** If fields have environment-specific values, document:
  - All environments must be covered
  - Values for each environment
  - Environment selection behavior

---

### 4.5 Button Requirements Documentation

**RULE-SRS-12: Button Requirement Documentation**
- **Mandatory:** For every button, document:
  - Button display requirement
  - Button click behavior requirement
  - Button state requirements (enabled/disabled conditions)
  - Button action requirements (what happens on click)
  - Button feedback requirements (success/error messages)

**RULE-SRS-13: Button Preconditions**
- **Mandatory:** Document all button preconditions:
  - When button is enabled
  - When button is disabled
  - What conditions affect button state

---

### 4.6 Conditional Element Requirements

**RULE-SRS-14: Conditional Visibility Requirements**
- **Mandatory:** For conditional elements, document:
  - Visibility condition requirement
  - When element should be displayed
  - When element should be hidden
  - What triggers visibility change

**RULE-SRS-15: Conditional Behavior Requirements**
- **Mandatory:** Document conditional behaviors:
  - Enabled/disabled conditions
  - Value changes based on conditions
  - State-dependent requirements

---

### 4.7 Table Requirements Documentation

**RULE-SRS-16: Table Requirement Documentation**
- **Mandatory:** For every table, document:
  - Table display requirement
  - Column requirements (all columns)
  - Data display requirements
  - Empty state requirement
  - Loading state requirement
  - Row selection requirements (if applicable)
  - Action button requirements (if applicable)

---

## 5. Mandatory Rules for Non-Functional Requirements

### 5.1 Non-Functional Requirement Format

**RULE-SRS-17: NFR ID Format**
- **Mandatory:** All Non-Functional Requirements must use the format: **NFR-X**
  - X = Sequential number
  - Example: NFR-1, NFR-2, NFR-3

**RULE-SRS-18: NFR Categories**
- **Mandatory:** Non-Functional Requirements must be organized by category:
  - Performance Requirements
  - Usability Requirements
  - Reliability Requirements
  - Security Requirements
  - Compatibility Requirements

---

### 5.2 Performance Requirements

**RULE-SRS-19: Performance Metrics**
- **Mandatory:** Performance requirements must specify:
  - Measurable metrics (response time, load time, etc.)
  - Target values
  - Conditions under which metrics apply

---

### 5.3 Usability Requirements

**RULE-SRS-20: Usability Specifications**
- **Mandatory:** Usability requirements must specify:
  - Visual feedback requirements
  - User interaction requirements
  - Error handling requirements
  - User guidance requirements

---

### 5.4 Security Requirements

**RULE-SRS-21: Security Specifications**
- **Mandatory:** Security requirements must specify:
  - Data protection requirements
  - Access control requirements
  - Credential handling requirements
  - Security-related behaviors

---

### 5.5 Compatibility Requirements

**RULE-SRS-22: Compatibility Specifications**
- **Mandatory:** Compatibility requirements must specify:
  - Browser requirements
  - Platform requirements
  - Device requirements (if applicable)
  - Version requirements

---

## 6. Requirement Statement Guidelines

### 6.1 Writing Requirements

**RULE-SRS-23: Requirement Language**
- **Mandatory:** Use standard requirement language:
  - Use "shall" or "must" for mandatory requirements
  - Use "should" for recommended requirements
  - Use "may" for optional requirements
  - Avoid ambiguous terms

**RULE-SRS-24: Requirement Clarity**
- **Mandatory:** Requirements must be:
  - Written in simple, clear language
  - Free of technical jargon (unless necessary)
  - Specific and measurable
  - Complete (no missing information)

---

## 7. Special Cases

### 7.1 Deprecated Features

**RULE-SRS-25: Deprecated Feature Documentation**
- **Mandatory:** Deprecated features must be clearly marked:
  - Use deprecation indicator (⚠️ DEPRECATED)
  - Document why it's deprecated
  - Note that it should not be used for new implementations
  - Document removal timeline (if known)

### 7.2 Planned Features

**RULE-SRS-26: Planned Feature Documentation**
- **Mandatory:** Planned features must be clearly marked:
  - Use "PLANNED" indicator
  - Document that it's not currently implemented
  - Document planned implementation timeline (if known)

### 7.3 Error Handling

**RULE-SRS-27: Error Handling Requirements**
- **Mandatory:** Document error handling requirements:
  - Error detection requirements
  - Error message requirements
  - Error recovery requirements
  - Error state requirements

---

## 8. Verification Checklist

Before finalizing an SRS Document, verify:

- [ ] Every UI element from UI Specification has at least one corresponding FR
- [ ] All FRs are uniquely numbered (FR-X.Y format)
- [ ] All NFRs are uniquely numbered (NFR-X format)
- [ ] All requirement statements are clear and testable
- [ ] All dropdown options are documented in requirements
- [ ] All default values are specified
- [ ] All preconditions are documented
- [ ] All post-conditions are documented
- [ ] All conditional behaviors are documented
- [ ] All deprecated features are clearly marked
- [ ] All planned features are clearly marked
- [ ] All error handling is documented
- [ ] Document follows standard structure
- [ ] All requirements use proper language ("shall"/"must")

---

## 9. Examples

### 9.1 Example: Field Requirement

**Example from CJS Home Page:**
```
**FR-1.6**: The TURN/STUN Credentials section shall contain the following input fields:
- TURN/STUN Server URL (text input)
- TURN/STUN Server User Name (text input)
- TURN/STUN Server Password (text input - displays plain text, NOT masked)

**FR-1.7**: Users shall be able to manually edit the populated values in all TURN/STUN credential fields.

**FR-1.8**: Error validation for input fields is planned but not currently implemented. Fields do not currently validate input format or display error messages.
```

**Example from CJS Test Taker Page:**
```
**FR-2.2**: The system shall display a "Webcam Source" dropdown field for selecting webcam devices.

**FR-2.3**: The "Webcam Source" and "Audio Source" dropdowns shall be empty until permissions are granted.

**FR-2.5**: When permissions are granted:
- The "Webcam Source" dropdown shall populate with available webcam devices
- The "Audio Source" dropdown shall populate with available microphone devices
```

### 9.2 Example: Dropdown Requirement

**Example from CJS Home Page:**
```
**FR-2.9**: The Media Server Version dropdown shall display available versions (e.g., cop25, cop24, etc.). The "zoom" option in the dropdown is ⚠️ **DEPRECATED** and should not be used for new implementations.

**FR-2.10**: The Region dropdown shall display available regions including: us-west-1 (default), us-east-1, us-central-1, eu-central-1, ca-central-1, ap-southeast-2, and potentially additional regions.
```

**Example from CJS Test Taker Page:**
```
**FR-3.1**: The system shall display a "Video Layout" dropdown with the following options:
- `combined` (default) - Two-grid layout (primary camera and screenshare)
- `combinedWithSecondCamera` - Three-grid layout (primary camera, second camera, and screenshare)
- `legacy` (available but not primary)

**FR-3.6**: The system shall display an "Aspect Ratio" dropdown with "16x9" as the default option.
```

### 9.3 Example: Button Requirement

**Example from CJS Home Page:**
```
**FR-3.1**: The system shall display a "Connect" button in the "Connect to Media Server" section.

**FR-3.2**: When the "Connect" button is clicked:
- The system shall attempt to establish a connection to the configured media server using the TURN/STUN credentials and media server URL
- **Note:** Field validation is planned but not currently implemented. The system does not currently validate field values before attempting connection.

**FR-3.3**: When the connection is successful (TURN/STUN fields are correct and media server URL is correct):
- The Kurento Status indicator shall change to green (showing a green checkmark) to indicate successful connection
- The "Developers Info" button shall be displayed/shown on the page
- The "Student Details" section with table structure (empty) shall be displayed on the page
```

**Example from CJS Test Taker Page:**
```
**FR-4.1**: The system shall provide a "Create Cjs Lib" button that creates a Cjs Lib instance.

**FR-4.2**: The system shall provide an "Initialize" button that initializes the Cjs Lib.

**FR-4.3**: The system shall provide a "Start Live Stream" button that starts live streaming functionality.

**FR-4.8**: All Cjs Lib control buttons shall remain enabled and clickable at all times, regardless of current state.
```

### 9.4 Example: Conditional Element Requirement

**Example from CJS Home Page:**
```
**FR-4.1**: The "Developers Info" section shall be displayed only after a successful connection is established (when Kurento Status is green).

**FR-5.1**: The "Student Details" section shall be displayed only after a successful connection is established (when Kurento Status is green).

**FR-5.3**: The Student Details table shall initially be empty (no data rows displayed) when first shown after successful connection.
```

**Example from CJS Test Taker Page:**
```
**FR-1.6**: The system shall display "Copy/Open Second Camera Link" button only when "combinedWithSecondCamera" is selected in the Video Layout dropdown.

**FR-3.2**: When "combined" is selected:
- Webcam Live Stream shall display in two-grid layout
- First grid (top) shall show primary camera feed
- Second grid (bottom) shall show screenshare window
- "Copy/Open Second Camera Link" button shall not be displayed

**FR-3.3**: When "combinedWithSecondCamera" is selected:
- Webcam Live Stream shall display in three-grid layout
- First grid shall show primary camera feed
- Second grid shall show second camera feed
- Third grid shall show screenshare window
- "Copy/Open Second Camera Link" button shall be displayed in the header
```

### 9.5 Example: Environment Selection Requirement

```
**FR-1.3**: When the "Local" button is clicked:
- The system shall populate the TURN/STUN Server URL field with local environment URL
- The system shall populate the TURN/STUN Server User Name field with local environment username
- The system shall populate the TURN/STUN Server Password field with local environment password
- The "Local" button shall be visually highlighted to indicate active selection

**FR-2.3**: When the "Local Zoom" button is clicked (⚠️ **DEPRECATED**):
- The system shall populate the Media Server URL field with Local Zoom environment URL
- The system shall populate the Media Server Version dropdown with Local Zoom version
- The system shall populate the Region dropdown with Local Zoom region
- The system shall populate the Video Service URL field with Local Zoom video service URL
- The "Local Zoom" button shall be visually highlighted to indicate active selection
- **Note:** Local Zoom functionality is deprecated. Use "Local Copernicus" instead.
```

### 9.6 Example: Non-Functional Requirement

```
**NFR-5**: All buttons and interactive elements shall provide visual feedback on hover and click.

**NFR-6**: Selected environment buttons shall be visually distinct from unselected buttons.

**NFR-9**: Password fields shall display plain text (NOT masked with asterisks or dots). The TURN/STUN Server Password field shows the password value in clear text.

**NFR-11**: The application shall be optimized for **Google Chrome browser** (latest stable version or latest 2 versions) as the preferred browser. Other modern browsers (Firefox, Edge, Safari) are supported but Chrome is preferred. This is an in-house application.

**NFR-12**: The application shall be optimized for **desktop platforms only** (Windows, macOS, Linux). The application opens in a browser tab and requires a desktop screen (minimum recommended width: 1280px). Mobile and tablet devices are not supported.
```

---

## 10. Document Maintenance

### 10.1 Update Process

When updating SRS Documents:

1. **UI Changes**
   - Review updated UI Specification Document
   - Update corresponding Functional Requirements
   - Add new FRs for new UI elements
   - Mark removed FRs as deprecated or remove them

2. **Requirement Changes**
   - Update requirement statements
   - Update version number
   - Document changes in change history
   - Update Traceability Matrix

3. **Version Control**
   - Maintain version history
   - Document all changes in change history section
   - Keep previous versions accessible

---

## 11. Related Documents

- **UI Specification Rules:** UI_Specification_Rules.md
- **Traceability Matrix Rules:** Traceability_Matrix_Rules.md
- **General Documentation Standards:** Documentation_Rules_Standards.md

---

## 12. Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | - | Initial SRS Documentation rules and standards |

---

**Document End**

*These rules are mandatory and must be followed for all SRS Documents. Any exceptions must be documented and justified.*

