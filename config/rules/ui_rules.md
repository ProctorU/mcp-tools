# UI Specification Document Rules and Standards
## Rules for Creating UI Specification Documents

**Document ID:** DOC-RULES-UI-SPEC-001  
**Document Version:** 1.0  
**Date:** 18 September 2025    
**Project:** General Documentation Standards

---

## 1. Purpose

This document establishes mandatory rules and standards for creating and maintaining UI Specification Documents for any page or project. These rules ensure consistency, completeness, and accuracy in documenting all user interface elements.

---

## 2. Scope

These rules apply to all UI Specification Documents:
- Format: UI-SPEC-[PROJECT]-[PAGE]-XXX
- All pages, modules, and projects
- All UI elements, components, and interactions

---

## 2.1 Data Source Requirements

**RULE-UI-DATA-1: Complete Data Extraction**
- **Mandatory:** When creating UI Specification documents from Jira tickets, you MUST extract and use data from ALL available sources:
  - **Root Ticket:** Primary ticket data (fields, description, summary, etc.)
  - **Linked Tickets:** All linked Jira issues (inward and outward links)
  - **Confluence Pages:** All related Confluence documentation pages
  - **Attachments:** All attached files (screenshots, documents, images, etc.)

**RULE-UI-DATA-2: Linked Tickets Usage**
- **Mandatory:** Extract and incorporate UI information from linked tickets:
  - Review all linked issues for UI-related requirements, design specifications, or related UI components
  - Include UI elements, interactions, or design details from linked tickets
  - Document relationships between UI components across different tickets
  - Use linked ticket data to understand complete UI workflows and user journeys
  - Include linked ticket keys/IDs for reference in the UI Specification document

**RULE-UI-DATA-3: Confluence Pages Usage**
- **Mandatory:** Extract and incorporate UI information from Confluence pages:
  - Review all linked Confluence pages for design documents, UI mockups, style guides, or UI specifications
  - Include UI/UX guidelines, design patterns, or component specifications from Confluence
  - Use Confluence content to understand design system, color schemes, typography, and layout requirements
  - Reference Confluence pages in the "Related documents" section
  - Extract any visual design specifications, component libraries, or UI patterns documented in Confluence

**RULE-UI-DATA-4: Attachments Usage (CRITICAL for UI Documentation)**
- **Mandatory:** Extract and use information from all attachments, especially screenshots:
  - **Screenshots (PRIMARY SOURCE):** 
    - Screenshots are the PRIMARY source for UI element documentation
    - Document EVERY UI element visible in screenshots (fields, buttons, dropdowns, tables, sections, etc.)
    - Use screenshots to identify exact UI element labels, positions, and visual appearance
    - Reference screenshot filenames when documenting UI elements
    - Compare multiple screenshots to understand different states (enabled/disabled, selected/unselected, etc.)
  - **Design Mockups/Images:**
    - Use design mockups to understand intended UI layout, colors, typography, and visual design
    - Extract design specifications from mockup images
    - Document visual design requirements based on mockups
  - **Documents:**
    - Extract UI specifications, design guidelines, or component descriptions from attached documents
    - Review documents for UI-related requirements or design decisions
  - **Other Files:**
    - Review all attachment types for UI-related information
  - Reference attachment filenames when documenting UI elements derived from them

**RULE-UI-DATA-5: Screenshot-Based Documentation Priority**
- **Mandatory:** Screenshots take priority for UI documentation:
  - If screenshots are available, they are the PRIMARY source for UI element identification
  - Document all visible elements in screenshots, even if not mentioned in ticket description
  - Use screenshots to verify and supplement information from ticket descriptions
  - Screenshots override text descriptions when there are discrepancies
  - Multiple screenshots should be compared to document different states and conditions

**RULE-UI-DATA-6: Data Integration**
- **Mandatory:** Integrate data from all sources cohesively:
  - Combine UI information from root ticket, linked tickets, Confluence pages, and attachments
  - Use screenshots as the primary reference, supplemented by text descriptions
  - Ensure all UI elements visible in screenshots are documented
  - Maintain traceability to original data sources (screenshot filenames, ticket keys, etc.)
  - Document any assumptions made when data sources conflict

---

## 3. Document Structure Requirements

### 3.1 Mandatory Document Sections

Every UI Specification Document MUST include the following sections:

1. **Document Header**
   - Document ID
   - Document Version
   - Date
   - Project Name
   - Page/Module Name

2. **Introduction**
   - Purpose of the document
   - Scope
   - Related documents

