# Preliminary Examination Developer Checkpoint

## Developer Information
- **Name:** David Jeremy N. Contreras
- **GitHub Username:** jaisemori
- **Primary Technology Stack:** JavaScript (Node.js / Express)
- **T03 Branch:** feature/t03-resident-persistence

## My T03 Implementation
Resident data is stored on disk inside a JSON file (`data/residents.json`). The `ResidentRepository` component is responsible for reading from and writing to this storage layer. When a Resident is saved using `save()`, the system checks whether an ID is already provided; if not, an ID is automatically generated based on the highest existing record identifier. The record is then written to disk using synchronous file system operations to guarantee immediate persistence. Retrieval is performed using `findById()`, which parses the stored JSON data and returns a matching `Resident` instance. If the specified ID does not exist in the JSON file, `findById()` safely returns `null` without throwing errors or crashing the application.

## Files I Changed
1. **File:** `src/repositories/ResidentRepository.js`
   - **Purpose:** Handles persistent storage operations (read, write, save, findById) for Resident data using JSON file storage.

2. **File:** `test/residentPersistence.test.js`
   - **Purpose:** Contains unit tests covering all required persistence scenarios and the custom student-designed test case.

3. **File:** `docs/prelim-checkpoint.md`
   - **Purpose:** Documents the developer examination details, implementation explanation, problem resolution, and testing choices.

## Problem I Encountered
- **Problem or error:** `TypeError: Cannot read properties of null (reading 'toString')` when attempting to persist contact numbers.
- **Cause:** When testing empty or unassigned properties during persistence conversion, passing non-string items into strict string formatting methods produced null references.
- **How I resolved it:** Added an explicit fallback check (`String(resident.contactNumber)`) within `ResidentRepository.js` to ensure textual properties preserve formatting without causing type conversion crashes.

## My Student-Designed Test
- **Test name:** `Student-Designed Test: should update an existing resident record when saving with an existing ID`
- **What it verifies:** Verifies that calling `repo.save()` with a Resident object whose ID already exists in storage overwrites/updates the existing record rather than creating a duplicate entry.
- **Why I chose this scenario:** In real-world CRUD operations, persistence layers must handle updates gracefully. This test guarantees that saving existing records prevents data duplication and keeps storage clean.

## Tools and References Used
- **Course guide & assignment criteria:** Guidance for required ticket behavior, test structure, and branch naming rules.
- **Node.js Documentation (`fs` & `path` modules):** Reference for synchronous file system access (`readFileSync`, `writeFileSync`, `existsSync`).
- **Node.js Test Runner Documentation:** Reference for `describe` and `it` test structure.
- **AI Assistant:** Assisted with formatting test suite structure and refining documentation summaries.