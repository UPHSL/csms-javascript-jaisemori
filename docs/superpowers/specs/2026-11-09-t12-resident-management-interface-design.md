# T12 Resident Management Interface Design

## Intent

Expose the existing T01–T07 Resident capabilities to community-services staff through a browser-based, server-rendered Express interface. The presentation layer coordinates HTTP requests and views while all validation, persistence, search ordering, update rules, and deactivation behavior remain owned by the existing model, repository, and services.

## Goals

- Provide resident listing/search, registration, editing, and soft-deactivation pages.
- Preserve T05 ordering and search behavior by delegating to `ResidentService`.
- Delegate registration, update, and deactivation to the T04, T06, and T07 services.
- Use PRG after successful mutations and render authoritative validation errors after failures.
- Return a controlled HTML 404 for missing edit/deactivation targets.
- Keep every GET route read-only and retain all prior behavior.

## Non-Goals

- No Service Request UI, dashboard, authentication, pagination, deletion, reactivation, status filtering, SPA framework, or T13 functionality.
- No SQL, persistence, sorting, searching, or business validation in controllers or templates.
- No new runtime dependency or session store.

## Constraints

- Branch: `feature/t12-resident-management-interface`, created from merged T11 `main`.
- Server-rendered EJS only; mutations use POST.
- Existing JSON Resident persistence and T02/T04/T05/T06/T07 services are reused.
- Required commit: `feat: build resident management interface`.

## Approaches Considered

### Selected: Dependency-injected Resident router

`createApp({ residentRepository } = {})` creates default production persistence when no repository is supplied or accepts a temporary real repository in integration tests. A resident router constructs the existing services and delegates each request to a focused controller. This keeps application composition explicit and tests deterministic without mocks.

### Rejected: Module-level repository singleton

This is smaller initially but makes integration tests share the production data path and couples module loading to filesystem state.

### Rejected: Controller-owned persistence and validation

Direct repository writes or duplicated validation would violate the ticket boundaries and make the browser behavior diverge from T02–T07.

## HTTP and View Design

- `GET /residents`: list/search via `ResidentService`; render table, empty state, status text, actions, and optional success message.
- `GET /residents/register`: render an empty Resident form.
- `POST /residents`: allowlist the five editable fields, construct a `Resident`, call `ResidentRegistrationService.register`, render errors with submitted values or redirect to `/residents?message=...`. Crafted `id` and `status` body values are ignored.
- `GET /residents/:id/edit`: load through `ResidentService.findResidentById`; missing records render controlled HTML 404.
- `POST /residents/:id`: allowlist the five editable fields and call `ResidentUpdateService.updateResident`; on invalid input, reload the persisted record through the query service so its read-only ID/status can be combined with attempted editable values; redirect on success. Crafted `id` and `status` values are ignored.
- `POST /residents/:id/deactivate`: call `ResidentDeactivationService.deactivateResident`; missing records render 404, otherwise redirect with an appropriate success/already-inactive message.

Views live under `src/views/residents/`: `index.ejs`, `form.ejs`, and `not-found.ejs`. The form uses labeled fields and displays ID/status as read-only text only in edit mode. The list shows all required fields and hides the deactivation button for Inactive residents.

## Feedback and Error Handling

Successful mutations use PRG with a URL-encoded `message` query parameter; no session dependency is needed. Validation failures return HTTP 400 and render the same form with service-provided errors and entered values. Missing targets return HTTP 404 without exposing internal details.

T04 currently uses a weaker utility validator than the T02 domain model. Before exposing registration, `ResidentRegistrationService` will be corrected to use `Resident.validate()` as the authoritative validation contract. This change remains in the application layer, is covered by a focused regression test, and prevents invalid contact numbers from being persisted without adding controller validation.

## Testing

`test/residentInterface.test.js` uses Supertest with a temporary real `ResidentRepository`. It covers all 14 required scenarios, field/action rendering, PRG, persistence, validation integrity, missing records, inactive visibility, ordering/search delegation, and GET safety. Full Starter–T12 regression and live `/health` verification follow.

Non-string/repeated search query values are normalized at the HTTP boundary so malformed requests render safely without leaking an internal stack trace.
