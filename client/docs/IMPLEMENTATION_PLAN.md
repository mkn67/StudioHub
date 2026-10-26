# Implementation plan
1. Preserve source documents, establish DESIGN.md and typed domain fixtures.
2. Runnable application shell and public discovery: home, filters, physical-room detail/gallery.
3. Modal booking, inventory validation, payment and customer management with persisted mock state.
4. Host shared bookings, timetable and inventory/policy operations; Admin approval and audit.
5. Deterministic expiration, refunds, rescheduling, check-in/out and collections; domain tests.
6. Build, lint, typecheck, browser journeys and responsive inspection. Record exact gaps in traceability rather than implying full completion.

Acceptance: customer actions update Host/Admin records, invalid transitions are blocked, financial states remain independent, original source policies remain intact, and the app remains runnable at each milestone.

## Delivery ledger

Milestones1–5 above are implemented as a coherent local frontend demonstration, with public, Customer, Host and Admin routes sharing persistent mock records. Milestone6 checks passed: typecheck, lint,34 domain tests, optimized build and representative production-browser journeys. Independent visual review scored the listed finish corrections resolved; see VISUAL_REVIEW.md for exact scope.

Next extension points are explicit in REQUIREMENTS_TRACEABILITY.md: custom session-boundary editing beyond the08:00–12:00 sample, real image/file infrastructure, backend authentication/authorization/concurrency, provider integration and broader exhaustive browser coverage. These are not represented as existing production capabilities.
