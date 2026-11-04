# PHP integration API

All business logic runs in the existing PHP API, timezone `Asia/Ho_Chi_Minh`, PDO MySQL/InnoDB. Next `/api/business/*` is a fixed-route credential transport, not a second business backend. Browser origin and server-only `BUSINESS_API_URL` must be configured. No request can choose an upstream host.

## Transport and authentication

PHP supports established `Authorization: Bearer <JWT>`. Browser requests use the same-origin bridge and an HttpOnly, SameSite=Lax cookie scoped to `/api`, Secure on HTTPS. Login/register responses from the bridge exclude the token. The bridge checks Origin on mutations, forwards only allowed endpoints and idempotency headers, disables caching and follows no redirects. PHP reloads account role/lock state on every authenticated request; commands reload again after acquiring the write lock. Logout revokes the token hash until JWT expiry. JWT_SECRET must be a private random value, at least 32 bytes; the old known default is rejected. Authentication attempts are limited per direct peer, email, endpoint and ten-minute bucket. A reverse proxy should separately enforce global abuse limits.

Envelope: success `{status:"success",code:200,message,data}`; error `{status:"error",code:422,error_code,message,errors:[{field,code,message}]}`. Preserve the numeric `code` for existing consumers. Errors: 400 malformed JSON, 401 expired/missing/revoked token, 403 role/ownership/locked/origin, 404 missing resource, 409 conflict/stale price/invalid lifecycle/idempotency reuse, 413 oversized body, 415 media type, 422 business validation, 429 authentication limit, 503 unconfigured adapter/authentication or unreachable upstream. SQL exceptions remain generic 500 errors. Limit bodies to 256 KiB.

## Endpoints

| Method/path (PHP `/api` prefix) | Permission | Request | Result / persisted records |
|---|---|---|---|
| POST `/auth/register` | Public | full_name, email, password (8–72 bytes), optional phone | customer only; hashed users record, JWT + safe user |
| POST `/auth/login` | Public | email, password | JWT + current user; generic credential error |
| POST `/auth/logout` | Authenticated | {} | token hash in auth_revocations |
| GET/PATCH `/auth/profile` | Self | PATCH full_name/phone/avatar_url; password change requires current_password | users; never returns password hash |
| GET `/catalog` | Public | none | UI catalog projection; private users/bookings/applications absent; anonymous busy intervals include room, start/end and equipment quantities only |
| GET `/workspace` | Authenticated | none | same catalog plus own records; Host sees own Studio bookings/contact details; Admin oversight. No other customers' incident histories in Host projection |
| POST `/booking-quotes` | Customer | Selection below | server itemized price, deposit, effective plan/crew/hours/equipment; quote is advisory and reserves nothing |
| POST `/commands` | Authenticated + command-specific role | command plus `Idempotency-Key` | transactionally persists operation and returns refreshed authorized workspace |
| GET `/reports` | Host/Admin | none | server summary scoped to actor, weekly/monthly physical-room counts, timezone |
| GET `/rooms` | Public | existing keyword/space_type_id/rate_unit/min_price/max_price/min_area/page/limit | existing paginated catalog; historical rate rows are retained as revisions |
| GET `/rooms/{id}` | Public | numeric physical-room ID | detail, images, amenities and active rates |
| GET `/rooms/{id}/calendar` | Public | from/to, max 62 days | busy intervals only, including payment holds and Host review |
| GET `/rooms/{id}/rates` | Public | numeric ID | active rate records |
| GET `/equipments` | Public | required studio_id, optional category_id | Studio equipment records |
| GET `/space-types`, `/amenities` | Public | none | lookup tables |
| GET `/health` | Public | none | PHP/MySQL connectivity; fails if DB unavailable |

Selection: `{roomId:string,start:number,end:number,participants:number,plan:"hourly"|"session"|"combo3"|"combo5"|"combo10",equipment:Record<string,number>}`. Time is epoch **milliseconds**, money integer VND. `equipment` contains paid extras; server adds configured bundled quantities without billing them twice. Legacy session-priced equipment is charged per rental; hourly equipment uses duration. PHP normalizes SQL DATETIME to Vietnam business time; public timestamps are epoch instants.

## Commands

