# T11 Service Request Search and View Design

## Intent

T11 gives community-services staff a read-only application layer for listing, viewing, searching, and status-filtering persisted Service Requests. It extends the SQLite persistence introduced in T09 and preserves the controlled lifecycle from T10 without adding UI, HTTP endpoints, or new status transitions.

## Goals

- List every persisted Service Request in deterministic `dateRequested DESC, id DESC` order.
- View one persisted request by ID using the existing repository `findById(id)` behavior.
- Search `serviceType` or `description` with trimmed, partial, case-insensitive text matching.
- Filter by exactly `Pending`, `In Progress`, `Completed`, or `Cancelled`.
- Combine text and status conditions as `(serviceType OR description matches) AND status matches`.
- Keep non-blank search and filtering inside SQLite with bound parameters.
- Return empty collections for normal empty/no-match results and preserve every request field.

## Non-Goals and Anti-Goals

- No listing/search/details page, controller, route, REST endpoint, or dashboard.
- No pagination, date-range filtering, Resident joins, Resident-name search, or general ID search.
- No request mutation, deletion, assignment, priority, attachments, notifications, authentication, or T12 behavior.
- Do not load all requests and filter non-blank queries in application memory.
- Do not duplicate `findById`, the Service Request model, persistence, or T10 transition rules.

## Constraints

- Start from the merged T10 `main` and work only on `feature/t11-service-request-search-view`.
- Reuse `ServiceRequest`, `ServiceRequestStatus`, and `ServiceRequestRepository`.
- Direct SQL must use bound parameters.
- Every list/search/filter result uses `date_requested DESC, id DESC`.
- All Starter-through-T10 tests remain intact.
- Required commit: `feat: add service request search and viewing`.

## Approaches Considered

### Selected: One repository query with optional criteria

Add `ServiceRequestRepository.query({ searchTerm = '', status = null } = {})`. It builds one SQL statement from a small fixed set of trusted clauses while binding all user-supplied values. `findAll()` uses the same ordering and can delegate to `query()` with no criteria. This centralizes ordering and avoids repeated SQL while keeping filtering in SQLite.

### Alternative: Separate repository methods for every combination

Methods such as `searchByText`, `findByStatus`, and `searchByTextAndStatus` would be explicit, but they would repeat selection, mapping, and ordering logic. The duplication increases the chance that one query returns a different order or omits a field.

The unified repository query was selected because the criteria are limited, optional, and combinable, and because it gives one persistence-level implementation for every search/filter path.

## Architecture

### Repository layer

`ServiceRequestRepository` remains the only Service Request persistence component.

- `findById(id)` remains unchanged and is reused for viewing.
- `findAll()` returns all rows using `ORDER BY date_requested DESC, id DESC`.
- `query({ searchTerm, status })` selects all six request fields, adds a parenthesized `LOWER(service_type) LIKE ? OR LOWER(description) LIKE ?` clause for non-blank text, adds `status = ?` when supplied, combines clauses with `AND`, and applies the required ordering.
- Text parameters use `%${normalizedTerm.toLowerCase()}%`; status is passed as a bound value.
- Mapping continues through `_toServiceRequest(record)` so every returned object uses the existing model.

Only known SQL fragments are assembled. User values never become SQL text.

### Application/query layer

Create `ServiceRequestQueryService` with these public operations:

- `listServiceRequests()` returns `repository.findAll()`.
- `viewServiceRequest(id)` returns `repository.findById(id)`, including `null` for a missing ID.
- `searchServiceRequests(searchTerm = '', status = null)` returns a structured result:
  - Success: `{ success: true, unsupportedStatus: false, errors: [], serviceRequests: [...] }`.
  - Unsupported non-empty status: `{ success: false, unsupportedStatus: true, errors: ['Unsupported Service Request status filter.'], serviceRequests: [] }`.

The service trims string search input. Blank, whitespace-only, `null`, and `undefined` text become an empty query term. A missing (`null`/`undefined`) or empty-string status means no status filter. Any supplied non-empty status, including whitespace-padded input, must exactly match one of the four `ServiceRequestStatus` values before the repository is called.

The service coordinates use cases only; it contains no SQL and performs no row filtering.

## Data and Ordering Behavior

- All rows preserve `id`, `residentId`, `serviceType`, `description`, `dateRequested`, and `status`.
- Text search includes only `service_type` and `description`.
- One SQL query with an `OR` predicate prevents duplicate rows when both fields match.
- Completed and Cancelled records remain visible in unfiltered and matching queries.
- Query methods open SQLite in read-only mode and never update request or Resident data.

## Test Strategy

Create `test/serviceRequestQuery.test.js` using temporary SQLite databases and the real T09 repository/submission path. Cover all 14 required scenarios:

1. List all persisted requests.
2. Empty listing.
3. Required date/ID ordering.
4. View existing request.
5. Unknown ID with no insertion.
6. Partial, case-insensitive service-type search.
7. Partial, case-insensitive description search.
8. Blank search equals listing in the same order.
9. No-match search returns `[]`.
10. Status filter returns only matching records.
11. No status filter includes all four lifecycle states.
12. Combined text/status query returns only records satisfying both conditions.
13. Matching both text fields returns one row.
14. List/search/view preserve all six fields.

Additional assertions will cover unsupported non-empty status filters, consistent ordering for filtered results, `null`/`undefined` blank-search behavior, and read-only persistence state. T10's service will be used to reach non-Pending statuses legitimately where practical.

## Delivery and Verification

- Run focused T11 tests during red/green development.
- Run the complete Starter-through-T11 suite.
- Start the application and verify `/health` returns the expected payload.
- Review the staged diff, commit with the required message, push the required branch, and create a PR titled `T11 - Search and View Service Requests` in `UPHSL/csms-javascript-jaisemori`.
- Merge only after all checks pass, then update local `main`.

