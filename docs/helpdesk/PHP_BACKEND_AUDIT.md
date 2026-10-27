# StudioHub PHP backend audit

Audit date: 27 October 2026, Asia/Ho_Chi_Minh. Baseline: `e5a0ecd`, clean working tree. Static source inspection only. EXISTING means substantive source exists; it does not certify deployment. PARTIAL means only some layers exist. MISSING means absent from inspected source. UNVERIFIED means runtime behavior was not tested.

## Executive summary

The backend is plain PHP >=8.2, Apache, Composer PSR-4 (`App\\` → `src/`), FastRoute, PDO MySQL and Firebase JWT. It is not Laravel. Authentication/account APIs and public room/equipment catalogs have controllers, services and SQL repositories. Booking/payment tables and ownership helpers exist, but there are no booking/payment/refund controllers or registered business endpoints. The expiration cron is a print-only Phase 0 placeholder. No Helpdesk persistence, agent, retrieval, ticket or handoff implementation exists.

The current Next.js frontend is an independent localStorage demonstration (`client/src/data/repository.ts`, `client/README.md`); its domain engine is not evidence of PHP capabilities. No live database was queried. Backend files, schemas, dependencies and configuration remain untouched.

## Actual structure and request path

| Path | Actual responsibility |
|---|---|
| `server/public/index.php:7–94`, `server/public/.htaccess` | Composer bootstrap, optional dotenv safeLoad, timezone, global error handler, explicit route registration and dispatch; Apache rewrite entry |
| `server/src/Core/Router.php:18–142`, `Pipeline.php` | FastRoute dispatch; global middleware then route middleware; controllers constructed with `new $class()`; no DI container/module registry |
| `server/src/Core/Request.php` | Normalizes path, query, JSON body, headers, bearer token and request attributes; invalid JSON currently becomes an empty array |
| `server/src/Controllers/` | Auth, Room, Equipment, Lookup and Health HTTP adapters |
| `server/src/Services/` | Auth/JWT, room catalog/calendar/rates, equipment catalog, ownership assertions and audit inserts |
| `server/src/Repositories/` | User, Room, Equipment, Lookup; PDO constructor injection with Core Db fallback; prepared SQL |
| `server/src/Core/Db.php` | Lazy PDO singleton; exception mode, associative fetch, native prepares, utf8mb4, +07:00; transaction callback and test connection setter |
| `server/src/Config/Database.php` | Separate older PDO singleton; active repositories use Core Db, not this connection |
| `server/src/Middleware/` | Active Auth, Role and CORS middleware imported by entry point |
| `server/src/Middlewares/` | Older plural-namespace CORS class; not registered by active entry point |
| `server/src/Core/Validator.php`, `Exceptions/ApiException.php` | Rule-based field errors and typed HTTP exceptions; services also validate manually |
| `server/src/Core/ErrorHandler.php`, `ApiResponse.php` | Exception conversion and JSON response envelopes; generic details go to server logs |
| `server/database/` and root `database/` | SQL schema, seed, migration runner and overlap triggers; duplicate schema/trigger copies have matching SHA-256 at audit |
| `server/bin/expire-bookings.php:7` | Placeholder output only; no expiration mutation |
| `server/tests/Unit/`, `server/tests/test_*.php` | PHPUnit unit tests and standalone integration scripts; not executed in this audit |
| `server/composer.json`, `composer.lock` | FastRoute ^1.3, firebase/php-jwt ^6.10 or ^7, phpdotenv ^5.6; PHPUnit ^10.5 dev dependency |
| `server/docker/api.Dockerfile`, `server/Dockerfile`, root `docker-compose.yml` | PHP 8.2 Apache/PDO MySQL containers; Compose selects `docker/api.Dockerfile` and a MySQL 8.0 service |

Configuration is read from dotenv/environment with development fallbacks. No secret values are reproduced here. The active Dockerfile installs PDO MySQL/zip but does not explicitly install mbstring; AuthService/Validator use `mb_strlen`, so verify runtime extension availability before deployment. Composer vendor installation/container startup were not verified.

## Feature readiness and module inventory

All endpoint exposure below comes from `server/public/index.php`; unregistered helpers do not count as APIs.

