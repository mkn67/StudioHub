# PHP runtime readiness — read-only H1 verification

Checked 27 October 2026, Asia/Ho_Chi_Minh, in this Windows PowerShell workspace. These are observations in the current execution context, not proof tools are absent everywhere on the machine. No install, daemon/container/service start, migration, seed, cron, Composer install or database write was attempted. No deployed API was called.

## Results

| Component | Read-only evidence | Actual outcome | Consequence |
| --- | --- | --- | --- |
| PHP CLI >=8.2 | Get-Command php -ErrorAction SilentlyContinue | No command found on PATH | Blocks PHP bootstrap, lint, extension inspection, PHPUnit and local PHP demo execution |
| Composer | Get-Command composer -ErrorAction SilentlyContinue | No command found on PATH | Cannot verify Composer platform requirements or autoload at runtime |
| Installed dependencies | Test-Path server/vendor/autoload.php and server/vendor/bin/phpunit | Both false | Dependencies/runner unavailable; lockfile alone is not an installed environment |
| Docker client | docker version --format client-version | Client 29.8.1 printed, command also failed engine connection | Client available, runtime unavailable |
| Docker daemon | docker info --format server-version | Missing docker_engine named pipe; cannot connect | No running container inspection or container-based PHP/MySQL checks possible |
| Docker configuration | Docker command warning | Config file access denied in this sandbox | Readiness limitation; did not read or change Docker credentials/config |
| Compose | docker compose version | v5.5.1 printed with config access warning | CLI available; this is not successful project startup |
| MySQL client | Get-Command mysql | No command found on PATH | No native authenticated SELECT check |
| Development MySQL mapped port | Bounded TCP connect to 127.0.0.1:3307 (Compose mapping) | Unreachable within 2 seconds / connection failure | No reachable configured local development DB demonstrated |
| Alternate MySQL port | Same read-only TCP probe at 127.0.0.1:3306 | Unreachable | No local alternate service demonstrated |
| MySQL authentication/schema/version | No reachable DB and no PHP/MySQL client | NOT TESTED | No claim of working PDO, credentials, SELECT 1, version or schema |
| PHP runtime environment | server/.env existence only | File absent; .env.example names db:3306 | Example host is Compose-internal, not a host-loopback endpoint; secret values not inspected or reproduced |
| PHPUnit source setup | composer.json/lock and server/tests/Unit inventory | Dev requirement ^10.5; lock records 10.5.66; 6 unit test classes | Test source exists; execution blocked |
| PHPUnit configuration | Filename search for phpunit/bootstrap under server, including hidden files | No phpunit.xml(.dist) or dedicated bootstrap found | Future explicit --bootstrap vendor/autoload.php and tests/Unit selection needed |
| Node (documentation checks) | node execution | v24.21.0 works | JSON/reference checks can run; this does not validate PHP runtime |

No other database hosts were scanned. A failed TCP check proves no connection in this context, not that no database exists elsewhere. Even a reachable port would not establish MySQL identity/authentication. Existing SQL schema/seed files and Docker build instructions are static evidence only.

## Extension requirements and unresolved checks

PHP CLI is unavailable, so every runtime extension check is UNVERIFIED. No php -m output can be claimed.

| Extension / capability | Evidence / purpose | Current status |
| --- | --- | --- |
| PDO + pdo_mysql | Core/Db.php and SQL repositories; active Dockerfile installs PDO MySQL | Runtime unverified |
| json, ctype, iconv, pcre, filter | Existing code and Composer lock requirements | Runtime unverified |
| mbstring | AuthService/Validator use mb_strlen; PHPUnit lock requires it | Runtime unverified; active Dockerfile does not explicitly install it |
| dom, libxml, xmlwriter, tokenizer, phar | PHPUnit and locked test-tool dependencies | Runtime unverified; do not assume Apache image provides all |
| HTTPS HTTP adapter | Future provider transport, certificate verification, timeout support | No provider implementation chosen; if cURL selected, ext-curl becomes a prerequisite |
| zip | Active Dockerfile installs zip for existing environment | Runtime unverified; not intrinsically required by JSON lexical retrieval |
| Coverage driver | Optional PHPUnit coverage tooling | Not required for first demo; no coverage claim |

