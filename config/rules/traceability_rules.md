# Traceability Matrix Rules and Standards
## Rules for Creating Traceability Matrix Documents

**Document ID:** DOC-RULES-TRACE-001  
**Document Version:** 1.0  
**Date:** 2024  
**Project:** General Documentation Standards

---

## 1. Purpose

This document establishes mandatory rules and standards for creating and maintaining Traceability Matrix Documents for any page or project. These rules ensure complete bidirectional traceability between UI specifications and functional requirements.

---

## 2. Scope

These rules apply to all Traceability Matrix Documents:
- Format: TRACE-UI-SRS-[PROJECT]-[PAGE]-XXX
- All pages, modules, and projects
- All UI elements to SRS requirements mapping
- All SRS requirements to UI elements mapping

---

## 3. Document Structure Requirements

### 3.1 Mandatory Document Sections

Every Traceability Matrix Document MUST include the following sections:

1. **Document Header**
   - Document ID
   - Document Version
   - Date
   - Project Name
   - Page/Module Name
   - Related Documents (UI Spec and SRS references)

2. **Purpose**
   - Purpose of the traceability matrix
   - Benefits of traceability
   - Scope of coverage

3. **Traceability Matrix**
   - Main mapping table
   - Organized by UI sections or SRS features
   - All required columns

4. **Summary Statistics**
   - Total UI elements mapped
   - Total SRS requirements mapped
   - Coverage percentage
   - Unmapped elements (if any)

5. **Notes**
   - Implementation details
   - Exceptions and justifications
   - Special considerations

---

## 4. Mandatory Rules for Traceability Matrix

### 4.1 Complete Coverage Requirement

**RULE-TRACE-1: 100% UI Element Coverage**
- **Mandatory:** Every UI element documented in the UI Specification Document MUST be mapped to at least one SRS requirement in the Traceability Matrix.
- **Exception:** Implementation-level details may be excluded with justification.
- **Verification:** Compare UI Specification Document against Traceability Matrix to ensure 100% coverage.

**RULE-TRACE-2: 100% SRS Requirement Coverage**
- **Mandatory:** Every Functional Requirement (FR) and Non-Functional Requirement (NFR) in the SRS Document MUST be mapped to at least one UI element in the Traceability Matrix.
- **Exception:** Requirements that don't have direct UI representation must be documented with justification.
- **Verification:** Compare SRS Document against Traceability Matrix to ensure 100% coverage.

**RULE-TRACE-3: Bidirectional Traceability**
- **Mandatory:** The Traceability Matrix MUST maintain bidirectional traceability:
  - UI elements → SRS requirements (forward traceability)
  - SRS requirements → UI elements (backward traceability)
- **Requirement:** Both directions must be verifiable and complete.

---

### 4.2 Matrix Structure Requirements

**RULE-TRACE-4: Required Columns**
- **Mandatory:** The Traceability Matrix MUST include the following columns:
  - UI Specification Reference (section/element identifier)
  - UI Element/Description (description of UI element)
  - SRS Requirement ID (FR-X.Y or NFR-X)
  - Requirement Description (brief description of requirement)
  - Status (Mapped/Not Required/Implied/N/A)
  - Additional columns as needed (Section/Category, Notes, etc.)

**RULE-TRACE-5: Organization**
- **Mandatory:** The matrix must be organized logically:
  - By UI sections (matching UI Specification Document structure)
  - Or by SRS features (matching SRS Document structure)
  - Consistent organization throughout

**RULE-TRACE-6: Multiple Mappings**
- **Mandatory:** When a UI element maps to multiple SRS requirements, all mappings must be listed:
  - Use comma-separated list: "FR-1.1, FR-1.2, FR-1.3"
  - Or create separate rows for each mapping
  - Ensure all relationships are visible

**RULE-TRACE-7: Multiple UI Elements**
- **Mandatory:** When an SRS requirement maps to multiple UI elements, all mappings must be listed:
  - Use comma-separated list or separate rows
  - Ensure all relationships are visible

---

### 4.3 Status Indicators

**RULE-TRACE-8: Status Values**
- **Mandatory:** Use standard status values:
  - **Mapped**: UI element is fully mapped to SRS requirement
  - **Not Required**: UI element is documented but doesn't require SRS mapping (with justification)
  - **Implied**: Requirement is implied by UI element but not explicitly stated
  - **N/A**: Not applicable (implementation details, etc.)

**RULE-TRACE-9: Status Justification**
- **Mandatory:** Non-"Mapped" statuses must include justification:
  - Document why element is "Not Required"
  - Document why requirement is "Implied"
  - Document why mapping is "N/A"

---

### 4.4 Mapping Accuracy

