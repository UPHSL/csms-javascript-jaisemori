# T13 Service Request Management Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete server-rendered T13 Service Request Management interface by composing the existing T09, T10, and T11 capabilities.

**Architecture:** Add an injected Express router/controller and three focused EJS views, extend the existing stylesheet/navigation, and keep all validation, querying, persistence, and transition rules in existing services. Test through the real app using temporary repositories.

**Tech Stack:** Node.js 24, Express 5, EJS, node:sqlite, node:test, Supertest

**Spec:** `docs/superpowers/specs/2026-11-12-t13-service-request-management-interface-design.md`

## Global Constraints

- Required branch: `feature/t13-service-request-management-interface`.
- Required final commit: `feat: build service request management interface`.
- Reuse T09/T10/T11; do not duplicate their business rules.
- Use server-rendered Express/EJS presentation; no SPA or separate frontend.
- GET requests are read-only; state-changing workflow actions use POST.
- Do not weaken or skip any T01–T12 test.

## Review Focus

- Repeated/non-string search and status query values render safely without stack traces.
- Tampered `id` or `status` form fields cannot bypass persistence-generated IDs, Pending initialization, or T10 transitions.
- Unknown request IDs return controlled HTML 404 responses for both view and mutation paths.
- Terminal requests expose no mutation controls but remain queryable.
- Failed submissions and transitions preserve repository count and every persisted field.

---

### Task 1: Listing, Search, Filtering, and Navigation

**Files:**
- Create: `test/serviceRequestInterface.test.js`
- Create: `src/controllers/serviceRequestController.js`
- Create: `src/routes/serviceRequestRoutes.js`
- Create: `src/views/service-requests/index.ejs`
- Modify: `src/app.js`
- Modify: `src/views/residents/index.ejs`
- Modify: `public/css/style.css`

**Interfaces:**
- Consumes: `ServiceRequestQueryService.searchServiceRequests(searchTerm, status)`.
- Produces: `GET /service-requests` and controller list rendering with `serviceRequests`, `searchTerm`, `statusFilter`, `statuses`, `message`, and `errors`.

- [ ] Write integration tests for management rendering, T11 ordering, empty results, partial/case-insensitive search, every status, combined filtering, safe no-match and malformed query inputs.
- [ ] Run `node --test test/serviceRequestInterface.test.js` and verify route tests fail because the feature is absent.
- [ ] Implement the list route, controller rendering, view, navigation, and shared styling.
- [ ] Run `node --test test/serviceRequestInterface.test.js` and verify the listing/search/filter group passes.

### Task 2: T09 Submission Form and Validation

**Files:**
- Modify: `test/serviceRequestInterface.test.js`
- Modify: `src/controllers/serviceRequestController.js`
- Modify: `src/routes/serviceRequestRoutes.js`
- Create: `src/views/service-requests/form.ejs`

**Interfaces:**
- Consumes: `ServiceRequestSubmissionService.submit(serviceRequest)` and `ServiceRequest`.
- Produces: `GET /service-requests/submit` and `POST /service-requests` with preserved values/errors or HTTP 303 success redirect.

- [ ] Add failing tests for required fields, no ID/status inputs, valid submission, generated ID/Pending status, T09 validation, missing Resident, inactive Resident, and failed-write protection.
- [ ] Run the focused test file and verify the new tests fail for missing routes.
- [ ] Implement form rendering and thin T09 submission handling.
- [ ] Run the focused test file and verify submission tests pass.

### Task 3: Details and T10 Workflow Actions

**Files:**
- Modify: `test/serviceRequestInterface.test.js`
- Modify: `src/controllers/serviceRequestController.js`
- Modify: `src/routes/serviceRequestRoutes.js`
- Create: `src/views/service-requests/details.ejs`
- Create: `src/views/service-requests/not-found.ejs`

**Interfaces:**
- Consumes: `ServiceRequestQueryService.viewServiceRequest(id)` and `ServiceRequestStatusService.changeStatus(id, targetStatus)`.
- Produces: `GET /service-requests/:id` and POST-only `/service-requests/:id/status` with status-specific actions.

- [ ] Add failing tests for complete details, missing IDs, Pending/In Progress actions, terminal states, direct invalid transition rejection, non-status field preservation, mutation-method protection, and read-only GETs.
- [ ] Run the focused test file and verify failures identify missing behavior.
- [ ] Implement details/not-found views and T10 workflow handler.
- [ ] Run the focused test file and verify all T13 tests pass.

### Task 4: Regression and Runtime Verification

**Files:**
- Modify as needed only when a failing verification exposes a covered defect.

**Interfaces:**
- Consumes: all T13 routes and prior application behavior.
- Produces: verified T13 feature branch ready for review.

- [ ] Run `npm test`; require zero failures across T01–T13.
- [ ] Start the application and verify `/health`, Resident Management, and Service Request Management.
- [ ] Exercise the 14 manual scenarios with temporary data and confirm no stack traces.
- [ ] Review `git status`, `git diff`, and the rubric line by line.
- [ ] Commit intended files using `feat: build service request management interface`.
