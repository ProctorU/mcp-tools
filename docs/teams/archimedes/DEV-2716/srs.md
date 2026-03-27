# Software Requirements Specification

| Field | Value |
|-------|-------|
| **Document ID** | SRS-DEV-2716-WATCHER-001 |
| **Document Version** | 1.0 |
| **Date** | 2026-03-18 |
| **Project Name** | DEV (Archimedes) |
| **Page/Module Name** | Watcher Window — Screen/Video Display (Google Sessions) |
| **Source Ticket** | DEV-2716 |
| **Jira Status (at authoring)** | Rejected — requirements captured for historical/traceability use |

---

## 1. Introduction

### 1.1 Purpose

This document specifies software requirements derived from Jira **DEV-2716** (*Watcher Window Bug - No Screen/Video: Google*). It describes expected behavior of the watcher window with respect to screen and video recordings, and frames investigation/fix scope for a reported failure on Google sessions.

### 1.2 Scope

**In scope:**

- Display of screen share and video recordings in the watcher window (pop-out).
- Google session class behavior parity with known-good (normal) Google test-taker sessions.
- Investigation and remediation of cases where recordings do not populate the watcher UI.

**Out of scope (unless expanded by linked work):**

- Non-Google session types (unless same root cause applies).
- Zendesk workflow (referenced only as supplementary context).

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|------|------------|
| **Watcher window** | Pop-out UI used to view session screen/video recordings. |
| **Google session** | Proctoring session context labeled or classified as Google (per product definition). |
| **Recordings** | Screen capture and/or video streams associated with the session. |
| **Fulfillment** | Session instance identified by fulfillment URL/ID (e.g. go.proctoru.com fulfillments path). |

### 1.4 Related documents

| Document | Reference |
|----------|-----------|
| Jira ticket | DEV-2716 |
| Example fulfillment (investigation) | `https://go.proctoru.com/fulfillments/c4421dc5-b211-4450-be26-3f502e2aad1d` |
| Zendesk Support | Further comments and attachments per ticket (external) |
| Attachments (ticket description) | inline-189440377.png, inline77823577.png (expected vs normal Google test-taker appearance) |

---

## 2. Overall Description

### 2.1 Product Perspective

The watcher window is part of the proctoring/fulfillment experience. Operators rely on it to observe screen and video recordings. Failure to populate the window blocks visibility into the session and may indicate a broader platform issue.

### 2.2 Product Functions

- Render screen/video recordings in the watcher pop-out when data is available.
- Align behavior for Google sessions with documented “normal” Google test-taker behavior (reference screenshots in ticket/Zendesk).

### 2.3 Application Context

Issue observed on a Google session; concern that the behavior may affect multiple sessions or environments.

### 2.4 User Characteristics

Internal developers/engineers investigating the bug; support/operations users relying on the watcher window for session monitoring.

---

## 3. Functional Requirements

### Feature 1 — Watcher window content

**FR-1.1** — The system **shall** display applicable screen share and video recordings inside the watcher window pop-out when recordings are available for the session.

**Description:** The watcher UI must bind to and render the correct recording streams or assets for the active fulfillment.

**Preconditions:** Session has produced or attached recordings expected for that session type.

**Expected behavior:** User sees screen/video content consistent with session state (not an empty or stuck panel when data exists).

**Post-conditions:** Recordings visible or explicit empty/error state if none exist (see FR-1.4).

**Related:** DEV-2716.

---

**FR-1.2** — For **Google** sessions, the watcher window **shall** populate with screen/video recordings to the same functional standard as a **normal** Google test-taker session (baseline referenced in ticket attachments and Zendesk).

**Description:** Google-class sessions must not regress below the known-good baseline.

**Preconditions:** Google session; recordings generated per product rules.

**Expected behavior:** Watcher shows recordings analogous to “normal Google test-taker” reference.

**Post-conditions:** Operator can verify session activity via watcher.