**RULE-TRACE-10: Accurate Mappings**
- **Mandatory:** All mappings must be accurate:
  - UI element descriptions must match UI Specification Document
  - SRS requirement IDs must match SRS Document exactly
  - Requirement descriptions must accurately reflect SRS requirements
  - No incorrect or outdated mappings

**RULE-TRACE-11: Reference Consistency**
- **Mandatory:** All references must be consistent:
  - UI Specification Reference must match UI Specification Document structure
  - SRS Requirement IDs must match SRS Document exactly
  - Cross-references must be valid

---

## 5. Update Requirements

### 5.1 Update Triggers

**RULE-TRACE-12: Mandatory Updates**
- **Mandatory:** The Traceability Matrix MUST be updated whenever:
  - New UI elements are added to UI Specification Document
  - New requirements are added to SRS Document
  - UI elements are modified in UI Specification Document
  - Requirements are modified in SRS Document
  - UI elements are removed
  - Requirements are removed or deprecated

**RULE-TRACE-13: Update Timing**
- **Mandatory:** Updates must be made:
  - Immediately when changes occur
  - Before document approval
  - As part of the documentation workflow

---

### 5.2 Update Process

**RULE-TRACE-14: Update Workflow**
- **Mandatory:** Follow this update workflow:
  1. Update source document (UI Spec or SRS) first
  2. Update Traceability Matrix
  3. Verify all mappings are still accurate
  4. Verify coverage is still 100%
  5. Update version number
  6. Document changes in change history

**RULE-TRACE-15: Change Documentation**
- **Mandatory:** Document all changes:
  - Update change history section
  - Note what was changed and why
  - Maintain version control

---

## 6. Verification Requirements

### 6.1 Coverage Verification

**RULE-TRACE-16: Coverage Verification**
- **Mandatory:** Before finalizing, verify:
  - Every UI element from UI Specification Document is in the matrix
  - Every FR and NFR from SRS Document is in the matrix
  - All mappings are accurate
  - No orphaned elements (unmapped UI elements)
  - No orphaned requirements (unmapped SRS requirements)

**RULE-TRACE-17: Mapping Verification**
- **Mandatory:** Verify all mappings:
  - Check that UI element descriptions match UI Specification Document
  - Check that SRS requirement IDs match SRS Document
  - Check that requirement descriptions are accurate
  - Check that status values are appropriate

---

## 7. Matrix Format Requirements

### 7.1 Table Format

**RULE-TRACE-18: Standard Table Format**
- **Mandatory:** Use standard table format:
  - Clear column headers
  - Consistent row formatting
  - Readable and organized
  - Suitable for export to CSV/Excel

**RULE-TRACE-19: Grouping and Organization**
- **Mandatory:** Organize matrix by:
  - UI sections (recommended for UI-driven projects)
  - Or SRS features (for requirement-driven projects)
  - Consistent organization throughout document

---

## 8. Special Cases

### 8.1 Implementation Details

**RULE-TRACE-20: Implementation Details**
- **Mandatory:** Implementation-level details that don't map to requirements must be:
  - Documented in the matrix with "N/A" status
  - Justified why they don't require SRS mapping
  - Listed separately or in notes section

### 8.2 Deprecated Elements

**RULE-TRACE-21: Deprecated Elements**
- **Mandatory:** Deprecated UI elements and requirements must be:
  - Included in the matrix
  - Clearly marked as deprecated
  - Mapped to their corresponding deprecated requirements/elements

### 8.3 Planned Features

**RULE-TRACE-22: Planned Features**
- **Mandatory:** Planned features must be:
  - Included in the matrix
  - Clearly marked as "PLANNED"
  - Mapped to their corresponding planned requirements/elements

---

## 9. Summary Statistics Requirements

**RULE-TRACE-23: Statistics Documentation**
- **Mandatory:** Include summary statistics:
  - Total UI Specification sections/elements
  - Total UI elements mapped
  - Total SRS Functional Requirements
  - Total SRS Non-Functional Requirements
  - Mapped requirements percentage
  - Unmapped elements count (if any)
  - Unmapped requirements count (if any)

**RULE-TRACE-24: Coverage Metrics**
- **Mandatory:** Calculate and document:
  - UI element coverage percentage
  - SRS requirement coverage percentage
  - Overall traceability coverage percentage

---

## 10. Verification Checklist

Before finalizing a Traceability Matrix Document, verify:

- [ ] Every UI element from UI Specification Document is mapped
- [ ] Every FR from SRS Document is mapped
- [ ] Every NFR from SRS Document is mapped
- [ ] All UI element descriptions match UI Specification Document
- [ ] All SRS requirement IDs match SRS Document exactly
- [ ] All requirement descriptions are accurate
- [ ] All status values are appropriate and justified
- [ ] All mappings are accurate and valid
- [ ] No orphaned UI elements
- [ ] No orphaned SRS requirements
- [ ] Summary statistics are accurate
- [ ] Coverage is 100% (or exceptions are justified)
- [ ] Document follows standard format
- [ ] All deprecated elements are marked
- [ ] All planned features are marked

