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

The repository root contains the Compose stack. Copy `server/.env.example` to `server/.env`, set a private `JWT_SECRET` of at least 32 characters, then start the services from the repository root:

```sh
cp server/.env.example server/.env
docker compose up -d --build db api cron
docker compose exec api php database/migrate.php
curl http://localhost:8000/api/health
```

MySQL is available to host tools at `localhost:3307`; the API and expiry worker connect to `db:3306`. MySQL must be version 8.0.16 or newer so that schema `CHECK` constraints are enforced. The `cron` service runs `bin/expire-bookings.php` every 60 seconds. To run it once manually:

```sh
docker compose exec api php bin/expire-bookings.php
```

For an existing database, apply additive migrations without rebuilding data:

```sh
docker compose exec api php database/migrate-up.php
```

To rebuild a local database, `--fresh` is accepted only when `APP_ENV` is `dev` or `test` and `DB_NAME` ends in `_dev` or `_test`:

```sh
docker compose exec api php database/migrate.php --fresh
```

The frontend is served separately at `http://localhost:3000`. Set `ALLOWED_ORIGINS` to the exact frontend origins, separated by commas. Keep `.env` out of version control and replace all example credentials before deployment.

## Development accounts

The development seed uses `password123` for these accounts:

| Role | Email |
| --- | --- |
| Admin | `admin@studio.local` |
| Host 1 | `host1@studio.local` |
| Host 2 | `host2@studio.local` |
| Customer | `customer@studio.local` |

These credentials are for local development only.

Login and availability-check limits default to 10 requests per 15 minutes and 60 requests per minute per client IP. Configure them with `LOGIN_RATE_LIMIT`, `LOGIN_RATE_WINDOW_SECONDS`, `AVAILABILITY_RATE_LIMIT`, and `AVAILABILITY_RATE_WINDOW_SECONDS`. Only `REMOTE_ADDR` is used as the client identity; configure trusted proxy handling before placing the API behind a proxy that does not preserve the originating address.

## API and tests

- OpenAPI 3.0 contract: [`openapi.yaml`](openapi.yaml)
- Postman collection: [`postman/Studio-Rental-API.postman_collection.json`](postman/Studio-Rental-API.postman_collection.json)
- Unit suite: `docker compose exec api ./vendor/bin/phpunit tests/Unit`
- Domain integration suite (isolated DB): set `DB_NAME=studio_backend_test` and `APP_ENV=test`, apply `database/migrate-up.php`, then run `vendor/bin/phpunit tests/Integration`.
- Integration suites: `docker compose exec api php tests/test_phaseN_integration.php` (replace `N` with a phase number)
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