**Notes:** Reported bug: watcher did **not** populate for the cited Google session — treat as defect against this requirement.

**Related:** FR-1.1, DEV-2716.

---

**FR-1.3** — The system **must** allow engineering to **investigate** a specific fulfillment (e.g. by fulfillment URL or ID) to determine **why** screen/video recordings fail to appear in the watcher window when they should.

**Description:** Supports root-cause analysis (logging, reproducibility, data pipeline from recording source to watcher).

**Preconditions:** Valid fulfillment identifier and permissions.

**Expected behavior:** Team can trace recording availability vs. watcher binding.

**Related:** DEV-2716.

---

**FR-1.4** — When no recordings are available, the system **shall** present a clear **empty or error state** in the watcher window (distinct from a silent failure or indefinite loading).

**Description:** Distinguishes “no data” from “data failed to load.”

**Expected behavior:** User-visible feedback.

**Related:** RULE-SRS-27 (error handling).

---

### Feature 2 — Cross-session and regression concerns

**FR-2.1** — Where a defect is confirmed for one fulfillment, the investigation **shall** assess whether the same failure mode **may affect other sessions** (wider issue), and document scope in the ticket or linked work.

**Description:** Addresses stakeholder concern in DEV-2716.

**Expected behavior:** Written assessment (e.g. limited to one fulfillment vs. systemic).

**Related:** DEV-2716.

---

## 4. Non-Functional Requirements

### 4.1 Performance

**NFR-1** — The watcher window **shall** begin showing recording content or a definitive empty/error state within a **measurable** time after open (specific SLA to be set by team; interim: no unbounded hang without feedback).

**NFR-2** — Loading or buffering states **shall** be visually indicated so users know the system is working.

### 4.2 Usability

**NFR-3** — The watcher pop-out **shall** be usable for verifying screen and video feeds without requiring undocumented workarounds when recordings exist.

### 4.3 Reliability

**NFR-4** — Recording-to-watcher data path **shall** be resilient to transient failures where feasible, with retry or error surfacing per platform standards.

### 4.4 Security

**NFR-5** — Access to session recordings in the watcher **must** enforce existing authorization for the fulfillment/session (no leakage across tenants or sessions).

### 4.5 Compatibility

**NFR-6** — Google session watcher behavior **shall** remain consistent with supported browser/client matrix for the fulfillment dashboard (per platform policy).

---

## 5. System Behavior

### 5.1 Initial state

User opens watcher pop-out for a session. System requests/recovers recording handles for that fulfillment.

### 5.2 User interaction flows

1. **Success path:** Recordings load → rendered in watcher (FR-1.1, FR-1.2).
2. **No data path:** Explicit empty/error (FR-1.4).
3. **Investigation path:** Engineer uses tools/logs to trace failure (FR-1.3).

### 5.3 State transitions

- Loading → displaying content.
- Loading → error/empty with message.
- **Reported bug state (to eliminate):** Loading or ready UI **without** content when recordings exist (violates FR-1.1 / FR-1.2).

---

## 6. Traceability

| Requirement | Source |
|-------------|--------|
| FR-1.1–FR-1.4, FR-2.1 | DEV-2716 description, RAG chunks (Jira) |
| NFR-1–NFR-6 | srs_rules.md categories applied to watcher use case |

---

## 7. Verification checklist (summary)

- [x] FR IDs use FR-X.Y; NFR IDs use NFR-X.
- [x] Mandatory language (shall/must) used for normative statements.
- [x] Linked ticket and related URLs documented.
- [x] Deprecated/planned: none asserted for core fix (ticket Rejected — implementation status tracked in Jira).
- [ ] Full UI-to-FR matrix: defer until UI spec exists for watcher (per RULE-SRS-1 exception for SRS-first from ticket-only context).

---

## 8. Change history

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-18 | Generated from DEV-2716 + RAG | Initial SRS from ticket/RAG chunks |

---

*End of document*
