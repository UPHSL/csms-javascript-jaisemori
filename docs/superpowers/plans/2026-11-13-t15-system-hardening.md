# T15 System Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the T01-T14 CSMS into a regression-safe T16 release candidate.

**Architecture:** Preserve the existing Express/service/repository design. Enforce canonical Service Request IDs at the SQLite repository boundary, verify behavior through real integration tests, and document actual release evidence.

**Tech Stack:** Node.js 24, Express 5, EJS, `node:sqlite`, Node test runner, Supertest.

**Spec:** `docs/superpowers/specs/2026-11-13-t15-system-hardening-design.md`

## Global Constraints

- Feature freeze: no major features, new domain fields/statuses, authentication, pagination, reporting, or UI redesign.
- Preserve all T01-T14 business rules and existing tests.
- Rejected operations must not mutate persistence; GET requests remain read-only; SQL remains parameterized.
- Add at least five meaningful tests covering the five required T15 categories.
- Run the full suite twice consecutively and record both results.

## Review Focus

- Numeric aliases such as `1e0` must not resolve to Service Request ID `1`.
- Repeated rejected transitions must preserve every persisted field.
- Combined read-only access across all modules must not alter records.
- Resident deactivation must update Dashboard counts and block new requests without deleting history.
- Terminal Service Requests must remain searchable/viewable while rejecting all further transitions.

---

### Task 1: Persistence-safe Service Request identifiers

**Files:**
- Create: `test/t15Hardening.test.js`
- Modify: `src/repositories/ServiceRequestRepository.js`

**Interfaces:**
- Consumes: `createApp`, `ResidentRepository`, and `ServiceRequestRepository` public APIs.
- Produces: repository lookup/update behavior that accepts positive integer values or canonical digit strings only.

- [ ] Add five real integration tests for malformed input, rejected mutation, GET safety, cross-feature regression, and repeatable terminal-state protection.
- [ ] Run `node --test test/t15Hardening.test.js`; verify the malformed exponential ID test fails because ID `1` is currently aliased.
- [ ] Add a private canonical-ID normalization helper in `ServiceRequestRepository`; return `null` before opening a database for invalid IDs.
- [ ] Run `node --test test/t15Hardening.test.js`; expect all five tests to pass.
- [ ] Run `npm test`; expect the original 189 plus five new tests to pass.

### Task 2: Release readiness and manual verification

**Files:**
- Create: `docs/t15-release-readiness.md`

**Interfaces:**
- Consumes: actual baseline, test, HTTP, and repository evidence.
- Produces: the nine-section T15 report and Moodle-ready release status.

- [ ] Start the real application against isolated temporary databases and verify startup plus `/health`.
- [ ] Execute the required manual HTTP/domain scenarios with isolated persistence and record PASS/FAIL evidence.
- [ ] Review debug output, temporary/generated files, secrets, commented experiments, navigation, and SQL binding.
- [ ] Write all nine required report sections using only observed results.

### Task 3: Repeatability and final release gate

**Files:**
- Modify: `docs/t15-release-readiness.md`

**Interfaces:**
- Consumes: complete branch and all automated/manual evidence.
- Produces: two recorded clean regression runs and final release-candidate statement.

- [ ] Run `npm test` twice immediately one after the other; both runs must pass with identical totals.
- [ ] Inspect `git status`, `git diff`, tracked artifacts, and changed files for scope compliance.
- [ ] Record final results and `READY FOR T16 FINAL EXAM` only if all release gates pass.
- [ ] Perform an independent whole-branch review and address any Important/Critical finding with RED-GREEN evidence.
- [ ] Commit intended T15 files with `chore: harden csms for release`.
