# T12 Resident Management Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the server-rendered Resident Management interface by connecting Express/EJS presentation to the existing T02–T07 Resident architecture.

**Architecture:** Add an injected Resident router/controller composition to `createApp`, render focused EJS pages, and use the existing services for every business operation. Integration tests use Supertest and real temporary JSON persistence.

**Tech Stack:** JavaScript ES modules, Express 5, EJS 6, Supertest, Node test runner, JSON Resident persistence.

**Spec:** `docs/superpowers/specs/2026-11-09-t12-resident-management-interface-design.md`

## Global Constraints

- Work only on `feature/t12-resident-management-interface` from merged T11 `main`.
- Reuse T02, T04, T05, T06, and T07; no duplicated business rules or presentation-layer persistence.
- GET requests are read-only; registration, update, and deactivation use POST.
- No Service Request UI, SPA, deletion/reactivation, pagination, authentication, or T13 behavior.
- Preserve all Starter–T11 tests and include the required commit message.

## Review Focus

- HTML escaping for persisted/submitted Resident values.
- Whitespace-only search delegates to the existing all-residents behavior.
- Invalid POSTs preserve values without writing persistence.
- Missing and repeated deactivation requests remain controlled.
- ID/status never appear as editable form fields.

---

### Task 1: App Composition, Listing, and Search

**Files:**
- Modify: `src/app.js`
- Create: `src/routes/residentRoutes.js`
- Create: `src/controllers/residentController.js`
- Create: `src/views/residents/index.ejs`
- Create: `test/residentInterface.test.js`

**Interfaces:**
- Consumes: `ResidentRepository`, `ResidentService.listResidents()`, `ResidentService.searchResidents(term)`.
- Produces: injected `createApp({ residentRepository })`, `GET /residents`, and reusable Resident controller/router composition.

- [ ] Write failing integration tests for management page, persisted listing/order, partial case-insensitive search, blank search, empty/no-match states, and listing/search GET safety.
- [ ] Run the focused test and verify the routes fail as missing.
- [ ] Implement app injection, router/controller listing/search delegation, and the index view.
- [ ] Run focused and complete tests; verify green.
- [ ] Commit a meaningful listing/search checkpoint.

### Task 2: Registration and Update Forms

**Files:**
- Modify: `src/services/ResidentRegistrationService.js`
- Modify: `test/residentRegistration.test.js`
- Modify: `src/controllers/residentController.js`
- Modify: `src/routes/residentRoutes.js`
- Create: `src/views/residents/form.ejs`
- Create: `src/views/residents/not-found.ejs`
- Modify: `test/residentInterface.test.js`

**Interfaces:**
- Consumes: `ResidentRegistrationService.register(resident)`, `ResidentUpdateService.updateResident(id, proposedData)`, and `ResidentService.findResidentById(id)` for edit-form display.
- Produces: authoritative T02 validation in registration, registration/edit GET routes, allowlisted POST mutations, PRG success feedback, HTTP 400 validation forms, and controlled HTML 404.

- [ ] Write a failing T04 regression test proving an invalid contact number is rejected and not persisted.
- [ ] Correct `ResidentRegistrationService.register()` to use `Resident.validate()` rather than the weaker utility validator; run T04 tests green.
- [ ] Write failing tests for form fields, valid/invalid registration, edit display, valid/invalid update, missing ID, field preservation, crafted ID/status rejection, and non-editable ID/status.
- [ ] Run focused tests and verify expected failures.
- [ ] Implement the form routes/controller behavior and shared form/not-found views; allowlist only the five editable fields and reload persisted ID/status when rendering an invalid update.
- [ ] Run focused and complete tests; verify green.
- [ ] Commit a meaningful forms checkpoint.

### Task 3: Deactivation, Styling, and Delivery

**Files:**
- Modify: `src/controllers/residentController.js`
- Modify: `src/routes/residentRoutes.js`
- Modify: `src/views/residents/index.ejs`
- Modify: `public/css/style.css`
- Modify: `test/residentInterface.test.js`
- Include: T12 design and plan documents.

**Interfaces:**
- Consumes: `ResidentDeactivationService.deactivateResident(id)`.
- Produces: POST-only soft-deactivation, Inactive presentation, responsive usable styling, and all 14 required integration scenarios.

- [ ] Write failing tests for deactivation, inactive visibility/searchability, hidden inactive action, repeated direct deactivation, missing target handling, and complete GET safety across listing, search, registration form, and edit form.
- [ ] Run focused tests and verify expected failures.
- [ ] Implement deactivation and complete responsive styling/accessibility details.
- [ ] Run `git diff --check`, focused T12 tests, and the complete Starter–T12 suite.
- [ ] Start the application and manually verify the ten browser scenarios plus `/health`.
- [ ] Review intended diff and create required commit `feat: build resident management interface`.
- [ ] Push and create PR `T12 - Build the Resident Management Interface`; merge only after checks pass, then update local `main`.