| Capability | Existing implementation | Status | Evidence | Helpdesk readiness |
|---|---|---|---|---|
| Authentication | Register/login/JWT, current-user profile/update; logout returns success without revocation | EXISTING | AuthController, AuthService, UserRepository; `Middleware/AuthMiddleware.php` | Reuse middleware only after runtime/security verification |
| Users | Customer creation and own profile/password update; no management API | PARTIAL | `Services/AuthService.php`, `Repositories/UserRepository.php` | Own profile only; not a general users tool |
| Roles/permissions | roles FK, live DB role reload, RoleMiddleware, three diagnostic auth routes | PARTIAL | `Middleware/RoleMiddleware.php`, schema:8–28 | Basic roles, no granular permission registry |
| Studios | Schema, public studio fields inside room results, ownership helper | PARTIAL | schema:32, RoomRepository, OwnershipGuard:21 | No standalone search/policy/CRUD controller |
| Room Types | Space-type tags exist; no Room Type entity | MISSING | schema:50,88; all CREATE TABLE definitions | Do not equate tags with Room Types |
| Physical Room Units / search | Concrete `rooms` rows, public active search/detail | EXISTING | RoomController; RoomService:33,161; RoomRepository | Good candidate for bounded public read tool |
| Availability | Busy intervals filtered by active bookings; date bounds; no complete availability evaluator | PARTIAL | RoomService:180; RoomRepository::getRoomBusySlots | Calendar is not a promise that a new booking can be created |
| Equipment | Active studio/category catalog, total quantity | EXISTING | EquipmentController/Service/Repository | Catalog only; no date-specific stock tool |
| Pricing | Active dated per-room rates; filters and integer display amounts | PARTIAL | RoomService:231, RoomRepository::getActiveRatesByRoomId; schema:119 | Can read rates, cannot quote a complete booking total |
| Booking / lookup | Tables, ownership helpers, calendar SQL; no lifecycle service/controller | PARTIAL | schema:178,226; OwnershipGuard:109,141 | Current-user booking API MISSING |
| Booking holds | `pending` + expires_at and overlap triggers; cron does nothing | PARTIAL | schema:202–220, triggers; bin/expire-bookings.php | No verified expiration/atomic creation protocol |
| Payments | Payment table only; no controller/service/provider/webhook | PARTIAL | schema:245–259 | Payment lookup API MISSING |
| Refunds | No table, controller, service or route | MISSING | schema and source inventory | Refund lookup/action unavailable |
| Rescheduling | No change requests or service | MISSING | schema and source inventory | Requires preservation/atomic replacement of original booking |
| Customer restrictions | Security `locked` status only, no strike/booking-right ledger | PARTIAL | schema:27; AuthMiddleware | Do not conflate login lock with booking suspension |
| Host management | Ownership helpers and host diagnostic route only | PARTIAL | OwnershipGuard; index.php host-only | No Host management APIs |
| Admin management | Admin role diagnostic route only | PARTIAL | index.php admin-only | No approval/refund/exception APIs |
| Audit logs | JSON metadata insert helper and table | EXISTING | `Services/AuditLogger.php`, schema:263 | No audit read endpoint or agent-specific trace schema |
| Support tickets / handoff | None | MISSING | Entire source/schema inventory | Requires new isolated storage and workflow |
| FAQ/RAG / agents / tool traces | None | MISSING | Composer, schema and source inventory | No LLM client, ingestion, embeddings, retrieval or orchestration |
| Deployed DB/API behavior | Not exercised | UNVERIFIED | PHP/Composer absent; Docker client present but daemon unavailable | All reuse recommendations are conditional |

## Exact registered API inventory

Success envelope: `{status:"success", code:<HTTP>, message, data}`. Error envelope: `{status:"error", code:<HTTP>, message, errors:[{field,code,message}]}`. `ApiResponse::error` receives an errorCode but does **not** serialize a top-level machine code; adapters must not assume it exists. Numeric route IDs match `\d+`, and are PHP database IDs, not frontend fixture IDs such as `a102`.