---

## 11. Examples

### 11.1 Example: Traceability Matrix Entry

**Example from CJS Home Page:**
| UI Specification Reference | UI Element/Description | SRS Requirement ID | Requirement Description | Status |
|---------------------------|------------------------|-------------------|------------------------|--------|
| 3.1 | Section Title: "Turn/Stun Credentials" | FR-1.1, FR-6.3 | Display TURN/STUN Credentials section with title | Mapped |
| 3.2 | Local button | FR-1.2, FR-1.3 | Display and handle Local button click | Mapped |
| 3.3 | TURN/STUN Server URL field | FR-1.6 | TURN/STUN Server URL text input | Mapped |
| 4.4 | Connect button | FR-3.1, FR-3.2 | Display Connect button and handle click | Mapped |

**Example from CJS Test Taker Page:**
| UI Specification Reference | UI Element/Description | SRS Requirement ID | Requirement Description | Status |
|---------------------------|------------------------|-------------------|------------------------|--------|
| 2.1 | Application Title: "Copernicus.js" | FR-1.1 | Display "Copernicus.js" and "Test Taker Page" | Mapped |
| 2.2 | Kurento Status Indicator | FR-1.2 | Display Kurento Status indicator in top-right | Mapped |
| 2.3 | Copy/Open Proctor Watcher Link button | FR-1.3 | Display and handle Proctor Watcher Link button | Mapped |
| 4.2 | Webcam Source dropdown | FR-2.2, FR-2.3, FR-2.5 | Display Webcam Source dropdown, populate when permissions granted | Mapped |

### 11.2 Example: Multiple Mappings

**Example from CJS Home Page:**
| UI Specification Reference | UI Element/Description | SRS Requirement ID | Requirement Description | Status |
|---------------------------|------------------------|-------------------|------------------------|--------|
| 5.1 | Developers Info section visibility | FR-4.1, FR-3.3 | Displayed only after successful connection | Mapped |
| 5.2 | Student Details section visibility | FR-5.1, FR-3.3 | Displayed only after successful connection | Mapped |

**Example from CJS Test Taker Page:**
| UI Specification Reference | UI Element/Description | SRS Requirement ID | Requirement Description | Status |
|---------------------------|------------------------|-------------------|------------------------|--------|
| 2.2 | Kurento Status Indicator | FR-1.2 | Display Kurento Status indicator in top-right | Mapped |
| 2.2 | Green checkmark (connected) | FR-1.2 | Green checkmark indicates successful connection | Mapped |
| 2.2 | Red 'X' (disconnected/error) | FR-1.2 | Red 'X' indicates disconnected or error state | Mapped |

### 11.3 Example: Status Values

**Example from CJS Home Page:**
| UI Specification Reference | UI Element/Description | SRS Requirement ID | Requirement Description | Status |
|---------------------------|------------------------|-------------------|------------------------|--------|
| 12.2 | Data binding | (Implementation detail) | Not in SRS - implementation level | N/A |
| 10.1 | Keyboard navigation | (Not in SRS - internal tool) | Keyboard accessibility | Not Required |
| 10.2 | Visual accessibility | (Not explicitly in SRS) | Color contrast, focus indicators | Implied |

### 11.4 Example: Summary Statistics

| Category | Count |
|----------|-------|
| Total UI Specification Sections | 12 |
| Total UI Elements Mapped | 80+ |
| Total SRS Functional Requirements | 50+ |
| Total SRS Non-Functional Requirements | 12 |
| Mapped Requirements | 95%+ |
| Unmapped UI Elements | 5% (implementation details) |

---

## 12. Document Maintenance

### 12.1 Update Process

When updating Traceability Matrix Documents:

1. **UI Specification Changes**
   - Review updated UI Specification Document
   - Add new UI elements to matrix
   - Update existing UI element mappings if changed
   - Remove or mark deprecated UI elements

2. **SRS Document Changes**
   - Review updated SRS Document
   - Add new requirements to matrix
   - Update existing requirement mappings if changed
   - Remove or mark deprecated requirements

3. **Version Control**
   - Maintain version history
   - Document all changes in change history section
   - Keep previous versions accessible

---

## 13. Related Documents

- **UI Specification Rules:** `config/rules/ui_rules.md`
- **SRS Documentation Rules:** `config/rules/srs_rules.md`
- **General Documentation Standards:** `config/rules/documentation_rules.md`

---

## 14. Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | - | Initial Traceability Matrix rules and standards |

---

**Document End**

*These rules are mandatory and must be followed for all Traceability Matrix Documents. Any exceptions must be documented and justified.*

