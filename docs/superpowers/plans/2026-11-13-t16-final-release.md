# T16 Final Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Prepare, verify, document, merge, tag, and publish CSMS v1.0.0.

**Architecture:** Treat `package.json` as Node release metadata, read it through `src/config/application.js`, expose the frozen application configuration through Express locals, and consume the same object in `/health` and EJS views. Preserve all domain and persistence boundaries.

**Tech Stack:** JavaScript ES modules, Node.js 24, Express 5, EJS, SQLite (`node:sqlite`), Node test runner, Supertest.

**Spec:** `docs/superpowers/specs/2026-11-13-t16-final-release-design.md`

## Global Constraints

- Feature freeze: no new business capability.
- Never remove, skip, or weaken an existing test.
- Use real temporary SQLite files for the final integration test.
- Keep the release version in one logical runtime source.
- Do not tag or publish until merged `main` passes final verification.

### Task 1: Release Identity Contract

**Files:**
- Modify: `test/application.test.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/config/application.js`
- Modify: `src/app.js`
- Modify: `src/controllers/homeController.js`

1. Update application tests to require `1.0.0`, a safe `/health` payload, and the package-backed runtime version.
2. Run `node --test test/application.test.js`; expect a version assertion failure.
3. Set package metadata to `1.0.0`, read it from application configuration, and expose configuration through app locals.
4. Run the focused test; expect all application tests to pass.

### Task 2: Consistent Professional UI and Release Marker

**Files:**
- Modify: `test/dashboardInterface.test.js`
- Modify: `test/residentInterface.test.js`
- Modify: `test/serviceRequestInterface.test.js`
- Modify: `src/views/index.ejs`
- Modify: `src/views/dashboard/index.ejs`
- Modify: `src/views/residents/*.ejs`
- Modify: `src/views/service-requests/*.ejs`
- Modify: `public/css/style.css`

1. Add focused assertions that Dashboard, Resident Management, and Service Request Management display `CSMS v1.0.0`.
2. Run the three focused suites; expect release-marker failures.
3. Add the release marker through the shared app local, create a professional release landing page, and apply one responsive visual system to existing management page structures.
4. Rerun the focused suites; expect all to pass.

### Task 3: Final Examination Integration Test

**Files:**
- Create: `test/finalReleaseIntegration.test.js`

1. Write the real-persistence HTTP integration scenario described in the design.
2. Run the test before completing its assertions; confirm it fails because the expected release/UI contract is absent or deliberately includes an unmet final-state assertion.
3. Complete the smallest test and any required integration wiring without changing business rules.
4. Run the focused test; expect one passing final-exam scenario.

### Task 4: Release Documentation and Verification

**Files:**
- Create: `docs/release-v1.0.0.md`
- Create: `docs/final-checkpoint.md`

1. Run `npm test` twice and record exact passing counts.
2. Start the application and complete the required manual acceptance matrix against isolated persistence.
3. Write release notes and checkpoint content using only observed results and actual changed files.
4. Run `git diff --check`, inspect status/diff, and run the complete suite again before commit.

### Task 5: Required Git and Release Workflow

1. Stage only T16 files and inspect `git diff --staged`.
2. Commit with `release: prepare csms v1.0.0`.
3. Push `feature/t16-final-release` and create PR `T16 - Final System Release and Development Checkpoint` with concise evidence.
4. Review changed files, merge to personal `main`, update local `main`, and rerun the full suite plus manual version checks.
5. Create and push annotated tag `v1.0.0` only from verified merged `main`.
6. Create GitHub Release `CSMS v1.0.0` from the tag using the release notes.

## Review Focus

- Version drift between package metadata, `/health`, home, and management views.
- Any sensitive or internal data in `/health`.
- Whether the final test truly uses real persistence and crosses at least three existing responsibilities.
- Whether documentation claims exactly match commands and observed behavior.
- Feature-freeze compliance and absence of generated/runtime artifacts.