| Method and route | Auth / ownership | Inputs | `data` shape / implementation | Read-tool suitability |
|---|---|---|---|---|
| GET `/api/health`, GET `/health` | Public | None | server, database, mysql_version, timestamp; HealthController::check → Db | Operational only; no reason to expose infrastructure to LLM |
| POST `/api/auth/register` | Public; assigns customer regardless of client role | full_name 2–100, email <=150, password >=8, optional phone <=20 | `{token,user}`; AuthController::register → AuthService → UserRepository | Exclude: account mutation/credentials |
| POST `/api/auth/login` | Public | email,password | `{token,user}`; AuthService::login | Exclude from AI tools |
| POST `/api/auth/logout` | Bearer + live user | None | null; AuthController::logout | Not a read tool; no token revocation implemented |
| GET `/api/auth/profile` | Bearer, current user ID from middleware | None | user joined with role, password_hash removed; AuthService::getProfile | Only minimal fields when needed; do not send full profile to LLM |
| PATCH `/api/auth/profile` | Bearer, current user only | full_name,phone,avatar_url; current_password/new_password | updated profile; AuthService::updateProfile | Exclude: mutation |
| GET `/api/rooms` | Public; active room and active studio only | keyword,space_type_id,min_area,min_price,max_price,rate_unit,page (default 1),limit (default 12,max 50) | `{items:[room_id,studio_id,name,description,area,ceiling_height,capacity,soundproof_level,status,studio,thumbnail_url,primary_space_type,display_rate,amenities],pagination:{page,limit,total_items,total_pages}}`; RoomService::getRooms → RoomRepository::searchRooms | Candidate; bound keyword/response size; no availability filtering |
| GET `/api/rooms/{id}` | Public; active room and studio | Numeric id | room fields plus public studio, rules, power_specs, images,space_types,amenities,rates; RoomService::getRoomDetail | Candidate; project only approved public fields; rules are untrusted content |
| GET `/api/rooms/{id}/calendar` | Public; active room and studio | Numeric id; optional from,to; default today through +30 days; maximum 62 days | `{room_id,from,to,busy_slots:[{busy_start,busy_end}]}`; RoomService::getRoomCalendar → RoomRepository::getRoomBusySlots | Candidate for busy intervals only; no booking IDs/PII; not final availability |
| GET `/api/rooms/{id}/rates` | Public; active room and studio | Numeric id | array of rate_id,room_id,rate_unit,unit_minutes,unit_price,minimum_units,maximum_units,effective_from,effective_to,status; RoomService::getRoomRates | Candidate; effective active rates, not financial quote |
| GET `/api/equipments` | Public; verifies active studio | Required positive studio_id; optional positive category_id | array of equipment_id,studio_id,category_id,category_name,name,brand,description,unit_price,pricing_unit,total_quantity,image_url,status; EquipmentService::getEquipments | Candidate for catalog; total_quantity is not remaining availability |
| GET `/api/space-types` | Public | None | rows `{space_type_id,name,description}`; LookupController → LookupRepository::getSpaceTypes | Candidate vocabulary lookup |
| GET `/api/amenities` | Public | None | rows `{amenity_id,name,icon}`; LookupController → LookupRepository::getAmenities | Candidate vocabulary lookup |
| GET `/api/test/me` | Bearer + live user | None | request user; inline closure | Diagnostic only, not LLM tool |
| GET `/api/test/host-only` | Bearer + role host (admin not implicitly included) | None | request user; inline closure | Diagnostic only |
| GET `/api/test/admin-only` | Bearer + role admin | None | request user; inline closure | Diagnostic only |

No other routes are registered. Current-user bookings, booking-by-code/status, payment status, refund status, studio policy endpoint, complete availability check, standalone studio search, tickets, conversations and knowledge APIs are **MISSING**. Routes described in older plans must not be called as if implemented. Future tools must call bounded, reviewed services through server-side adapters, not arbitrary SQL or an arbitrary HTTP fetch tool.

## Database overview

`server/database/schema.sql` and root `database/schema.sql` define 16 InnoDB utf8mb4 tables: roles, users, studios, space_types, amenities, rooms, room_space_types, room_amenities, room_images, room_rates, equipment_categories, equipments, bookings, booking_details, payments, audit_logs. Root `database/init/01-init.sql` additionally defines an older system_health demonstration table; it is not part of the 16-table application schema. Compose declares MySQL 8.0; live version/schema/seed execution remain UNVERIFIED.