The current composer.json does not explicitly declare all application extension requirements. That is a finding for a future environment task; no dependency/configuration changes are made here. The lexical JSON retrieval design does not require a vector DB, new SQL tables or embeddings.

## Safe follow-up checks once an environment is separately available

These are instructions for a future environment session, NOT commands executed by H1:

~~~powershell
php --version
php -m
composer --version
# From server, only after an installed vendor tree is separately available:
composer check-platform-reqs
php vendor/bin/phpunit --bootstrap vendor/autoload.php tests/Unit
~~~

Review unit fixtures first; some may require database facilities. Do not run server/tests/test_phase*_integration.php or test_frontend_e2e.php against an existing database without inspecting their write behavior. This task deliberately runs none of them. An authenticated development DB check should use SELECT 1 and SELECT VERSION() with credentials supplied securely, never printed or embedded in a command. Do not run migrations/seeds as a readiness probe.

Docker availability should be verified by the environment owner when ready; H1 does not start Docker Desktop or Compose. Once supplied, verify real JWT configuration, CORS/OPTIONS, bootstrap and object ownership on disposable data before connecting the widget.

## Preparation validation and isolation

The new artifacts are documentation and JSON fixtures only. Local preparation validation passed: all four JSON fixtures/schema parsed; unique IDs, source-file/section references and FAQ/evaluation cross-references checked; 19 schema definitions compiled; four illustrative API examples validated and five invalid-schema examples rejected. The existing client AJV validates the draft-07-compatible keyword subset used by these schemas; this is not full JSON Schema 2020-12 conformance certification. Markdown/JSON FAQ content and publication states agree, and answerable public evaluation cases use only ready-for-approval test sources.

All ten new files passed whitespace/conflict-marker checks and their local Markdown links resolve. git diff --check passed (only pre-existing line-ending notices). SHA-256 comparison of all 79 snapshotted existing files found zero changes and zero missing files, covering server/, database/, existing Helpdesk reports/widget, layout, next-env, Compose and client dependency manifests. PHP files modified: 0; schema changes: 0; dependency/configuration changes: 0; existing frontend changes by H1: 0. These checks validate preparation artifacts, not executed RAG behavior or PHP tests.

Existing working-tree changes at task entry were client/next-env.d.ts, client/src/app/layout.tsx and untracked client/src/features/ plus docs/helpdesk/. They are preserved. The four existing Helpdesk reports remain unchanged; no frontend tests/build are rerun because no frontend source changes are made. No Git commit/push or deployment.

## Exact H1 deliverables

All ten paths below are newly created by this task; no pre-existing file is intentionally modified:

- docs/helpdesk/knowledge/PUBLIC_FAQ.md
- docs/helpdesk/knowledge/KNOWLEDGE_CATALOG.md
- docs/helpdesk/knowledge/knowledge.v1.json
- docs/helpdesk/knowledge/faq.v1.json
- docs/helpdesk/RAG_ARCHITECTURE.md
- docs/helpdesk/HELPDESK_API_CONTRACT.md
- docs/helpdesk/HELPDESK_API_CONTRACT.schema.json
- docs/helpdesk/AGENT_EVALUATION_CASES.md
- docs/helpdesk/evaluation.v1.json
- docs/helpdesk/PHP_RUNTIME_READINESS.md

## Next implementation gate

Runtime blockers: PHP/Composer/vendor unavailable, Docker daemon unavailable, no reachable local development MySQL. Public-only CLI retrieval can be implemented/tested without MySQL once PHP is available; future JWT/conversation HTTP integration needs a verified database and isolated persistence. Content blockers: all entries lack publication approval/validity, with nine public candidates additionally held for source-conflict review. Provider selection/credentials and privacy review are future integration prerequisites.

Smallest next step is an approved public subset plus PHP CLI lexical-retrieval/citation demo, followed by a bounded server-only model adapter and recorded evaluations. No next milestone is started automatically.
