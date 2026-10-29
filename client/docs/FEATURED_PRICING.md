# Editorial Room Detail and featured pricing

Implemented 27 October 2026. Scope: public Room Detail content and Host pricing presentation metadata. Existing PHP modules/routes/schema/migrations, authentication, Helpdesk, booking wizard, financial calculations, availability and payment handling are unchanged.

## Pricing model and scope

The current frontend has no independent rental-rate entities. RoomType.plans lists enabled Plan values; RoomType.hourlyRate is inherited unless Room.rateOverride is present. Supported duration rules already used by booking are hourly=1h, session=4h (08–12), combo3/5/10=3/5/10h. The editorial list renders only the actual enabled list, computes the same hourly-rate × duration amount as before and labels /giờ, /buổi or /gói explicitly. No package discount or promotion is invented.

Each physical Room may have one optional presentation field:

~~~ts
featuredPricing?: {
  typeId: string;
  plan: Plan;
  badge: "featured" | "recommended";
}
~~~

The typeId prevents a selection being applied to a different inherited rate family after a room moves. No plans are duplicated. Existing stored v1 state without this optional field remains compatible and has no default featured selection.

The featured_pricing command requires the existing owning Host permission, resolves effective active room/Studio plans, validates the badge and replaces or deletes this one object. It changes only presentation metadata and a minimal audit event; it bypasses booking ticking so selecting a highlight cannot transition bookings or financial state. Booking price/deposit functions and the booking widget's hourly amount/default plan are unchanged.

effectiveFeaturedPricing rechecks current scope, badge, room/Studio activity and enabled plan membership before displaying anything. Relevant rate/type/room/Studio updates remove invalid featured metadata; re-enabling a removed plan does not silently restore a selection. Changes in inherited rate/Room Unit override amounts still use the effective current amount, not a featured-price copy.

## UI

Room Detail uses open editorial sections, 30–40px headings, 18–20px primary copy, prominent actual area/capacity/location, a two-column amenity icon list, a separate included-equipment line and paid-equipment rows with explicit hourly units. Pricing is a vertically separated list with one optional cyan-accented featured row. Policies remain grouped text with actual Studio values and emphasized numbers. Gallery, sticky booking panel, mobile booking actions and booking wizard remain in their existing locations and handlers.

Host /host/rates keeps existing rate/plan editing and adds a per-type manager that explicitly chooses a physical room, badge style and eligible plan. Each eligible plan has its own select action; the current selection and remove action are clear. The shared PricingList component renders the immediate preview and public list. Static flame/star badges remain legible without motion; scoped existing GSAP helpers provide restrained headings/selection fades.

Only “Gói nổi bật” and “Host đề xuất” are supported. “Ưu đãi” is not offered because there is no verified promotion model/record. No popularity, urgency, sales percentage or bestseller claim is generated.

## Persistence boundary

The existing Provider/execute/browserRepository flow saves the optional Room metadata under studiohub.demo.v1 in localStorage. Host and Customer routes in the same browser origin see the shared state; refresh preserves it. This is demo persistence, not authenticated multi-user server persistence. No new localStorage key, schema migration or fixture default selection was added. Existing cross-tab behavior is unchanged; another tab needs the existing reload flow.

## Minimal future server contract — proposal only

The actual PHP route inventory contains public GET /api/rooms/{numericId}/rates but no verified rate-management/featured-selection write endpoint. The following is NOT implemented or called:

~~~http
PUT /api/rooms/{numericRoomId}/featured-pricing
Authorization: Bearer <real PHP token>
Content-Type: application/json

{
  "rateId": 123,
  "badge": "recommended",
  "expectedRevision": 4
}
~~~

Use rateId=null to clear. A future endpoint must reload live identity/role, verify Host ownership, resolve the effective active price configuration for the exact physical room (including inheritance/overrides and effective dates), validate the referenced stable rate ID, and atomically upsert at most one selection per Room Unit. Return the selection and new revision; stale revisions return 409. Missing/disabled/inapplicable prices must produce no public badge. A trusted future effective-rate projection must map numeric backend rate IDs to this frontend model; mock room IDs/Plan strings are not assumed to be existing PHP IDs.

Store the reference/badge/revision separately from price, discount, booking and payment data. No price or financial snapshot may be rewritten. A future promotional badge additionally requires an actual promotion reference, applicability and validity checks; a bare style string must not assert a discount. Backend tables, endpoint registration and migrations require a separate implementation task.

## Actual verification

- 43 domain tests passed: 34 existing plus nine new featured-pricing tests. New cases cover select/change/remove/uniqueness, independent same-type rooms, overrides, disabled/deleted/moved/inactive scope, invalid plans/unverified promotion labels, owning Host authorization, unchanged totals/deposits/business state and existing repository persistence.
- Dedicated browser QA passed 174 checks, zero page errors, at 360/390/768/1024/1440 in reduced/full motion.
- Browser checks include Host/public preview agreement, changing/removing selections, refresh, override prices, no default selection, disabled-plan removal/no automatic restoration, no price overflow, sticky/mobile booking controls, gallery Escape and actual mock booking completion.
- The browser booking kept hourly as its default despite a featured package, and retained the existing 700,000 VND total / 210,000 VND deposit for the seeded two-hour test.
- Lint, TypeScript and the production build passed. The final combined domain + existing Helpdesk regression run passed all 63 tests. The build retains the existing multiple-lockfile workspace-root notice; no unrelated configuration was changed.
- Screenshots: client/.impeccable/review/featured-pricing/ (ignored local QA artifacts); desktop/mobile public pricing and Host management inspected.

Reproduce from client/:

~~~powershell
npm.cmd run lint
npm.cmd run typecheck
.\node_modules\.bin\tsx.cmd --test src/domain/*.test.ts
node scripts/featured-pricing-qa.mjs
~~~

The browser QA defaults to http://localhost:3000; FEATURED_PRICING_QA_URL can target another isolated local frontend. It uses independent browser contexts and local demo data, never existing customer data or a business API.

## Exact source files

Modified:

- client/src/domain/models.ts — optional presentation metadata types.
- client/src/domain/engine.ts — new isolated metadata command and invalid-selection cleanup; existing pricing/lifecycle calculations unchanged.
- client/src/components/marketplace.tsx — delegate only Room Detail's left editorial content; remove duplicate floor in the heading.
- client/src/components/operations.tsx — add featured managers alongside existing Host rate forms.

Created:

- client/src/domain/featured-pricing.ts
- client/src/domain/featured-pricing.test.ts
- client/src/features/pricing/components/PricingList.tsx
- client/src/features/pricing/components/FeaturedPricingManager.tsx
- client/src/features/pricing/components/RoomEditorialContent.tsx
- client/src/features/pricing/styles/editorial.module.css
- client/scripts/featured-pricing-qa.mjs
- client/docs/FEATURED_PRICING.md

No commit, push or deployment.
