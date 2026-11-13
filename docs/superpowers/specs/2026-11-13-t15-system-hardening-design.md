# T15 System Hardening Design

## Intent

Prepare the completed T01-T14 CSMS as a stable release candidate without adding features. The work protects persistence from malformed identifiers and rejected mutations, verifies read-only routes and cross-feature behavior, and records reproducible release evidence.

## Scope and constraints

- Preserve every Resident, Service Request, search, workflow, and Dashboard rule from T01-T14.
- Keep Express, EJS, Node SQLite, the current layered architecture, and the existing interface.
- Add no authentication, new fields, statuses, workflows, reporting, pagination, frontend framework, or other out-of-scope capability.
- Keep all SQL parameterized and all GET operations read-only.

## Approaches considered

1. **Focused boundary hardening (selected):** validate Service Request identifiers before numeric conversion, then prove behavior through real HTTP/repository integration tests. This fixes the concrete aliasing risk with the smallest release-safe change.
2. **Controller-only validation:** reject malformed route parameters in each controller. This duplicates identifier policy and leaves direct repository/service callers exposed.
3. **Broad architecture rewrite:** introduce centralized validation middleware and transaction abstractions. This creates unnecessary feature-freeze risk and is outside T15's purpose.

## Design

The Service Request repository is the persistence boundary and will accept only canonical positive integer IDs for lookup and mutation. Values such as `1e0`, whitespace-padded numbers, decimals, zero, negatives, and non-numeric text will return `null` without executing a matching query or update. Existing integer and canonical numeric-string callers remain compatible.

A dedicated `test/t15Hardening.test.js` integration suite will use isolated SQLite files and real Express routes. Its five tests cover malformed input, rejected mutation integrity, read-only GET safety, cross-feature deactivation/dashboard/submission behavior, and repeatable terminal-state protection. The release-readiness report will record the baseline, hardening review, test evidence, manual verification, hygiene review, known limitations, and release decision.

## Success criteria

All 189 baseline tests remain intact, the five new T15 tests pass, two consecutive full-suite runs pass, manual release checks pass, and no release-blocking limitation remains within the defined scope.
