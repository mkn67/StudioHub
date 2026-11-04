# Backend verification

Verified on 2026-10-31 with PHP 8.2.34 and MySQL 8.0.46. Integration suites ran against the separate `studio_backend_test` database, built from `schema.sql` and `seed.sql`; the existing `studio_dev` database was not reset. `docker compose up -d --build db api cron` and `GET /api/health` returned HTTP 200.

## Results

| Scope | Result |
| --- | --- |
| PHPUnit unit suite | PASS — 56 tests, 365 assertions |
| Phase 1 migration | PASS — 16 tables, 2 triggers, 3 invalid CHECK rows rejected |
| Phase 2 auth middleware | PASS — missing/bad token, role, lock and live role change |
| Phase 3 auth/account | PASS — registration, login, profile, password and T17 |
| Phase 4 public catalog | PASS — filters, pagination, inactive records and details |
| Phase 5 host management | PASS — 33/33, including cross-host writes and upload MIME checks |
| Phase 6 booking engine | PASS — 40/40, including T3/T4, T10/T11, T14, T18, T23, T25 and T27 |
| Phase 7 lifecycle/payments | PASS — 34/34, including T7–T9, T19, T20 and T24 |
| Phase 8 admin/statistics | PASS — 35/35, including T17 and exact T26 boundaries |
| Concurrency suite | PASS — T1, T2, T15 (12 parallel bookings), T16 |
| `migrate.php --fresh` in production | PASS — rejected with exit code 1 before touching the test database |
| OpenAPI / Postman syntax | PASS — OpenAPI YAML parsed (30 paths / 37 operations); collection JSON parsed |
| Swagger UI | PASS — running locally at `http://localhost:8081`, serving the mounted `openapi.yaml` |
| Expiry query plan | PASS — `EXPLAIN` selects `idx_bookings_expires` for the cron lookup |
| PHP syntax | PASS — all `src/` and `tests/` PHP files passed `php -l` |

The initial Phase 4 run against the pre-existing, modified dev database had seed-count mismatches. The suite passed after running it against the isolated database. A first T16 run exposed that the API did not include a machine-readable error code when an `ApiException` had no field details; the error envelope and test were corrected, then T16 passed.

## T1–T27 coverage

| Tests | Evidence |
| --- | --- |
| T1–T2 | Concurrency suite |
| T3–T4 | Phase 6 integration |
| T5 | Phase 5 cross-host writes and Phase 7 booking ownership |
| T6 | Phase 3 role-tampering registration case |
| T7–T9 | Phase 7 expiry, deposit requirement and state transition cases |
| T10–T11 | Phase 6 invalid equipment/rate cases |
| T12 | Phase 2 invalid token checks; JWT unit cases |
| T13 | ErrorHandler/API envelope unit checks and integration error responses |
| T14 | Phase 6 peak equipment usage cases |
| T15–T16 | Concurrency suite |
| T17 | Phase 2 and Phase 8 live role/status changes |
| T18 | Phase 6 long-term rate and hourly equipment calculation |
| T19–T20 | Phase 7 expiry/refund audit and completed-payment reconciliation |
| T21–T22 | Production `--fresh` rejection and Phase 1 schema integrity checks |
| T23 | Phase 6 public availability and party-size checks |
| T24–T25 | Phase 7 expiry cron and Phase 1/6 hold-expiry constraints |
| T26 | Phase 8 October/November boundary fixture and `from >= to` rejection |
| T27 | Phase 6 start-date rate validity and saved price snapshot checks |

## Security review

- Auth middleware reloads account status and role from the database on protected requests. Test-only identity endpoints are registered only for `APP_ENV=dev` or `test`.
- API CORS reads an explicit origin allowlist. Database connections use the application user, not root. SQL uses prepared statements; the expiry lookup uses the `(status, expires_at)` index.
- Missing `JWT_SECRET` or database password no longer falls back to a source-code credential. Production must provide those values through server-side environment configuration.
- Error responses use a generic 500 message and `errors` is always an array. Machine-readable business codes are included in `errors[].code`.
- Payment is a sandbox record only. The system records `refund_due`; it does not transfer or refund real money.
- The checked-in Compose stack and seed data contain development-only credentials and expose MySQL on the host for local work. Replace these settings and restrict database network access before deployment.

Composer metadata validates, with one non-blocking warning: no package license is declared. The OpenAPI file was YAML-parsed, but not checked with a full OpenAPI schema validator.

## Source layout

Features are grouped under `src/Modules/{Auth,Catalog,Studios,Rooms,Equipment,Booking,Admin,Shared}`. Each feature keeps its controllers, services, repositories, and relevant middleware together. Shared HTTP/database infrastructure lives under `src/Core/`.
