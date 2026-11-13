# T14 CSMS Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only CSMS dashboard backed by database aggregate queries and a five-record recent Service Request query.

**Architecture:** Preserve repository/service/controller/view boundaries. Migrate Resident persistence to SQLite, aggregate both domains in their repositories, compose results in `DashboardService`, and render them through a GET-only dashboard route.

**Tech Stack:** Node.js 24, Express 5, EJS, `node:sqlite`, Node test runner, Supertest.

**Spec:** `docs/superpowers/specs/2026-11-12-t14-csms-dashboard-design.md`

## Global Constraints

- Branch: `feature/t14-csms-dashboard`.
- Commit: `feat: build csms dashboard`.
- Route: `GET /dashboard` only.
- Resident statuses remain exactly `Active` and `Inactive`.
- Service Request statuses remain exactly `Pending`, `In Progress`, `Completed`, and `Cancelled`.
- Open equals Pending plus In Progress and is not persisted as a status.
- Recent requests use `dateRequested DESC, id DESC` and `LIMIT 5`.
- Dashboard reads never modify persistence.
- All T01–T13 tests remain enabled and passing.

## Review Focus

- Empty databases return numeric zeroes and a safe empty state.
- Explicit legacy Resident IDs and generated new IDs coexist without duplicate records.
- Unknown stored statuses do not inflate supported status counts, while total reconciliation remains visible and testable.
- Recent-request limits cannot become unbounded or accept malformed input.
- Repeated dashboard GET requests leave both databases byte-for-byte/logically unchanged.

---

### Task 1: SQLite Resident Persistence and Aggregate Counts

**Files:**
- Modify: `src/repositories/ResidentRepository.js`
- Modify: `test/residentRegistration.test.js`
- Create: `test/dashboardRepository.test.js`

**Interfaces:**
- Produces: `ResidentRepository.getDashboardCounts(): { total: number, active: number, inactive: number }`.
- Preserves: `save`, `findById`, `findAll`, `searchByName`, `update`, and `deactivate` contracts.

- [ ] Write repository tests proving generated IDs, explicit-ID upserts, status counts, and no full-table retrieval for aggregation.
- [ ] Run `node --test test/dashboardRepository.test.js` and verify RED because aggregate methods do not exist.
- [ ] Replace JSON storage with SQLite persistence while preserving string IDs and current sort/search behavior.
- [ ] Update the existing invalid-registration persistence assertion to query the real repository instead of parsing the former JSON file.
- [ ] Run Resident tests and `test/dashboardRepository.test.js`; expect all PASS.

### Task 2: Service Request Aggregates and Recent Query

**Files:**
- Modify: `src/repositories/ServiceRequestRepository.js`
- Modify: `test/dashboardRepository.test.js`

**Interfaces:**
- Produces: `getDashboardCounts(): { total, pending, inProgress, completed, cancelled }`.
- Produces: `findRecent(limit = 5): ServiceRequest[]`.

- [ ] Add failing tests for all four status counts, total reconciliation, read-only behavior, `LIMIT 5`, and `dateRequested DESC, id DESC` ordering including terminal records.
- [ ] Run `node --test test/dashboardRepository.test.js`; expect RED for missing methods.
- [ ] Implement one conditional aggregate query and one ordered/limited SELECT in the repository.
- [ ] Run `node --test test/dashboardRepository.test.js`; expect PASS.

### Task 3: Dashboard Service, Route, and Presentation

**Files:**
- Create: `src/services/DashboardService.js`
- Create: `src/controllers/dashboardController.js`
- Create: `src/routes/dashboardRoutes.js`
- Create: `src/views/dashboard/index.ejs`
- Modify: `src/app.js`
- Modify: `src/views/residents/index.ejs`
- Modify: `src/views/service-requests/index.ejs`
- Modify: `src/views/service-requests/form.ejs`
- Modify: `src/views/service-requests/details.ejs`
- Modify: `public/css/style.css`
- Create: `test/dashboardInterface.test.js`

**Interfaces:**
- Produces: `DashboardService.getSummary()` with `residents`, `serviceRequests`, `openServiceRequests`, and `recentServiceRequests`.
- Produces: `GET /dashboard` rendering `dashboard/index`.

- [ ] Add 15 required T14 integration scenarios plus navigation, details-link reuse, malformed state resilience, and repeated GET immutability.
- [ ] Run `node --test test/dashboardInterface.test.js`; expect RED because `/dashboard` is not registered.
- [ ] Implement the service composition, thin controller/router, semantic EJS metrics, empty state, details links, and responsive styling.
- [ ] Add Dashboard navigation to all existing management views without changing their workflows.
- [ ] Run `node --test test/dashboardInterface.test.js`; expect PASS.

### Task 4: Full Verification and Required Commit

**Files:**
- Review all intended T14 files only.

**Interfaces:**
- Consumes all prior tasks and produces the merge-ready T14 branch.

- [ ] Run `npm test`; expect all T01–T14 tests PASS with zero failures or skips.
- [ ] Start the app and verify `/`, `/health`, `/dashboard`, `/residents`, `/service-requests`, and an existing T13 details route.
- [ ] Verify repeated dashboard loads do not change Resident or Service Request persistence.
- [ ] Review `git status`, `git diff`, and staged changes; remove generated data artifacts.
- [ ] Commit exactly `feat: build csms dashboard`.
- [ ] Push `feature/t14-csms-dashboard` and prepare PR title `T14 - Build the CSMS Dashboard` with complete verification evidence.
