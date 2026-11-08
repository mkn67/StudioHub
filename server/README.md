# Backend API

PHP 8.2 and MySQL 8 REST API for studio and equipment rental. Source code is grouped by business module under `src/Modules/` so each feature's controllers, services, and repositories stay together. Shared HTTP, database, and validation utilities live in `src/Core/`. API responses use the envelope documented in [`openapi.yaml`](openapi.yaml).

```text
src/
├── Core/                 # Request, routing, database, responses, validation
├── Exceptions/
└── Modules/
    ├── Auth/             # Account endpoints, JWT, account repository, auth middleware
    ├── Catalog/          # Space types and amenities
    ├── Studios/           # Studios, service packages, private production projects
    ├── Rooms/
    ├── Equipment/         # Reusable equipment and consumable stock ledger
    ├── Booking/          # Availability, pricing, lifecycle and payments
    ├── Admin/            # Admin and host statistics
    └── Shared/           # Ownership checks, audit logging, role middleware
```

## Run locally

The repository root contains the Compose stack. From that directory, create the isolated local `.env.compose` (the setup script preserves existing `.env` files), then start the services:

```sh
node scripts/setup-docker.mjs
podman-compose --env-file .env.compose up -d --build
curl http://localhost:8000/api/health
```

MySQL is available to host tools at `localhost:3307`; the API and expiry worker connect to `db:3306`. MySQL must be version 8.0.16 or newer so that schema `CHECK` constraints are enforced. The `cron` service runs `bin/expire-bookings.php` every 60 seconds. To run it once manually:

```sh
podman-compose --env-file .env.compose exec api php bin/expire-bookings.php
```

Compose initializes only a completely empty database, preserves existing users/data, and applies the idempotent additive PHP/SQL migrations at API startup. Seed accounts are skipped once users already exist; the example-room seed is safe to repeat. Do not run `down -v` if the volume contains data.

Render follows the same safe startup rule: `bin/init.php --apply` installs `database/schema.sql` only when the selected database has no tables, then applies pending PHP and SQL migrations. Existing Aiven tables and rows are preserved during redeploys. `schema.sql` is a fresh-install script and contains `DROP TABLE` statements; do not run it manually against a populated database.

The checked-in `database/seed.sql` contains development accounts and bookings. It is restricted to an empty `*_dev` or `*_test` database. Render does not seed example catalog rows on startup by default. Set `SEED_EXAMPLE_CATALOG=true` only when intentionally adding example catalog data to an empty `rooms` table. The deploy seed does not delete existing rooms, users, or bookings; it creates nine space types, two studios, example rooms, rates, amenities, and equipment under an already registered active host. Set `DEMO_CATALOG_HOST_EMAIL` in Render to choose that host explicitly. If unset, the first active host account is used.

On Render, set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` (at least 12 characters) in Environment for the first Admin account. Startup always ensures the `admin`, `host`, and `customer` roles exist; it creates the Admin only when that email is absent and never resets an existing password. Customers register through `/api/auth/register`. A Customer becomes a Host by submitting `/api/host-applications` and receiving Admin approval through `/api/admin/host-applications/{id}/decision`. The production catalog seed runs after this account bootstrap.

The frontend is available at `http://localhost:3000`. Compose mounts public uploads and private documents into separate persistent volumes. Keep `.env`, `.env.compose`, and `server/.env` out of version control. Local Compose reads only `.env.compose`, not Aiven settings.

## Development accounts

The development seed uses `password123` for these accounts:

| Role | Email |
| --- | --- |
| Admin | `admin@studio.local` |
| Host 1 | `host1@studio.local` |
| Host 2 | `host2@studio.local` |
| Customer | `customer@studio.local` |

These credentials are for local development only.

## Booking prices and example catalog

The development catalog contains separate photoshoot, podcast, livestream commerce, and music recording rooms. A fresh database gets these from `database/seed.sql`. To add the new examples to an existing local `*_dev` or `*_test` database without resetting bookings, run:

```sh
podman-compose --env-file .env.compose exec api php bin/seed-booking-examples.php
```

The script is idempotent and refuses non-development databases. For Podman, use `podman-compose --env-file .env.compose` in place of `docker compose`. The photoshoot hourly example has a two-hour minimum; other minimums and maximums come from each room's rate. A `month` rate means 30 days, and a `day` rate means 24 hours.

`POST /api/bookings/check-availability` is the authoritative price and availability check. Room cost is the selected rate's unit price multiplied by rental units. Studio equipment is shared across that studio's rooms: session equipment is charged once per quantity, while hourly equipment is charged per quantity for the actual rental duration rounded up to half an hour. The studio's deposit percentage is applied to the total; the deposit is part of the total, not an extra charge. Day, week, and month bookings occupy the room continuously across closed hours, but handover must begin within the studio's operating hours. Hour, session, and half-day bookings must finish before closing.

Public `GET /api/rooms` also supports `min_capacity`, `min_area`, `district`, `amenity_id`, `available_from` + `available_to`, and `sort`. Availability bounds use `YYYY-MM-DD HH:mm:ss` in `Asia/Ho_Chi_Minh`, require both bounds, and span at most 24 hours. Sort values are `recommended`, `price_asc`, `price_desc`, `area_desc`, `capacity_desc`, and `newest`. `GET /api/rooms/{id}/reviews` returns published reviews and the aggregate rating. A customer can submit one review per completed booking through `POST /api/bookings/{id}/review`; review authors are anonymized in the public catalog.

Login and availability-check limits default to 10 requests per 15 minutes and 60 requests per minute per client IP. Configure them with `LOGIN_RATE_LIMIT`, `LOGIN_RATE_WINDOW_SECONDS`, `AVAILABILITY_RATE_LIMIT`, and `AVAILABILITY_RATE_WINDOW_SECONDS`. Only `REMOTE_ADDR` is used as the client identity; configure trusted proxy handling before placing the API behind a proxy that does not preserve the originating address.

## API and tests

- OpenAPI 3.0 contract: [`openapi.yaml`](openapi.yaml)
- Postman collection: [`postman/Studio-Rental-API.postman_collection.json`](postman/Studio-Rental-API.postman_collection.json)
- Unit suite: install Composer development dependencies in a separate development/CI environment, then run `vendor/bin/phpunit tests/Unit`.
- Domain integration suite: use an isolated `*_test` database and run `vendor/bin/phpunit tests/Integration` after applying its migrations. The Compose API image installs production dependencies only.
- Integration suites: `podman-compose --env-file .env.compose exec api php tests/test_phaseN_integration.php` (replace `N` with a phase number)
- Concurrency scenarios T1, T2 and T15: `python3 server/tests/concurrency_test.py http://localhost:8000`

To view the OpenAPI file with Swagger UI without adding a service to the existing Compose stack:

```sh
docker run --rm -p 8081:8080 \
  -v "$PWD/server/openapi.yaml:/usr/share/nginx/html/openapi.yaml:ro" \
  docker.io/swaggerapi/swagger-ui
```

Open `http://localhost:8081`. The API simulates payment records; it does not connect to a payment provider or transfer/refund real funds. Logout revokes the current JWT immediately; expired revocation and rate-limit rows are purged by the existing cron worker. Service packages create separate service orders and do not reserve rooms; project metadata is private by default, and hosts receive a redacted view unless separately granted confidential access.

## Deployment notes

Use HTTPS, a non-root MySQL account with access only to the application database, a strong server-side `JWT_SECRET`, and an exact CORS allowlist. Do not expose MySQL's port publicly. The database server must support MySQL 8.0.16 or later. Keep PHP errors in server logs; API 500 responses intentionally use a generic message.