| type | Role | Additional fields / rules |
|---|---|---|
| create | Customer | selection, expectedTotal, expectedDeposit, expectedPolicy; all compared to server values. Requires explicitly saved Host policy, unrestricted customer and valid phone. 24h + payment window lead time, 30m steps, max 24h, physical-room buffer 30m, shared inventory peak |
| payment | Booking customer | id, outcome paid/failed/processing; **development adapter only**. First attempt before deadline; existing in-flight attempt may resolve within 5m grace. Paid becomes pending, not confirmed |
| approve/reject | Owning Host | id; rejection reason required; paid pending booking within 2h. Reject creates full refund obligation |
| cancel | Booking customer | id, reason; snapshot cutoff/refund tiers; unpaid abandonment adds one incident unless verified provider failure; uncertainty must reconcile first |
| admin_cancel | Admin | id, reason; before rental starts; full refund obligation, no customer incident |
| change | Booking customer | id, selection; confirmed, within independent change cutoff, unrestricted, one successful change and one pending request; original retained |
| approve_change/reject_change | Owning Host | id; revalidate all room/equipment/pricing conditions; replacement must be same Studio; deposit retained; excess tracked as refund |
| withdraw_change | Booking customer | id; pending request only |
| checkin/checkout | Owning Host | id; actual server times; checkout completes independently of payment balance; overtime rounds up in 30m blocks; subsequent conflict recorded |
| collect | Owning Host | id, integer amount, method cash/transfer, collectionId; checked-in/completed only, no overpayment; writes payments and snapshot collection in one transaction |
| refund | Owning Host | id, outcome refunded/failed; explicit development adapter; initial attempt + at most two confirmed-failure retries. Uncertain processing outcomes are not retryable |
| reconcile/resolve_refund | Admin | id, reason; reconcile additionally paid:boolean; explicit development adapter only. No claim of real provider evidence |
| application | Customer | studioName, address, description; one pending application |
| review_application | Admin | id, approved:boolean, reason; approved applicant gets Host role and Studio |
| restore/restrict/lock | Admin | userId, reason; restore resets effective incidents but retains rows; booking restriction separate from security lock. Cannot alter Admin locks here |
| request_restore | Restricted customer | reason; one pending support request |
| profile | Self | name, phone |
| studio_save | Owning Host | studio; edit existing approved Studio's name/address/district/description |
| studio_status/room_status | Owning Host or Admin | id, active:boolean; Admin reason required; inactive rejected while future reservations remain |
| type_save | Owning Host | roomType; name/category/hourlyRate/plans; Studio ownership immutable |
| room_save | Owning Host | room; code/name/typeId/area/capacity/floor/feature/images/included/rateOverride; exact existing unit preserved, duplicate Studio code rejected under write lock |
| equipment_save | Owning Host | equipment; quantity/price/pricingUnit/hourlyRate/name/category/image/active; cannot reduce below buffered reservation peak |
| policy | Owning Host | studioId, policy; paymentMinutes one of 15/30/60/120/180, independent 24/48/72h cutoffs, integer deposit percentage and monotonic refund tiers |
| rental_settings | Owning Host | studioId, operatingHours, optional timeSurcharge; validates overnight hours, integer fees and bounded percentage |
| rate/rental_plans/crew_policy/featured_pricing | Owning Host | existing domain Command contract in client/src/domain/engine.ts; validate exact target ownership, bundles, capacity and configuration |
| pricing_batch | Owning Host | commands array of preceding four pricing commands; atomic, no partial draft publication |

Every new business mutation records audit_logs and an integration_requests hash under the same transaction. Reusing an idempotency key with different content returns 409; replay returns current scoped state without repeating effects. Client keeps request identity on ambiguous failure for retry. All new writers serialize on one InnoDB integration_mutex row, then re-read resources and enforce room/equipment conflicts. This deliberately coarse lock favors correctness for this project; throughput, deadlocks, independent writers and actual concurrent MySQL behavior require integration testing. Transactions alone are **not** verification.

## Persistence and compatibility boundaries

`room_types` contains inherited config; room/studio integration_config contains validated overrides/policies. `bookings.integration_snapshot` stores immutable policy/price snapshots plus independent lifecycle, attempts, refunds/history, collections and actual times. Relational booking times/status/prices, booking_details inventory and payments ledger are updated transactionally. Counts/restrictions/incidents, applications, auth revocations and request idempotency have indexed relational tables. No alternative business database/framework was added.

The worker processes expired unpaid holds, five-minute uncertain-payment reconciliation, two-hour Host timeouts/refund obligations, and end-of-rental no-shows. It runs every minute in Compose independently of browsers. Confirmed provider failure never causes a strike. Uncertain attempts keep resources held until Admin reconciliation; this is conservative and must be monitored. Worker failure is logged, not reported as successful processing.

Legacy bookings without policy/payment evidence stay readable and reserved as applicable, but cannot be mutated until an audited record-specific migration reconstructs evidence. No fabricated historical policy. Legacy day/week/month rates remain in SQL/legacy APIs; the approved v1 UI does not automatically activate them. Supported duration rates are imported without inventing fixed session start times or discounts. Host must review inherited type grouping and configure policy before accepting new holds.

Live bank/payment/refund adapters, arbitrary package IDs, file upload/storage and delivery of support contacts remain absent. PAYMENT_ADAPTER=disabled rejects payment/refund simulation; development requires APP_ENV=dev/test **and** PAYMENT_ADAPTER=development. No simulated result represents real funds. Helpdesk remains its existing PHP module/contract; the bridge now forwards only the HttpOnly business identity. Provider credentials, knowledge publication and staff identity remain separately configured.
