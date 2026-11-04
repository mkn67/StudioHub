# Integrated development setup

The frontend is Next 16/React 19 on Node 24. Business backend is the existing PHP >=8.2 application with Composer, PDO MySQL and MySQL 8.0.16+ InnoDB. PHP needs mbstring, JSON, curl and PDO MySQL. Helpdesk remains a separate existing PHP module; follow its README for provider configuration. All business dates use Vietnam time and VND.

## Configure without overwriting secrets

Merge `server/.env.example` and `client/.env.example` into local configuration manually. Do not replace an existing env file. Set a private random JWT_SECRET at least 32 bytes. Set DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS for an explicitly provisioned database. On a host connecting to this Compose configuration use 127.0.0.1:3307; inside Compose use db:3306. These are different addresses.

Connected mode is default. BUSINESS_API_URL is **server-only** (local PHP http://127.0.0.1:8000, Compose http://api). APP_ORIGIN must exactly match the frontend URL, including port and localhost vs 127.0.0.1. Restart Next after changing configuration. Use HTTPS in deployment for Secure cookies. Preserve independent Helpdesk secret/provider settings; never prefix them with NEXT_PUBLIC.

Payment adapter defaults to disabled. For isolated development simulations only, set APP_ENV=dev (or test) and PAYMENT_ADAPTER=development. These operations persist simulated financial records explicitly labeled development. Live provider integration is not implemented. Do not expose development accounts or simulation adapters on a public deployment.

## Native startup

From repository root (use `php` on PATH, or the existing Windows helper `helpdesk-php/bin/php.cmd` where noted):

```powershell
cd server
composer install
cd ..
cd client
npm.cmd ci
cd ..
# Provision the empty MySQL database separately, then initialize missing tables:
php server/bin/init.php --apply
# Optional: ONLY an empty database named *_dev or *_test, APP_ENV dev/test:
php server/bin/init.php --apply --seed
# Existing database upgrade (no reset/seed):
php server/bin/migrate.php --apply
php -S 127.0.0.1:8000 -t server/public server/public/index.php
```

On Windows without PHP on PATH, replace `php` with `.\helpdesk-php\bin\php.cmd` from root. That helper selects the existing ignored portable PHP runtime; it is not shipped as a production dependency. Composer/PHPUnit are not installed by the helper.

Separate terminal:

```powershell
cd client
npm.cmd run dev
```

Default URL http://127.0.0.1:3000. Log in with real credentials. The optional development seed documents `customer@studio.local`, `host1@studio.local`, `host2@studio.local`, `admin@studio.local` / `password123`; these are fixtures, never production users. First, Host must save its cancellation/payment policies and inspect pricing in the existing dashboard. Studio/room IDs are actual numeric database IDs; demo `/rooms/a102` is not a real database room URL.

Run `php server/bin/expire-bookings.php` every minute through a supervisor/cron/Windows scheduler. It must run independently of visits. Alert on nonzero exits and reconciliation queues. Do not use the browser demo clock for connected workflows.

## Compose

Set JWT_SECRET privately in the shell/root environment; PAYMENT_ADAPTER is optional and defaults disabled. Docker engine must already run. Start from root:

```powershell
docker compose build api
docker compose up -d db
docker compose run --rm api composer install
docker compose run --rm api php bin/init.php --apply
# Seed only an empty isolated dev database, if wanted:
docker compose run --rm api php bin/init.php --apply --seed
docker compose up -d api cron client
docker compose ps
```

Open http://localhost:3000 (Compose APP_ORIGIN). API http://localhost:8000. DB host port 3307. Named database volumes are retained. No down-with-volume-removal, fresh migration, truncate or reset is needed. The legacy database/migrate.php now delegates to the safe initializer and refuses --fresh. `init.php` only creates missing base tables; versioned upgrades are tracked under schema_migrations with a named migration lock. Review/back up an existing shared database before applying DDL. Nothing in this task applied a database migration.

## Offline demo

Use a separate process/browser context:

```powershell
cd client
$env:NEXT_PUBLIC_APP_MODE='demo'
npm.cmd run dev -- --port 3128
```

Demo mode is visibly labeled, uses only the existing browser repository, and cannot authorize PHP records. Connected errors never load fixtures. Demo settings are compiled by Next; for a production demo build set the mode before building. Do not treat browser demo tests as database verification.

## Verification commands

```powershell
# From root, pure PHP rules and existing Helpdesk scripted suite:
.\helpdesk-php\bin\php.cmd server/tests/integration_rules.php
.\helpdesk-php\bin\php.cmd helpdesk-php/tests/run.php
# With Composer dev dependencies installed:
php server/vendor/bin/phpunit --bootstrap server/vendor/autoload.php server/tests/Unit
# Dedicated, already migrated MySQL test database; fixtures retained with qa-* prefix:
$env:APP_ENV='test'
$env:DB_NAME='studio_integration_test'
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='3307'
php server/tests/integration_mysql.php
```

The MySQL harness refuses non-test database names, does not reset or delete existing data, and runs separate PHP worker processes for simultaneous reservation attempts. It uses session-local MySQL SET timestamp for deadline tests, never changes the machine clock. An unavailable database exits with a blocked/skip code, not a pass. External environment variables must provide DB credentials. The test suite's fixtures and simulation settings are isolated to that test database/process.

```powershell
cd client
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd run start -- --port 3001
# Explicit demo dev at 3128:
$env:RENTAL_QA_URL='http://127.0.0.1:3128'
node scripts/rental-pricing-qa.mjs
```

`integration-connected-qa.mjs` specifically verifies the unavailable-MySQL path: use a connected production frontend on 3127 with BUSINESS_API_URL pointing at PHP configured for an unavailable local test DB, APP_ORIGIN matching 3127, then run `node scripts/integration-connected-qa.mjs`. It asserts failure UI/no fixture fallback, bridge origin/route checks, unauthenticated denial, redacted errors and responsive error screens. It is not a successful-booking E2E suite. Do not run its unavailable-service expectations against production or a healthy shared database.

Actual results and limitations: [verification](integration-verification.md), [matrix](integration-matrix.md).
