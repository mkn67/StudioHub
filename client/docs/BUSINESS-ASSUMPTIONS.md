# Demo business assumptions

These are implemented frontend rules for a reviewable demonstration, not finalized production policies. Domain states, Vietnamese display states and future backend contracts remain distinct.

| Topic                 | Demo behavior                                                                                                             | Backend alignment required                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Time                  | Epoch instants; input and display use Asia/Ho_Chi_Minh / UTC+7 explicitly                                                 | Server clock, authoritative availability, timezone contract               |
| Rental units          | Online hour, whole session, or whole 24-hour day; half-day, week and month are labeled reference rates                    | Official packages and billing boundaries                                  |
| Sessions              | Configurable per studio, initially 240 minutes                                                                            | Whether sessions have fixed calendar windows                              |
| Time steps            | Configurable per studio, initially 30 minutes                                                                             | Supported increments and exception handling                               |
| Equipment             | Shared studio inventory; peak simultaneous committed quantities determine remaining stock                                 | Warehouse movements, reservations, maintenance and true transaction locks |
| Cleaning              | Trailing room buffer, initially 30 minutes; equipment returns at rental end                                               | Real cleanup and equipment return procedures                              |
| Deposit               | Configurable studio percentage, initially 30%; integer VND and deterministic rounding                                     | Payment authorization, settlement and reconciliation                      |
| Hold                  | A new unpaid order holds capacity for 15 minutes; expiry releases it and records an event                                 | Server jobs, clock drift, production expiry and recovery                  |
| Payment               | Explicit success/failure/cancellation simulation; every retry is recorded on the same order                               | Gateway callbacks, idempotency and disputes                               |
| Confirmation          | Successful deposit leaves the order pending host confirmation                                                             | Actual acceptance SLA and exceptions                                      |
| Customer cancellation | Unpaid/pending-confirmation orders are cancellable; confirmed orders require a configurable lead time, initially 24 hours | Official cancellation policy and legal terms                              |
| Paid cancellations    | Deposit becomes pending-policy, never automatically refunded                                                              | Eligibility, amount, timing and refund processing                         |
| Completion            | Host explicitly completes eligible confirmed orders after rental end                                                      | Completion exceptions and settlement state                                |
| Admin cancellation    | Only eligible exceptional cases; reason required and appended to audit/timeline                                           | Production permissions and appeals                                        |
| Account lock          | Retain session and approval; restrict to Account Status; keep existing bookings                                           | Security policy and authentication invalidation                           |
| Visibility            | Account, studio, room, catalog and rate prerequisites combine into effective bookability                                  | Backend enums and authoritative publication validation                    |
| Approval              | Account-scoped application, reasoned rejection, edit/resubmit; approval creates no studio                                 | Identity checks and required evidence                                     |
| Analytics             | Confirmed/completed snapshot values by rental start; occupancy clipped to the period and opening hours                    | Official reporting definitions, tax and accounting                        |

The browser service validates permission and rechecks resources at creation and successful simulated payment. These checks support demonstration consistency; they do not provide production security or transactional concurrency. No privacy policy or legally binding terms are fabricated.
