# Frontend and backend connection

## Request path

```text
Browser ── same-origin /api/rest/* ──> Next.js on Vercel ── server-side request ──> PHP API on Render
Browser ── same-origin /api/helpdesk/* ──> Next.js on Vercel ── bridge secret ──> PHP Helpdesk on Render
```

The browser never calls the Render API directly for application requests and never stores the account JWT in `sessionStorage` or `localStorage`. The REST proxy reads the HttpOnly `studiohub_auth` cookie, adds the Bearer token on the server, and removes token fields from authentication responses before returning them to the browser. The Helpdesk proxy forwards that session only when present and uses its own HttpOnly conversation cookie.

The Helpdesk widget is intentionally hidden on `/host/**` and `/admin/**`. It remains available on public and customer pages.

## Environment variables

| Where | Variable | Value / purpose |
|---|---|---|
| Vercel frontend | `API_INTERNAL_URL` | Required server-only HTTPS Render API origin, e.g. `https://studiohub-jww7.onrender.com` |
| Vercel frontend | `NEXT_PUBLIC_API_URL` | Same Render origin, used to build image/media URLs |
| Vercel frontend | `APP_ORIGIN` | Required exact HTTPS frontend origins, comma-separated, no trailing slash; set separately for Production and Preview |
| Vercel frontend | `HELPDESK_API_URL` | Required Render Helpdesk origin |
| Vercel frontend | `HELPDESK_BRIDGE_SECRET` | Private shared secret matching the Render Helpdesk service |
| Vercel frontend | `HELPDESK_FRONTEND_ORIGIN` | Required same exact HTTPS frontend origin list; set separately for Production and Preview |
| Render API | `APP_ENV` | `production`; enables production-only configuration checks |
| Render API | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` | Aiven MySQL connection settings |
| Render API | `DB_SSL_CA` | Required mounted Aiven CA certificate path; the API verifies the TLS peer |
| Render API | `SEED_EXAMPLE_CATALOG` | Leave unset or `false`; set `true` only when intentionally adding example spaces to an empty catalog |
| Render Helpdesk | `HELPDESK_FRONTEND_ORIGIN` | Same exact frontend origin list |
| Render Helpdesk | `HELPDESK_DATABASE_URL` | MySQL DSN for Aiven if persistent Helpdesk conversations are required |
| Render Helpdesk | `HELPDESK_DB_USER`, `HELPDESK_DB_PASSWORD` | Aiven credentials for the Helpdesk database connection |
| Render Helpdesk | `HELPDESK_DB_SSL_CA` | Path to the Aiven CA secret file mounted in Render |
| Render Helpdesk | `HELPDESK_ALLOW_PRODUCTION_MIGRATIONS` | Must be `true` only when intentionally migrating the approved Aiven database |
| Render Helpdesk | `HELPDESK_BRIDGE_SECRET` | Must match the Vercel bridge secret |
| Render Helpdesk | `NINEROUTER_BASE_URL`, `NINEROUTER_API_KEY`, `NINEROUTER_MODEL` | Private model gateway configuration |

Use both production frontend domains in the origin list only if both should be supported. Redeploy the Vercel project after changing variables. For local Compose, the API origin is `http://api`; the browser still uses the frontend's same-origin proxy.

## Startup and database safety

The PHP container initializes `schema.sql` only when the target database is empty. For an existing database, startup skips that fresh-install script and applies tracked PHP and additive SQL migrations. Existing PHP migration history in `schema_migrations.version` is imported into the current tracker before new migrations are considered. MySQL migration runners use a database advisory lock; Helpdesk migrations use a separate lock. Aiven connections require a readable CA certificate and verify the TLS peer. Example catalog seeding is opt-in (`SEED_EXAMPLE_CATALOG=true`) and remains disabled by default. Before a Render release, take an Aiven backup and confirm the restore path; application rollback does not reverse database schema changes.

On deployment, check Render startup logs for successful PHP and SQL migrations, followed by the API health check. Helpdesk can use SQLite locally; on Render, set the MySQL DSN and Aiven CA path if its conversations must survive container replacement.

Production BFF requests fail closed unless `APP_ORIGIN` is configured. The REST BFF requires `API_INTERNAL_URL` over HTTPS on Vercel. Helpdesk also requires HTTPS frontend origins and an HTTPS upstream URL in production; it does not trust forwarded headers to infer the public origin.

## Verification checklist

- `GET /api/health` returns database status `ok`.
- Render's API and Helpdesk web services listen on the configured `PORT` (default 10000); set Render health checks to `/api/health` and `/health` respectively.
- Public `GET /api/space-types` and `GET /api/rooms?limit=3` return successful envelopes.
- With a Host account, `GET /api/studios/mine`, `/api/host/room-types?studio_id=…`, `/api/host/equipments?studio_id=…`, and `/api/equipment-categories?studio_id=…` return 200.
- In browser DevTools, application API calls use the frontend origin and `/api/rest/…`; no `Authorization` header or JWT response field is exposed to browser JavaScript.
- Helpdesk `GET /health` succeeds, and its configured model gateway answers within the request deadline. Without gateway credentials, Helpdesk should return a clear unavailable response rather than hang or silently answer from demo content.