3. **Page Overview**
   - Page title
   - Page URL (if applicable)
   - Layout description
   - Theme/Design system
   - Browser/platform requirements

4. **UI Component Documentation**
   - Sections organized by page layout
   - All fields, buttons, dropdowns, tables
   - All interactive elements

5. **Visual Design Specifications**
   - Color scheme
   - Typography
   - Spacing and layout
   - Interactive element states

6. **UI States and Interactions**
   - Initial page state
   - Conditional states
   - State transitions

---

## 4. Mandatory Rules for UI Element Documentation

### 4.1 Screenshot-Based Documentation

**RULE-UI-1: Complete Screenshot Coverage**
- **Mandatory:** Every field, element, and component visible in uploaded screenshots MUST be documented.
- **Requirement:** No UI element from screenshots should be omitted from documentation.
- **Verification:** Compare screenshots against UI Specification Document to ensure 100% coverage.

**RULE-UI-2: Screenshot Reference**
- **Mandatory:** Each documented UI element should reference the screenshot(s) where it appears.
- **Requirement:** Include screenshot numbers or identifiers for traceability.

---

### 4.2 Field Documentation Rules

**RULE-UI-3: Complete Field Attributes**
- **Mandatory:** For every input field, the following attributes MUST be documented:
  - Field label/name
  - Field type (text input, password, dropdown, checkbox, radio, etc.)
  - Field location (section, position)
  - Editable status (Yes/No)
  - Required status (Yes/No)
  - Default value (if applicable)
  - Placeholder text (if applicable)
  - Maximum length (if applicable)
  - Input format/pattern (if applicable)
  - Example values for each environment/configuration (if applicable)
  - Validation status (implemented/planned/not implemented)
  - Special notes (e.g., password not masked, deprecated options, read-only conditions)

**RULE-UI-4: Environment-Specific Values**
- **Mandatory:** If a field has different values for different environments, configurations, or contexts, ALL environment-specific values MUST be documented.
- **Requirement:** 
  - List all environments (e.g., Local, Staging, Production, Dev, Test)
  - Provide example values for each environment
  - Document any environment-specific behaviors

**RULE-UI-5: Field Grouping**
- **Mandatory:** Related fields must be grouped together in sections.
- **Requirement:** Document field relationships and dependencies.

---

### 4.3 Dropdown Documentation Rules

**RULE-UI-6: Complete Dropdown Value Documentation**
- **Mandatory:** If a dropdown/select field exists, ALL dropdown values/options MUST be documented:
  - List all options with their exact values
  - Include deprecated options (clearly marked)
  - Document any conditional options (options that appear based on conditions)
  - Specify option order (if significant)

**RULE-UI-7: Dropdown Default Value**
- **Mandatory:** The default/selected value for each dropdown MUST be specified.
- **Requirement:** 
  - Document default value when page loads
  - Document default value when environment/configuration changes
  - Document any dynamic default value logic

**RULE-UI-8: Dropdown Behavior**
- **Mandatory:** Document dropdown behavior:
  - Single-select or multi-select
  - Searchable (Yes/No)
  - Clearable (Yes/No)
  - Disabled state conditions

---

### 4.4 Button Documentation Rules

**RULE-UI-9: Complete Button Documentation**
- **Mandatory:** For every button, the following MUST be documented:
  - Button text/label
  - Button location (section, position)
  - Button type (primary, secondary, tertiary, icon-only, etc.)
  - Button size (if applicable)
  - Button states:
    - Default state (appearance, enabled/disabled)
    - Hover state (appearance, behavior)
    - Active/clicked state (appearance, behavior)
    - Disabled state (appearance, when disabled)
    - Selected state (if applicable)
  - Click action/behavior
  - Preconditions (when button is enabled/disabled)
  - Post-conditions (what happens after button click)
  - Loading state (if applicable)
  - Success/error feedback (if applicable)

**RULE-UI-10: Button Grouping**
- **Mandatory:** Related buttons must be documented together.
- **Requirement:** Document button relationships and action sequences.

---

### 4.5 Table Documentation Rules

**RULE-UI-11: Complete Table Documentation**
- **Mandatory:** For every table, the following MUST be documented:
  - Table title/header
  - Column headers (all columns)
  - Column data types
  - Column widths (if fixed)
  - Sortable columns (Yes/No)
  - Filterable columns (Yes/No)
  - Row selection (single/multiple/none)
  - Empty state (what displays when no data)
  - Loading state
  - Pagination (if applicable)
  - Actions per row (if applicable)

**RULE-UI-12: Table Action Buttons**
- **Mandatory:** All action buttons within tables must be documented separately.
- **Requirement:** Document button location, behavior, and conditions.

