# T10 Midterm Checkpoint

## 1. Developer Information

- **Name:** David Jeremy N. Contreras
- **GitHub Username:** jaisemori
- **Primary Technology Stack:** JavaScript with Express.js
- **T10 Branch:** `feature/t10-service-request-status`

## 2. My T10 Implementation

The `ServiceRequestStatusService` manages the status-change workflow below the presentation layer. It receives a Service Request ID and requested target status, then retrieves the existing request through `ServiceRequestRepository.findById()`. The service reads the current persisted status and checks the requested target against the four supported status values. It then checks a transition map that contains only the transitions allowed by T10. Invalid, same-status, terminal-state, unsupported-status, and not-found operations return structured failure results before any database update occurs. Valid transitions call `ServiceRequestRepository.updateStatus()`, which uses a parameterized SQLite `UPDATE` statement targeting the correct request ID. The repository updates only the status column and returns the persisted request, so its ID, Resident association, service type, description, and request date remain unchanged.

## 3. My Transition Rules

The allowed transitions are:

- `Pending` to `In Progress`
- `Pending` to `Cancelled`
- `In Progress` to `Completed`
- `In Progress` to `Cancelled`

`Pending` to `Completed` is rejected because processing must begin before a request can be completed. `Completed` is terminal because a finished request cannot return to an earlier lifecycle state. `Cancelled` is also terminal because reopening or reactivation is outside T10. A request for the current status, such as `Pending` to `Pending`, is rejected as an invalid transition and does not change persistence.

## 4. Files I Changed

- **File:** `src/models/ServiceRequest.js`
  **Purpose:** Defines the four supported Service Request status values.
- **File:** `src/repositories/ServiceRequestRepository.js`
  **Purpose:** Adds the parameterized SQLite status-only update for an existing Service Request.
- **File:** `src/services/ServiceRequestStatusService.js`
  **Purpose:** Retrieves requests, handles not found and unsupported targets, enforces the transition table, and requests persistence only for valid transitions.
- **File:** `test/serviceRequestStatus.test.js`
  **Purpose:** Covers the 13 required scenarios, the inactive-Resident distinction, and the student-designed test.
- **File:** `docs/midterm-checkpoint.md`
  **Purpose:** Documents the actual T10 architecture, rules, files, problem, test, and tools used.

## 5. Problem I Encountered

The T09 Pull Request had already been merged before the SQLite persistence correction was added to the feature branch. When I checked whether correction commit `8333f58` was included in `origin/main`, the verification printed `T09_NOT_ON_MAIN`. This meant T10 could not safely start from the current main branch because it would inherit the rejected JSON/manual-ID persistence. I investigated the branch history and confirmed that `origin/main` contained original T09 commit `41c11ef` but not the SQLite correction. I resolved the problem by merging the corrected T09 feature branch into personal `main`, running all 84 Starter-through-T09 tests, pushing the verified main branch, and only then creating `feature/t10-service-request-status`.

## 6. My Student-Designed Test

- **Test Name:** `Student-Designed Test: changing one request leaves another request unchanged`
- **What the Test Verifies:** It submits two Service Requests, changes only the first request to `In Progress`, and verifies that the second request remains `Pending` with its original description.
- **Why I Added This Test:** A status update must target exactly one persisted Service Request ID and must not affect another request stored in the same SQLite database.

## 7. Tools and References Used

- Node.js 24 and the built-in `node:sqlite` API for SQLite persistence.
- Node.js test runner for automated T10 and regression testing.
- Git and GitHub Classroom for branch, commit, push, and Pull Request workflow.
- npm scripts for complete regression verification.
- Visual Studio Code and PowerShell as development tools.
- OpenAI Codex as an AI coding assistant for planning, implementation support, test design, review, and verification. I remain responsible for understanding and defending the submitted code.