Relationships: users→roles; studios→host user; rooms→studio; room tag/amenity bridges and images/rates→room; equipment→studio/category; booking→room/customer/rate; booking_details→booking/equipment; payments→booking; audit_logs→optional actor. Financial-history deletion protections are inconsistent: bookings reference room/user/rate with RESTRICT, while booking_details/payments cascade with booking deletion. Equipment category membership is not constrained to the same studio by a composite FK.

Email, role name, space type/amenity name, booking code and payment transaction code are unique. CHECKs cover room capacity/area/status, rate unit/duration/price/effectivity, equipment quantities/prices, booking time order/party size/amounts/status, required pending expiry, completed timestamp, detail quantity and positive payment amounts. Constraints do not enforce all policy invariants (e.g. same-studio equipment/rate selection or exact busy_end buffer derivation). Relevant indexes: `idx_rooms_studio_status`, `idx_room_rates_room_status`, `idx_bookings_room_lookup(room_id,status,busy_start,busy_end)`, `idx_bookings_expires(status,expires_at)`, `idx_bookings_customer`, `idx_booking_details_eq_bk(equipment_id,booking_id)`, `idx_payments_lookup(booking_id,payment_type,status)`, `idx_audit_entity`, `idx_audit_created`.

Bookings snapshot room/equipment/total/deposit amounts and customer contact fields. Current SQL statuses are pending,confirmed,checked_in,completed,cancelled,rejected,expired; payments use pending,success,failed and deposit/remaining/full. There is no refund ledger, payment attempt/grace reconciliation, host response deadline, reschedule ledger, Room Type or strike ledger. `expires_at` and `unit_minutes` **do exist in actual SQL**, contrary to omissions in older document-only audits. Overlap triggers inspect half-open busy intervals for confirmed,checked_in and unexpired pending. They do not demonstrate concurrency safety or derive/validate the required 30-minute buffer. No transactionally locked booking creation service exists to verify that guarantee.

Support conversations/messages/tickets, knowledge documents/chunks, agent runs and tool traces are all **MISSING**. Generic audit_logs metadata is not a dedicated conversation/trace schema. Future Helpdesk tables should have a separate prefix, owner/tenant references, retention rules, indexes and scoped access; no tables or migrations were created in this task.

## Authentication, authorization and privacy

`JwtService::generate/verify` signs/verifies HS256 by default with sub/iat/exp and a default two-hour TTL. AuthMiddleware extracts Bearer, verifies it, reloads users JOIN roles on every protected request, rejects absent/invalid/deleted user (401) or locked account (403), then attaches the live user. RoleMiddleware performs an exact allowlist check (403 for wrong role). UserRepository is a SQL adapter, not an authorization boundary.

`OwnershipGuard::assertBookingOfCustomer` (line 141) compares customer_id; `assertOwnsBooking` (109) joins room→studio→host; analogous guards cover studio, room and equipment. These methods exist but are not wired to any booking API. A future booking tool must receive authenticated actor identity from Request, scope its query, and invoke the ownership guard; a booking code supplied in chat grants **no authority**. Admin access must be separately allowlisted and audited, not granted because a tool requested it. Return only a redacted financial/status DTO. Reject cross-user/conversation/ticket access with consistent non-enumerating responses. Never use the client demo persona as PHP authentication.

Production prerequisites: remove reliance on the JWT development fallback, define key management/rotation, review lack of logout revocation and login rate limiting, validate input sizes, and verify CORS/preflight. Router dispatch finds a route before running global middleware, so OPTIONS may fail 404/405 before CORS handles it. These are findings/recommendations only; nothing was changed.

## Business-rule mapping and architecture risks

Policy authority: `client/docs/references/StudioHub_Business_Policy_VI_v1.1.md` (BP identifiers). The database constraint audit explicitly describes a document-only review and is not evidence of deployment.