---

### 4.6 Conditional Element Documentation Rules

**RULE-UI-13: Conditional Visibility**
- **Mandatory:** If an element appears conditionally, the condition MUST be clearly documented:
  - When the element is visible
  - When the element is hidden
  - What triggers the visibility change
  - Any state dependencies

**RULE-UI-14: Conditional States**
- **Mandatory:** Document all conditional states:
  - Enabled/disabled conditions
  - Read-only conditions
  - Required/optional conditions based on state
  - Value changes based on conditions

---

### 4.7 Section Documentation Rules

**RULE-UI-15: Section Organization**
- **Mandatory:** Document sections in logical order:
  - Top to bottom
  - Left to right
  - By functional grouping

**RULE-UI-16: Section Headers**
- **Mandatory:** Every section must have:
  - Clear section title
  - Section description
  - Section location/position

---

### 4.8 Visual Design Documentation Rules

**RULE-UI-17: Color Scheme Documentation**
- **Mandatory:** Document all color usage:
  - Background colors
  - Text colors
  - Button colors
  - Border colors
  - Status indicator colors
  - Error/warning/success colors

**RULE-UI-18: Typography Documentation**
- **Mandatory:** Document typography:
  - Font families
  - Font sizes
  - Font weights
  - Text styles (bold, italic, underline)
  - Text colors

**RULE-UI-19: Spacing and Layout**
- **Mandatory:** Document layout specifications:
  - Page layout (single column, two-column, grid, etc.)
  - Section spacing
  - Element spacing
  - Padding and margins
  - Responsive breakpoints (if applicable)

**RULE-UI-20: Interactive Element States**
- **Mandatory:** Document all interactive element states:
  - Focus states
  - Hover states
  - Active states
  - Disabled states
  - Selected states
  - Error states

---

## 5. Documentation Format Requirements

### 5.1 Standard Format

**RULE-UI-21: Consistent Formatting**
- **Mandatory:** Use consistent formatting throughout the document:
  - Standard heading hierarchy
  - Consistent table formats
  - Standardized field documentation templates
  - Consistent terminology

**RULE-UI-22: Clear Descriptions**
- **Mandatory:** All descriptions must be:
  - Clear and unambiguous
  - Technically accurate
  - Free of implementation details (unless necessary)
  - Written in present tense

---

## 6. Special Cases

### 6.1 Deprecated Elements

**RULE-UI-23: Deprecated Element Documentation**
- **Mandatory:** Deprecated elements must be clearly marked:
  - Use deprecation indicator (⚠️ DEPRECATED)
  - Document why it's deprecated
  - Document when it will be removed (if known)
  - Note that it should not be used for new implementations

### 6.2 Planned Features

**RULE-UI-24: Planned Feature Documentation**
- **Mandatory:** Planned features must be clearly marked:
  - Use "PLANNED" indicator
  - Document planned implementation timeline (if known)
  - Document current status (not implemented)

### 6.3 Error States

**RULE-UI-25: Error State Documentation**
- **Mandatory:** Document all error states:
  - Error message display
  - Error indicator appearance
  - Error field highlighting
  - Error recovery actions

---

## 7. Verification Checklist

Before finalizing a UI Specification Document, verify:

- [ ] Every field from screenshots is documented
- [ ] Every dropdown has all values listed
- [ ] Every button has all states documented
- [ ] Every table has all columns documented
- [ ] All conditional elements have visibility rules documented
- [ ] All environment-specific values are documented
- [ ] All default values are specified
- [ ] All deprecated options are clearly marked
- [ ] All planned features are clearly marked
- [ ] All visual design specifications are documented
- [ ] All interactive states are documented
- [ ] Document follows standard format
- [ ] All descriptions are clear and accurate

---

## 8. Examples

### 8.1 Example: Field Documentation

**Example from CJS Home Page:**
```
**Field 1: TURN/STUN Server URL**
- Label: "TURN/STUN Server URL"
- Type: Text input field
- Placeholder: (Environment-specific URL)
- Example Values:
  - Local: `turn:turn.dev.use1.lower.meazurelearning.com:80`
  - Staging: `turn:turn-staging.proctoru.com:443?transport=tcp`
  - DevApps: `turn:turn.devapps.proctor.meazurelearning.com:80`
- Editable: Yes
- Required: Yes
- Validation: URL format validation is planned but not currently implemented
```

**Example from CJS Test Taker Page:**
```
**Field 3: User Id**
- Label: "User Id"
- Type: Text input field (read-only)
- Example Value: `203139`
- Editable: Yes
- Required: Yes
- Purpose: Displays the user identifier
```

