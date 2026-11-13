# T14 CSMS Dashboard Design

## Intent

Build a browser-accessible, read-only operational dashboard that summarizes persisted Residents and Service Requests without introducing new business rules or mutating records.

## Goals

- Display Resident totals for all, Active, and Inactive records.
- Display Service Request totals for all four existing statuses and derive Open as Pending plus In Progress.
- Show at most five recent requests ordered by `dateRequested DESC, id DESC`, linking to the existing T13 details page.
- Perform counting, ordering, and limiting in persistence repositories.
- Preserve all T01–T13 behavior and keep dashboard GET requests read-only.

## Non-goals

Authentication, exports, charts, date filters, pagination, new statuses, history, analytics, and any mutation from the dashboard are excluded.

## Constraints

- Use Express, EJS, and the existing Node SQLite API.
- Keep SQL out of controllers, services, and templates.
- Keep rendering out of repositories and services.
- Use the required branch, commit title, and pull-request title.

## Approaches Considered

1. **SQLite aggregation for both domains (selected).** Migrate Resident persistence from JSON to SQLite while preserving the repository contract, then add SQL aggregate methods to both repositories. This fully satisfies the database-level aggregation rubric and the earlier persistence feedback.
2. **JSON Resident counting plus SQLite Service Request aggregation.** Smaller change, but Resident metrics would not use database-level aggregation and would risk losing architecture points.
3. **Load all records in a Dashboard service.** Rejected because it directly violates the requirement not to retrieve entire tables for counts.

## Architecture

`ResidentRepository.getDashboardCounts()` returns total/Active/Inactive counts from one SQL aggregate query. `ServiceRequestRepository.getDashboardCounts()` returns total and all four status counts from one SQL aggregate query, while `findRecent(limit)` performs the required ordering and limit in SQL. `DashboardService.getSummary()` combines those results and derives Open without creating a new status. A thin Dashboard controller and router render an EJS view at `/dashboard`.

Resident persistence retains its public methods and string IDs, while SQLite supplies generated IDs for new records. Existing explicit IDs remain upsert-compatible for earlier tests and behavior. Navigation is updated across the T12/T13 management views to include Dashboard.

## Read-only Behavior

Dashboard repository calls open databases read-only and execute only `SELECT` statements. The route supports only GET. Automated tests compare persisted records before and after repeated dashboard requests.

## Error and Empty States

Empty persistence produces zero metrics and a clear recent-request empty state. The recent-query limit is normalized to a safe positive integer, with the Dashboard service requesting exactly five.

## Verification

Add T14 integration and repository tests covering all 15 required scenarios, SQL-level aggregation behavior, ordering/limit, T13 details links, and repeated GET immutability. Run the complete T01–T14 suite and manually verify `/`, `/health`, `/dashboard`, `/residents`, `/service-requests`, and a recent request’s details link.