| Policy | PHP finding | Consequence for future Helpdesk |
|---|---|---|
| BP-01/03 ownership and roles | Auth and ownership helpers present; no scoped booking endpoints | Validate/reuse identity; do not expose arbitrary booking lookup |
| BP-04/27–29 booking suspension | Only security account lock exists | Restricted customers must retain support access in future design |
| BP-05/06 exact Room Unit and Room Type | rooms concrete, no room_types; space_types tags only | Never claim a type-level booking or substitute room |
| BP-07–09 availability/buffer/stock | Busy calendar only; triggers not a complete evaluator | Do not guarantee availability or equipment stock |
| BP-10–17 hold/payment/host deadlines | SQL pending conflates stages; missing awaiting_payment/no_show; placeholder cron | Do not infer status or money from older lifecycle |
| BP-18–26 pricing, cancellation/refunds | Rate lookup and amount columns; no policy snapshot/refund workflow | Explain public guidance only; no computed entitlement or refund promise |
| BP-30–39 changes, check-in/out, exceptions/audit | No lifecycle services; generic audit insert exists | No AI mutations; separate authorization/operations milestones |
| BP-40–44 consistency | Some SQL checks; no verified concurrent lock protocol | Runtime/schema alignment and financial DTOs precede private tools |

Other risks: duplicated database/CORS helpers and schema copies can drift; controllers use manual construction so future module dependencies need explicit composition; dates accept permissive strtotime fallback; numeric filters accept values via is_numeric then cast; public free text can contain prompt injection; error envelope lacks its nominal machine code; existing test/health routes expose live-user/infrastructure details and should not become agent tools. Existing public room rules are not a verified complete cancellation/refund policy source.

## Reuse and recommended future integration

Reuse Core Request/Router/ApiResponse, active Auth/Role middleware, OwnershipGuard, bounded RoomService/EquipmentService/LookupRepository reads, and structured exception conventions after runtime validation. Wrap them in explicit Helpdesk contracts with field projection, actor scoping, query/time/result limits and read-only credentials where practical. AuditLogger can record minimal references; avoid conversation bodies/tokens in generic logs.

Proposed module: `server/src/Helpdesk/{Controllers,Services,Agents,Tools,Knowledge,Repositories,DTOs,Contracts,Tests}` under existing App namespace; tests can instead live in `server/tests/Helpdesk` to match test autoload. Existing Composer PSR-4 can discover App\Helpdesk without alteration. **Future registration still requires an explicit edit in `server/public/index.php`** to import/register Helpdesk routes (or a separately approved route-registration loader). No registry currently exists. Do not silently introduce one. LLM HTTP client/timeouts/retry, provider key configuration, ingestion/embedding/retrieval, scoped persistence, retention/rate limits, tool allowlist, authorization tests and handoff orchestration are all future dependencies.

Smallest next milestone: review a public-only FAQ contract/approved corpus and run PHP/bootstrap/CORS/auth smoke tests on a disposable environment. H1 can be developed independently of missing booking/payment modules; H2 private tools must wait for scoped APIs and policy-aligned business data. See HELPDESK_ARCHITECTURE.md and NEXT_MILESTONES.md. No PHP implementation was started.

## Files inspected and verification limitations

Read all five `server/src/Controllers/*.php`, four `Repositories/*.php`, six `Services/*.php`, active three `Middleware/*.php`, legacy `Middlewares/CorsMiddleware.php`, `Core/{Router,Request,Pipeline,Db,ApiResponse,ErrorHandler,Validator}.php`, `Config/Database.php`, `Exceptions/ApiException.php`, `public/index.php`, `composer.json`, dependency metadata in composer.lock, `bin/expire-bookings.php`, both Dockerfiles, `database/{schema,migrate,seed}.sql/php` definitions and both trigger files (plus matching root schema/triggers). Inspected unit/integration test inventory and unit test case declarations. No migration, seed, cron or integration test was executed.

Documentation reviewed: root README, `docs/3.2-database.md`, `docs/implementation-plan.md`, root `implementation-plan-backend.md`, client README/DESIGN, Business Policy v1.1 and Database Constraint Audit, plus frontend routing/repository/layout. No `business_rule.md` or standalone Helpdesk Agent implementation plan was found using repository file/content searches; milestone mapping follows the supplied request, not an assumed missing plan.

PHP/Composer commands are absent. `docker version` finds a client but fails to connect to the Docker engine named pipe; Docker configuration access is also denied in this sandbox. Therefore PHP, MySQL and container runtime behavior remain UNVERIFIED. No deployed API was called. This is a source-backed architecture audit, not a passing backend test report. Backend file modifications: **0**; schema changes: **0**; backend dependency changes: **0**. Final Git verification is recorded with the frontend implementation report.
