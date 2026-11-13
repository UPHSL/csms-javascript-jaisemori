# T16 Final Release Design

## Intent

Prepare the hardened T15 system as the reproducible CSMS v1.0.0 final course release without adding business features or changing established Resident, Service Request, workflow, persistence, or Dashboard behavior.

## Goals

- Make `1.0.0` the running application's single authoritative release version.
- Report CSMS identity, version, and healthy status safely through `/health`.
- Display `v1.0.0` consistently in the existing server-rendered interface.
- Add one meaningful real-persistence integration test crossing established modules.
- Produce accurate release notes and the required final development checkpoint.
- Preserve every valid T01-T15 test and feature-freeze boundary.

## Non-goals

Authentication, authorization, new domain fields or statuses, reactivation, deletion, reporting, exports, notifications, external APIs, frontend frameworks, and any other new business module remain out of scope.

## Constraints

- Start from verified T15 `main` and work only on `feature/t16-final-release`.
- Use the existing JavaScript, Express, EJS, and SQLite architecture.
- Do not duplicate release values across unrelated controllers and views.
- Tag and publish only after the T16 PR is merged and `main` is reverified.

## Approaches Considered

1. **Use `package.json` as release metadata and expose it through application configuration (selected).** This follows Node.js conventions, keeps package and runtime identity aligned, and lets `/health` plus all EJS views consume one value.
2. **Keep a literal version in `src/config/application.js`.** This is simple but leaves `package.json` as a conflicting project version and makes release metadata easier to drift.
3. **Use an environment variable.** This supports deployments but makes the required course release non-reproducible unless every launch supplies external configuration.

The selected approach reads `package.json` once through the existing application configuration module. Express app locals expose that frozen configuration to every view; the health controller imports the same object.

## Presentation

The existing route, form, table, and workflow structures remain intact. Dashboard, Resident, and Service Request pages gain a release footer showing `CSMS v1.0.0`; the home page becomes a professional release landing page using the same navigation and release identity. Shared responsive styles align management lists, forms, details, empty states, and controlled error pages with the established Dashboard visual language without changing application behavior.

## Final Examination Test

The new test begins with isolated empty Resident and Service Request SQLite databases. Through real HTTP routes it registers an Active Resident, submits a request, advances Pending to In Progress to Completed, queries the completed request, and checks Dashboard aggregates. It then verifies the exact persisted Resident and request state through fresh repository reads. This crosses validation/registration, generated-ID persistence, eligibility, request submission, lifecycle rules, querying, and Dashboard aggregation.

## Verification and Release

Automated coverage verifies the package-backed version, `/health`, and UI release marker. The complete suite runs twice on the feature branch and once after merge. Manual acceptance checks startup, health safety, primary pages, workflow protection, read-only behavior, navigation, and consistent version display before the annotated tag and GitHub Release are created.
