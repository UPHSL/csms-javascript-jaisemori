# T16 Final Development Checkpoint

## 1. Developer Information

- **Name:** David Jeremy N. Contreras
- **GitHub Username:** jaisemori
- **Technology Stack:** JavaScript, Node.js 24, Express.js 5, EJS, and SQLite (`node:sqlite`)
- **T16 Branch:** `feature/t16-final-release`
- **Final Release Version:** 1.0.0

## 2. My Final Release Implementation

I established the authoritative release version in `package.json`, which is the conventional metadata location for a Node.js application and is also reflected by npm. The existing `src/config/application.js` module reads that value once and includes it in a frozen application configuration object. The `/health` controller imports that shared object and returns only the application name, version, and healthy status. Express exposes the same configuration object through application locals, so every EJS view can display the release without maintaining its own version literal. The release landing page presents the version in a professional status card, while the Dashboard and management interfaces present `CSMS v1.0.0` in consistent footer areas. Shared, responsive CSS gives lists, forms, details, error pages, navigation, controls, and release information one professional visual system without changing their business behavior. This design prevents package metadata, health output, and browser presentation from drifting independently and follows the project's existing configuration, controller, Express-local, and server-rendered EJS conventions.

## 3. Files I Changed

- **`package.json` and `package-lock.json`:** Establish the official Node package release metadata as version 1.0.0.
- **`src/config/application.js`:** Reads package metadata and provides the frozen, shared CSMS release identity.
- **`src/app.js`:** Exposes shared application configuration to all EJS templates through Express application locals.
- **`src/controllers/homeController.js`:** Removes redundant release values from the home render payload so the shared application object remains authoritative.
- **`src/views/dashboard/index.ejs`:** Displays the release version in the existing Dashboard footer and exposes a semantic release-version marker.
- **`src/views/residents/*.ejs` and `src/views/service-requests/*.ejs`:** Display the same shared release identity throughout management, form, detail, and controlled not-found pages.
- **`src/views/index.ejs` and `public/css/style.css`:** Provide the professional release landing page and the shared responsive visual system used across all pages.
- **`commitlint.config.mjs`:** Allows the required `release:` Conventional Commit type used by the prescribed T16 commit message.
- **`test/application.test.js`:** Verifies `/health`, browser release text, package metadata, and runtime-version consistency.
- **`test/finalReleaseIntegration.test.js`:** Implements the student-designed, real-persistence Final Examination scenario.
- **`docs/release-v1.0.0.md`:** Records capabilities, quality work, verification evidence, and known limitations for the official release.
- **`docs/final-checkpoint.md`:** Documents the T16 implementation, judgment, test, verification issue, results, and tools.

## 4. My Final Examination Test

- **Test Name:** `completed eligible Resident request persists and reconciles across query and release Dashboard`
- **Modules/Responsibilities Covered:** Resident validation and registration, Resident SQLite persistence, Service Request eligibility and submission, generated request persistence, controlled status workflow, search/filter querying, Dashboard aggregation, release-version presentation, and fresh repository retrieval.
- **Starting State:** Two isolated, empty SQLite databases are created for Residents and Service Requests.
- **Operations Performed:** The test registers an Active Resident through HTTP, submits an eligible Service Request, advances it from Pending to In Progress and then Completed, searches for the completed request, loads the Dashboard, and reopens both databases through fresh repository instances.
- **Expected Final State:** Exactly one Active Resident and one Completed Service Request remain persisted; the request preserves its Resident relationship and submitted information; querying finds the completed request; Dashboard totals reconcile to one Resident, one Completed request, and zero Open requests; and the Dashboard reports release version 1.0.0.
- **Why This Test Is Meaningful:** The scenario proves that multiple established application layers cooperate through actual HTTP handling and SQLite persistence. It is stronger than an isolated unit test because it would detect broken routing, validation, generated identifiers, eligibility, workflow transitions, queries, persistence reopening, aggregate calculations, or release presentation within one release-critical flow.

## 5. My Final Technical Decision

- **Decision:** Use `package.json` as the authoritative release-version metadata and expose it through the existing application configuration object.
- **Alternative Considered:** Keep a separate literal version in `src/config/application.js` or depend on an environment variable.
- **Reason for My Decision:** A second literal would allow npm/package identity and runtime identity to disagree, while a required environment variable would make the course release dependent on external launch configuration. Reading package metadata through the existing configuration boundary keeps Node release metadata, `/health`, and EJS presentation synchronized with minimal architecture.

## 6. Problem or Verification Issue Encountered

- **Problem:** The repository rejected the exact required commit message, `release: prepare csms v1.0.0`, even after all 197 pre-commit tests passed.
- **Cause or Investigation:** The commit-message hook uses Commitlint with a custom type allowlist. The configuration supported feature, fix, documentation, test, merge, and related types, but it did not include the `release` type prescribed by T16.
- **Resolution:** I added `release` to the existing Commitlint type allowlist instead of bypassing the hook or changing the professor-required message. Commitlint then accepted the exact T16 release message while retaining every other repository commit policy.

## 7. Final Regression Results

- **Test Command:** `npm test` (`node --test`)
- **Final Regression Run 1:** PASS - 197 passed, 0 failed, 0 skipped; 17 suites; 7917.6085 ms
- **Final Regression Run 2:** PASS - 197 passed, 0 failed, 0 skipped; 17 suites; 5871.1599 ms
- **Total Passing Tests Reported:** 197

Both complete runs were executed consecutively from `feature/t16-final-release` after the final shared-navigation correction. An isolated direct-HTTP acceptance run also passed startup, health, Dashboard, Resident Management, Service Request Management, valid and rejected workflows, read-only persistence checks, navigation, and version consistency.

## 8. Tools and References Used

- Existing CSMS architecture, developer documentation, T15 release-readiness report, and prior automated tests.
- Node.js 24 documentation and runtime behavior, including ES modules, the built-in test runner, and `node:sqlite`.
- Express.js and EJS conventions already established in the repository.
- npm package metadata, Git, and GitHub Classroom release workflow.
- PowerShell and Visual Studio Code for local development and verification.
- OpenAI Codex as an AI coding assistant for planning, implementation support, test design, review, documentation, and verification. I remain responsible for understanding and defending every submitted change.

## 9. Final Release Declaration

**CSMS v1.0.0 - READY FOR RELEASE**
