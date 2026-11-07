# T11 Service Request Search and View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add read-only listing, viewing, text search, status filtering, and combined querying for persisted Service Requests.

**Architecture:** Extend `ServiceRequestRepository` with one persistence-level query that owns filtering and deterministic ordering. Add `ServiceRequestQueryService` to coordinate list/view use cases, normalize search input, validate status filters, and return structured search results without containing SQL.

**Tech Stack:** JavaScript ES modules, Node.js 24, built-in `node:sqlite`, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-07-t11-service-request-search-view-design.md`

## Global Constraints

- Work on `feature/t11-service-request-search-view` created from merged T10 `main`.
- Reuse the existing `ServiceRequest` model, SQLite repository, `findById(id)`, submission flow, and T10 status service.
- Search only `serviceType` and `description`; never search IDs, Resident data, dates, or status as general text.
- Non-blank text search and status filtering must occur in SQLite with bound parameters.
- Every result order is `dateRequested DESC`, then `id DESC`.
- Queries are read-only and preserve all six Service Request fields.
- Do not add UI, controllers, routes, pagination, Resident joins, mutations, new statuses, or T12 behavior.
- Preserve every Starter-through-T10 test.

## Review Focus

- `null` and `undefined` search terms behave as blank listing input.
- Whitespace-only status input behaves as no filter; non-empty mixed/lowercase unsupported statuses are rejected.
- Apostrophes and SQL-looking text remain safe because all values are bound.
- `%`, `_`, and `\\` in a search term are treated literally rather than as unintended SQL wildcards.
- Filtered and combined queries retain the same date/ID ordering as normal listing.

---

### Task 1: Persistent Query and Ordering

**Files:**
- Modify: `src/repositories/ServiceRequestRepository.js`
- Create: `test/serviceRequestQuery.test.js`

**Interfaces:**
- Consumes: existing `ServiceRequestRepository.save(serviceRequest)`, `findById(id)`, `_toServiceRequest(record)`.
- Produces: `findAll(): ServiceRequest[]` and `query({ searchTerm?: string, status?: string | null }): ServiceRequest[]`.

- [ ] **Step 1: Write failing persistence tests**

Add focused tests proving: empty and populated listing; `date_requested DESC, id DESC`; case-insensitive partial matching in either searchable field; status-only and combined filtering; no duplicates; no matches return `[]`; all four statuses remain queryable; filtered ordering; quoted/SQL-looking input safety; and literal `%`, `_`, and `\\` matching.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/serviceRequestQuery.test.js`

Expected: FAIL because the repository query interface and required ordering do not exist.

- [ ] **Step 3: Implement the repository query**

In `ServiceRequestRepository.js`:

- Change `findAll()` to use required ordering, preferably by delegating to `query()`.
- Add `query({ searchTerm = '', status = null } = {})`.
- Select all six fields in read-only mode.
- Add the parenthesized text clause only for a non-blank normalized term.
- Escape `\\`, `%`, and `_` and use `LIKE ? ESCAPE '\\'` for literal partial matching.
- Add `status = ?` only when a status is supplied.
- Join text and status clauses with `AND` and bind every value.
- Always append `ORDER BY date_requested DESC, id DESC`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test test/serviceRequestQuery.test.js`

Expected: repository-focused tests pass; application-service tests may remain pending until Task 2.

- [ ] **Step 5: Commit persistent querying**

```text
git add src/repositories/ServiceRequestRepository.js test/serviceRequestQuery.test.js
git commit -m "feat: add persistent service request queries"
```

### Task 2: Application Query Service and Required Scenarios

**Files:**
- Create: `src/services/ServiceRequestQueryService.js`
- Modify: `test/serviceRequestQuery.test.js`
- Include: `docs/superpowers/specs/2026-11-07-t11-service-request-search-view-design.md`
- Include: `docs/superpowers/plans/2026-11-07-t11-service-request-search-view.md`

**Interfaces:**
- Consumes: `repository.findAll()`, `repository.findById(id)`, `repository.query({ searchTerm, status })`, and `ServiceRequestStatus`.
- Produces:
  - `listServiceRequests(): ServiceRequest[]`
  - `viewServiceRequest(id): ServiceRequest | null`
  - `searchServiceRequests(searchTerm = '', status = null): { success, unsupportedStatus, errors, serviceRequests }`

- [ ] **Step 1: Add all application-level required tests**

Ensure `test/serviceRequestQuery.test.js` explicitly covers all 14 numbered scenarios through the service layer: list all; empty list; ordering; existing view; unknown ID/no insertion; partial service-type search; partial description search; blank search; no match; status filter; no filter includes all statuses; combined `text AND status`; no duplicate; complete field preservation through list/search/view.

Also assert `null`/`undefined` search behavior, whitespace-only status behavior, unsupported status result shape, query read-only behavior, and exact ordering after filtering.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test test/serviceRequestQuery.test.js`

Expected: FAIL with missing `ServiceRequestQueryService`.

- [ ] **Step 3: Implement `ServiceRequestQueryService`**

- `listServiceRequests()` delegates to `findAll()`.
- `viewServiceRequest(id)` delegates to the existing `findById(id)`.
- `searchServiceRequests(searchTerm = '', status = null)` converts absent text to `''`, trims text input, trims string status input, treats blank status as no filter, validates non-blank status against exactly the four T10 values, and delegates valid criteria to `repository.query()`.
- Unsupported status returns `{ success: false, unsupportedStatus: true, errors: ['Unsupported Service Request status filter.'], serviceRequests: [] }` without querying persistence.
- Successful queries return `{ success: true, unsupportedStatus: false, errors: [], serviceRequests }`.

- [ ] **Step 4: Run focused and complete suites**

Run: `node --test test/serviceRequestQuery.test.js`

Expected: every T11 test passes.

Run: `npm test`

Expected: Starter-through-T11 pass with zero failures.

- [ ] **Step 5: Commit the required T11 feature commit**

```text
git add src/services/ServiceRequestQueryService.js test/serviceRequestQuery.test.js docs/superpowers/specs/2026-11-07-t11-service-request-search-view-design.md docs/superpowers/plans/2026-11-07-t11-service-request-search-view.md
git commit -m "feat: add service request search and viewing"
```

### Task 3: Runtime, Review, and Delivery

**Files:**
- Review all T11 changes only.

**Interfaces:**
- Consumes: completed T11 repository/service/test interfaces.
- Produces: verified and pushed `feature/t11-service-request-search-view` and a merge-ready PR.

- [ ] **Step 1: Verify runtime health**

Start the app on an available port and verify `/health` returns the expected `status: ok` payload, then stop it.

- [ ] **Step 2: Run final quality checks**

Run: `git diff --check`, `node --test test/serviceRequestQuery.test.js`, and `npm test`.

Expected: no whitespace errors, every focused T11 test passes, and the full suite has zero failures.

- [ ] **Step 3: Review branch state**

Confirm only intended T11 files and commits differ from `main`; confirm the required commit message exists.

- [ ] **Step 4: Push and open the PR**

Push `feature/t11-service-request-search-view` to `origin` and create a PR in `UPHSL/csms-javascript-jaisemori`:

- Base: `main`
- Title: `T11 - Search and View Service Requests`
- Description: listing/order, view/not-found, text/blank behavior, status/combined filtering, persistence-level parameter binding, T11/full-suite results, `/health`, checkpoint/design notes, and known issues.

- [ ] **Step 5: Merge and update local main after checks pass**

Merge only after required checks succeed, then switch to `main`, pull `origin/main`, and confirm a clean, up-to-date working tree.

