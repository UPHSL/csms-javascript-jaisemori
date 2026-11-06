# T10 Service Request Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add controlled, persisted Service Request status transitions while preserving all T01-T09 behavior and request data.

**Architecture:** Extend the existing Service Request status constants, add a parameterized SQLite status-only repository update, and create a dedicated application service that validates supported targets and allowed transitions before persistence. Keep controllers, routes, Resident eligibility checks, and T11 query features out of T10.

**Tech Stack:** JavaScript ES modules, Node.js 24, `node:sqlite`, Node test runner.

**Spec:** `C:/Users/User/.codex/attachments/3358ae35-5562-4745-aa15-a803476a7204/Pasted text.txt`

## Global Constraints

- Branch must be `feature/t10-service-request-status` from merged T09 `main`.
- Supported statuses are exactly `Pending`, `In Progress`, `Completed`, and `Cancelled`.
- Allowed transitions are exactly Pending to In Progress/Cancelled and In Progress to Completed/Cancelled.
- Completed and Cancelled are terminal; same-status and unsupported targets are rejected.
- Invalid operations must not modify SQLite persistence or create records.
- Valid operations update only `status`; all other request and Resident information remains unchanged.
- T10 has no controller, route, REST API, UI, search/listing, deletion, history, or T11 behavior.

## Review Focus

- Missing request IDs must return not found without insertion.
- Same-status transitions must be rejected without persistence changes.
- SQL updates must target one existing request by ID and preserve all other columns.
- Existing requests remain processable after their Resident becomes Inactive.
- Updating one request must not alter another persisted request.

---

### Task 1: Status Domain and SQLite Update

**Files:**
- Modify: `src/models/ServiceRequest.js`
- Modify: `src/repositories/ServiceRequestRepository.js`
- Test: `test/serviceRequestStatus.test.js`

**Interfaces:**
- Produces: `ServiceRequestStatus.IN_PROGRESS`, `.COMPLETED`, `.CANCELLED`; `ServiceRequestRepository.updateStatus(id, status)` returning the updated request or `null`.

- [ ] Write failing tests proving the four supported status values and status-only SQLite update behavior.
- [ ] Run `node --test test/serviceRequestStatus.test.js` and confirm failure because T10 APIs do not exist.
- [ ] Add the status constants and a parameterized `UPDATE service_requests SET status = ? WHERE id = ?` repository method.
- [ ] Run the focused test and confirm the repository behavior passes.

### Task 2: Controlled Status Management Workflow

**Files:**
- Create: `src/services/ServiceRequestStatusService.js`
- Modify: `test/serviceRequestStatus.test.js`

**Interfaces:**
- Consumes: `ServiceRequestRepository.findById(id)` and `.updateStatus(id, status)`.
- Produces: `changeStatus(id, targetStatus)` returning flags for success, not found, unsupported status, and invalid transition plus the persisted request.

- [ ] Add all 13 required transition tests and the student-designed test that another request remains unchanged.
- [ ] Run the focused test and confirm failure because the workflow service does not exist.
- [ ] Implement supported-target validation and the exact transition map before calling persistence.
- [ ] Run focused tests and confirm valid transitions persist while every rejection preserves SQLite state.

### Task 3: Midterm Checkpoint Documentation

**Files:**
- Create: `docs/midterm-checkpoint.md`
- Read: `ABOUT_THE_DEVELOPER.md`, Git configuration, and implemented T10 files.

**Interfaces:**
- Produces: all seven required checkpoint sections matching the actual implementation and student-designed test.

- [ ] Record developer identity, stack, branch, implementation explanation, transition rules, changed files, the real implementation problem, student-designed test, and tools/references.
- [ ] Verify every documented file and test exists and every statement matches the code.

### Task 4: Regression, Runtime, and Delivery

**Files:**
- Review all staged T10 changes only.

**Interfaces:**
- Produces: verified T10 branch commit and pushed GitHub branch.

- [ ] Run `node --test test/serviceRequestStatus.test.js`.
- [ ] Run `npm test` and require zero failures across Starter through T10.
- [ ] Start the app and verify `/health` returns status `ok`.
- [ ] Review `git diff`, stage only intended T10 files, and review `git diff --staged`.
- [ ] Commit with `feat: manage service request status` and push `feature/t10-service-request-status`.
