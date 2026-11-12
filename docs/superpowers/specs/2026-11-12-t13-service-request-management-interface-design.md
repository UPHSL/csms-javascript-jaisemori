# T13 Service Request Management Interface Design

## Intent

Add a browser-accessible, server-rendered Service Request Management interface for staff. The interface must expose T09 submission, T10 workflow transitions, and T11 query/detail behavior without duplicating their business or persistence rules.

## Goals

- List requests in T11 order with search, exact status filtering, details, and status-appropriate actions.
- Submit requests through T09 with persistence-generated IDs and Pending status.
- Process Pending and In Progress requests only through T10 transitions.
- Keep terminal requests visible and all GET routes read-only.
- Match the Express/EJS conventions and styling established by T12.

## Non-goals

No authentication, dashboard, assignment, priority, attachments, notifications, history, editing, deletion, reopening, pagination, reporting, or separate frontend.

## Constraints

- Use Express routes/controllers and EJS templates.
- Templates never access repositories; controllers remain thin.
- State changes use POST and all authoritative decisions remain in T09/T10/T11 services.
- Preserve every T01–T12 behavior and test.

## Approaches

1. **Thin integrated controller/router (selected):** create one Service Request controller and router that compose the three existing services and render three EJS views. This mirrors T12, keeps dependencies explicit, and minimizes new concepts.
2. **Add handlers to the Resident controller:** fewer files, but mixes unrelated features and makes dependency composition harder to maintain.
3. **Build client-side UI over JSON endpoints:** conflicts with the server-rendered requirement and would duplicate presentation and validation behavior.

## Design

`createApp` owns default Resident and Service Request repositories and accepts both as injectable test dependencies. `createServiceRequestRouter` constructs T09, T10, and T11 services and injects them into `ServiceRequestController`.

Routes:

- `GET /service-requests` — list/search/filter through T11.
- `GET /service-requests/submit` — submission form.
- `POST /service-requests` — T09 submission, PRG redirect on success.
- `GET /service-requests/:id` — complete T11 details or controlled 404.
- `POST /service-requests/:id/status` — allowlisted target value passed to T10; controlled error or PRG redirect.

Views expose only actions valid for the currently rendered status. The status endpoint remains protected by T10 when invoked directly with invalid or unsupported transitions. Messages are query-string feedback following T12's PRG convention.

## Error and Edge Handling

- Repeated or non-string query parameters normalize to safe empty values.
- Unsupported status filters render a controlled 400 response with T11's error.
- Invalid form submissions preserve submitted values and render T09 feedback without writes.
- Missing request IDs render a dedicated 404 page.
- Invalid workflow transitions render the details page with T10 feedback and no persistence change.

## Verification

Integration tests exercise the real Express app and temporary Resident JSON/Service Request SQLite stores. They cover the required 20 automated scenarios, malformed query inputs, transition tampering, and read-only GET behavior. The complete project suite and manual browser checks verify regression safety, startup, `/health`, navigation, and presentation.