### 8.2 Example: Dropdown Documentation

**Example from CJS Home Page:**
```
**Field 2: Media Server Version**
- Label: "Media Server Version"
- Type: Dropdown/Select field
- Display: Selected value with downward arrow icon
- Options: 
  - `cop25` (default, active)
  - `cop24` (available)
  - `zoom` ⚠️ **DEPRECATED** - This option is deprecated
- Default Value: `cop25`
- Editable: Yes (via dropdown selection)
- Required: Yes
- Note: The "zoom" option in the dropdown is deprecated and should not be used
```

**Example from CJS Test Taker Page:**
```
**Field 2: Webcam Source**
- Label: "Webcam Source"
- Type: Dropdown/Select field
- Display: Selected value with downward arrow icon (empty when no webcam selected)
- Options: 
  - (Populated with available webcam devices when permissions are granted)
  - Empty initially until webcam permission is granted
- Default Value: Empty (no selection)
- Editable: Yes (via dropdown selection)
- Required: No (optional until permission granted)
- Purpose: Select the webcam device to use
```

### 8.3 Example: Button Documentation

**Example from CJS Home Page:**
```
**Button 1: Connect**
- Type: Rectangular button
- Text: "Connect"
- Style: Blue background, white text
- Location: Left side of button group
- Action: Establish connection to media server
- State:
  - Default: Blue background
  - Hover: Slightly darker blue
  - Active/Click: Visual feedback
```

**Example from CJS Test Taker Page:**
```
**Button 2: Get Webcam/Microphone Permission**
- Type: Rectangular button
- Text: "Get Webcam/Microphone Permission"
- Style: Green background, white text
- Location: Below "Restart screen share" button
- Action: Request webcam and microphone permissions from the browser
- State:
  - Default: Green background
  - Hover: Slightly darker green
  - Active/Click: Visual feedback
- Note: Button remains enabled and clickable at all times. Button state does not change based on conditions.
```

### 8.4 Example: Conditional Element Documentation

**Example from CJS Home Page:**
```
**Section: Student Details**
- Location: Below Developers Info section
- Visibility: Displayed only after successful connection is established (when Kurento Status is green)
- Condition: Visible when Kurento Status indicator shows green checkmark
- Hidden When: Connection is not established or connection fails (Kurento Status is red)
- Trigger: Connection status change (successful connection)
- States:
  - Visible: Full section with table structure displayed
  - Hidden: Section not displayed
```

**Example from CJS Test Taker Page:**
```
**Button 2: Copy/Open Second Camera Link** (Conditional)
- Type: Rectangular button
- Text: "Copy/Open Second Camera Link"
- Style: Gray background, white/dark text
- Location: Appears alongside "Copy/Open Proctor Watcher Link" when "combinedWithSecondCamera" is selected in Video Layout dropdown
- Visibility: Only visible when Video Layout dropdown has "combinedWithSecondCamera" selected
- Action: Copy or open the second camera link
- Behavior: Opens the second camera page in a new browser tab
```

### 8.5 Example: Deprecated Element Documentation

**Example from CJS Home Page:**
```
**Button 1: Local Zoom** ⚠️ **DEPRECATED**
- Type: Rectangular button
- Text: "Local Zoom"
- Status: ⚠️ **DEPRECATED** - This option is deprecated and should not be used for new implementations
- State:
  - Default: Light gray background, dark gray text
  - Active/Selected: Darker gray background (highlighted)
- Action: Click to select Local Zoom environment (deprecated)
- Note: Zoom functionality is deprecated. Use "Local Copernicus" instead.
```

---

## 9. Document Maintenance

### 9.1 Update Process

When updating UI Specification Documents:

1. **New Screenshots**
   - Compare new screenshots with existing documentation
   - Document any new elements found
   - Update existing elements if changed
   - Remove documentation for removed elements

2. **UI Changes**
   - Update affected sections immediately
   - Document change reason (if applicable)
   - Update version number
   - Update change history

3. **Version Control**
   - Maintain version history
   - Document all changes in change history section
   - Keep previous versions accessible

---

## 10. Related Documents

- **SRS Documentation Rules:** SRS_Documentation_Rules.md
- **Traceability Matrix Rules:** Traceability_Matrix_Rules.md
- **General Documentation Standards:** Documentation_Rules_Standards.md

---

## 11. Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | - | Initial UI Specification rules and standards |

---

**Document End**

*These rules are mandatory and must be followed for all UI Specification Documents. Any exceptions must be documented and justified.*

