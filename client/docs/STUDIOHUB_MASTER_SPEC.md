# Implementation blueprint
Sources: original business specification and StudioBlank reference in references/. Functional rules outrank design defaults; DESIGN.md is the sole active visual authority.

Presentation uses Next App Router with a shared client application and route-specific components. Domain models and pure workflow reducers live in src/domain. Fixtures and browser persistence live in src/data. A replacement API repository can provide the same load/save boundary; server-side authorization, locking, idempotency and money verification remain future backend responsibilities.

Bookings reserve exact room IDs and equipment over buffered intervals. Each booking snapshots Studio policies. New bookings require 24h plus payment window lead time. A deposit transitions awaiting_payment to pending; Host has exactly 2h. Payment processing begun before the deadline has 5min grace, then reconciliation without a strike. Refund attempts retain history and cap at 3 total verified attempts. No-show keeps deposit without adding a strike. Checkout completes rental independently of balance. Reschedules retain the old slot until approval and retain the deposit.

Demo assumptions: one illustrative Studio, four Room Types, eight physical units, VND integer arithmetic, Asia/Ho_Chi_Minh display, 08:00–22:00 illustrative opening hours; fixture rates/deposit/refund thresholds are examples and are labeled accordingly. No damage/tax policy. Single-browser localStorage persistence does not promise cross-device or multi-tab transaction safety.
