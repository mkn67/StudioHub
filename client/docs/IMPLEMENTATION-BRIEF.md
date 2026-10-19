# MASTER IMPLEMENTATION PROMPT — STUDIOHUB

## Role and Mission

You are a senior frontend engineer, product designer, UI/UX architect, accessibility specialist, and design-system engineer.

Your assignment is to design and implement **StudioHub**, a complete, responsive, production-quality frontend demonstration for a multi-provider studio rental marketplace.

You are responsible for implementing the entire frontend application from initial repository inspection to the final integrated experience.

**Do not stop after scaffolding, generating a homepage, or producing static dashboard mockups.**

Build the complete application, including public marketplace pages, authentication, customer booking flows, mock payments, customer booking management, studio owner management, administrator management, shared mock data, automated tests, and responsive behavior.

The target outcome is a cohesive, believable product interface that looks intentionally designed by an experienced product team, rather than a collection of generic AI-generated templates.

Use the installed **Impeccable** design skill throughout the implementation to improve visual quality, interaction design, consistency, and polish.

All customer-facing interface copy must be written in **Vietnamese**. Code identifiers, documentation, and technical comments should be written in English.

---

# 1. Core Execution Instructions

You must execute this assignment end to end.

Before modifying anything:

1. Inspect the existing repository.
2. Read its package configuration, directory structure, dependencies, existing design system, and relevant project instructions.
3. Determine whether it already contains a Next.js application.
4. Preserve useful existing code and configuration.
5. If the repository is empty, initialize a new application.
6. Create a clear implementation plan with sequential internal milestones.
7. Implement each milestone, run relevant checks, fix problems, and continue.
8. Finish with integrated end-to-end verification.

Do not request confirmation after every milestone.

Do not prematurely declare the task complete.

If you encounter an implementation problem, investigate and resolve it rather than bypassing the requirement with a placeholder.

If a specific operation requires unavailable tooling, report that limitation accurately and continue with the remaining work.

Do not overwrite unrelated files, remove existing user work, or perform destructive repository operations without necessity.

Maintain a progress document so unfinished work can be resumed without losing context.

## Non-negotiable requirements

- Implement the complete frontend, not just visual prototypes.
- All required routes must exist.
- Every visible action must perform its intended operation.
- Shared data must remain consistent across customer, host, and admin screens.
- Never create independent mock datasets for each page.
- Use a reusable design system.
- Follow the detailed UI specifications below.
- Make the interface responsive.
- Ensure accessible keyboard and focus behavior.
- No fabricated platform statistics, testimonials, ratings, or user activity.
- No fake backend integrations.
- No fake successful API calls to nonexistent services.
- No dead links or decorative controls that appear functional.
- No unfinished TODO-only screens presented as completed features.
- Do not silently invent official business policies.
- Use configurable demo assumptions where specified.

---

# 2. Product Definition

## Product name

**StudioHub**

## Product category

A marketplace and management platform for renting physical studio spaces and optional equipment or furniture.

## Core customer needs

Customers can:

- Discover available studios.
- Search by location, studio type, and rental date.
- Filter rooms by price, area, capacity, and amenities.
- Explore studio details and photo galleries.
- Compare available rental rates.
- Select rental dates and times.
- Check availability.
- Add rentable equipment or furniture.
- Create bookings.
- Complete a simulated deposit payment.
- Monitor booking status.
- Cancel eligible bookings.
- Retry incomplete payments.
- Review booking history.

## Studio owner needs

Studio owners can:

- Manage multiple studio locations.
- Configure studio settings.
- Create and manage rentable rooms.
- Manage room images, capacities, amenities, and visibility.
- Manage equipment and furniture inventory.
- Configure rental rates.
- Review a booking calendar.
- Confirm or reject booking requests.
- Cancel eligible confirmed bookings.
- Mark completed bookings.
- Monitor basic statistics and revenue estimates.

## Administrator needs

Administrators can:

- Review studio owner registration applications.
- Approve or reject studio owner accounts.
- Manage account access.
- Lock and unlock accounts.
- Inspect studios and rooms across the platform.
- Hide or unhide studios and rooms independently of owner-controlled visibility.
- Manage shared studio-type and amenity catalogs.
- Monitor all bookings.
- Cancel eligible bookings exceptionally.
- Inspect audit logs.

## User roles

Exactly three primary roles:

- `customer`
- `host`
- `admin`

An account belongs to one role.

Do not implement role switching or account impersonation.

---

# 3. Technical Stack

Use the following stack.

## Required

- Next.js App Router
- React
- TypeScript with strict mode enabled
- Tailwind CSS
- shadcn/ui
- Radix UI primitives where necessary
- lucide-react
- react-hook-form
- Zod
- Recharts through the shadcn/ui chart patterns
- Vitest
- React Testing Library
- Playwright
- @axe-core/playwright

Use `src/` for application source code.

Use a consistent import alias such as `@/`.

Use the existing compatible dependency versions when inspecting an established repository.

Do not downgrade or unnecessarily replace packages.

## State management

Prefer React state, Context where appropriate, custom hooks, and an external-store subscription for shared mock data if needed.

Do not introduce Redux, Zustand, or another large state-management library unless there is a concrete technical necessity.

## Additional dependencies

Do not introduce dependencies casually.

When an additional library is required, explain why the existing stack is insufficient.

## Explicitly out of scope

Do not implement:

- A separate backend server.
- PHP REST APIs.
- A real database.
- Real authentication or JWT validation.
- Real payment gateway integrations.
- Actual refunds.
- Email delivery.
- SMS or OTP.
- Social login.
- Password recovery.
- Two-factor authentication.
- Push notifications.
- Dark mode.
- Multilingual UI.
- Real-time multi-device synchronization.
- Server-side file storage.
- Advanced business policy engines.
- Features not included in this specification.

This is a sophisticated frontend demonstration, not a production backend.

---

# 4. Impeccable Design Skill — Mandatory

The user already uses Impeccable and wants to minimize the recognizable patterns of generic AI-generated websites.

You must actively use Impeccable rather than merely mentioning it.

## Skill discovery

At the beginning of the task:

1. Inspect the available agent skills and repository instructions.
2. Locate the installed Impeccable skill, including a project-local or user-level installation where available.
3. Read its actual instructions before invoking it.
4. In Codex, use the supported `$impeccable` skill interface when available.
5. If the installed version exposes commands such as `init`, `critique`, `audit`, `polish`, or `distill`, use them through the supported interface.
6. Do not invent shell commands or assume a skill invocation succeeded without verifying it.
7. Do not reinstall an existing working skill unnecessarily.
8. If Impeccable is unavailable, document that and perform an equivalent manual design review instead.

## Design context

Initialize or maintain the Impeccable product/design context using the following project information.

**Product:** StudioHub.

**Audience:** Vietnamese customers searching for rentable studio spaces, studio owners operating their facilities, and platform administrators.

**Brand personality:** Practical, calm, trustworthy, modern, clear, and intentionally minimal.

**Visual direction:** Warm Minimal Marketplace combined with a restrained operational SaaS dashboard.

**Reference qualities:** Clear search-first experiences, high-quality image composition, straightforward booking, legible data tables, compact operational interfaces.

**Anti-references:** Generic AI SaaS landing pages, oversized marketing hero sections, over-decorated statistic cards, repetitive gradient backgrounds, excessively rounded components, meaningless illustrations, and gratuitous animation.

If `PRODUCT.md` and `DESIGN.md` already exist, inspect and preserve useful project-specific decisions.

Where the skill supports it, record this product context for future reviews.

## Required Impeccable workflow

Use Impeccable at meaningful checkpoints:

### Before implementation

Review the intended visual direction, component hierarchy, typography, spacing, and page composition.

### After building the marketplace

Critique Homepage, Search Results, and Room Detail.

Review whether the pages feel like a credible studio marketplace rather than a generic template.

### After building Booking

Audit visual hierarchy, form clarity, friction, feedback, responsive behavior, and accessibility.

### After building dashboards

Critique density, table usability, navigation hierarchy, empty states, and operational clarity.

### Before finishing

Perform a comprehensive design critique, technical audit, polish pass, and simplification pass using the supported Impeccable workflows.

Where available, these may include:

- `critique`
- `audit`
- `polish`
- `distill`
- `harden`
- `adapt`
- `typeset`
- `layout`

Do not invoke unsupported commands blindly; inspect the installed version first.

If browser-based visual iteration is supported, use it.

## AI-generated UI anti-patterns to avoid

Do not use:

- Purple-to-blue gradients.
- Generic centered SaaS hero layouts.
- Arbitrary floating geometric decorations.
- Excessive glassmorphism.
- Random orange gradient surfaces.
- Oversized border radii everywhere.
- A colored icon tile above every heading.
- Cards nested unnecessarily inside cards.
- Excessive shadows.
- Fake metric growth indicators.
- Meaningless dashboard graphs.
- Repetitive layouts that give all content equal emphasis.
- Decorative animations with no interaction purpose.
- Generic marketing claims.
- Stock-image-style testimonial sections.
- A different design language on every route.

The result should have deliberate visual hierarchy, consistent spacing, appropriate information density, excellent Vietnamese typography, and a restrained design vocabulary.

**Do not sacrifice usability or accessibility merely to make a design more unusual.**

---

# 5. Design System

## Color palette

Use the following initial design tokens:

- Background: `#FAFAF9`
- Main foreground: `#18181B`
- Primary orange: `#C2410C`
- Accent orange: `#F97316`
- Main surfaces: white or warm near-white
- Borders: neutral, subtle, typically 1px

Define additional tokens for:

- Secondary foreground.
- Muted backgrounds.
- Dividers.
- Hover.
- Focus.
- Disabled controls.
- Error.
- Warning.
- Success.
- Destructive actions.

Choose accessible text/background combinations.

The primary orange should emphasize the main action on a page, not every clickable element.

Destructive actions use a distinct warning/destructive treatment.

Do not use orange as a generic selected-state background in data-heavy dashboards.

## Typography

Use **Be Vietnam Pro** through `next/font` where practical.

Ensure full Vietnamese character support and correct rendering of diacritics.

Create a deliberate type hierarchy:

- Page title.
- Section title.
- Card title.
- Body.
- Supporting text.
- Labels.
- Captions.
- Tabular figures.

Use approximately 14–16px for normal interface content, with larger page titles and slightly denser dashboard metadata when appropriate.

Avoid tiny or low-contrast text.

Use tabular numerals for prices, counts, and dashboard figures.

## Spacing

Use a consistent 4px-based spacing rhythm.

Avoid arbitrary padding values throughout the application.

Prefer generous whitespace on marketing and marketplace screens, and intentional compactness for operational tables.

## Corners and borders

Use restrained radii, generally around 4–6px for standard controls, with slightly larger radii only where composition benefits.

Prefer borders over shadows.

Avoid excessive layers of containers.

## Motion

Use minimal motion:

- Mostly opacity and transform.
- Typical duration: 150–250ms.
- Subtle sheet/dialog transitions.
- Subtle hover state transitions.
- No page-transition spectacles.
- No bouncing animations.
- No animated KPI counting.
- No lifting cards dramatically on hover.

Respect `prefers-reduced-motion`.

Disable unnecessary motion for users who request reduced motion.

## Buttons

Each page should have a clear primary action.

Secondary and tertiary actions must have appropriate visual hierarchy.

Destructive actions must not be styled like the ordinary orange primary button.

All actionable touch targets should generally be at least 44px high or provide an equivalent usable target.

## Feedback

Implement a shared toast system:

- Maximum three concurrent toasts.
- Ordinary toasts remain visible for at least five seconds.
- Pause dismissal on hover or focus.
- Error toasts remain until dismissed.
- Use appropriate live regions.
- On mobile, position toasts above fixed bottom action bars.

Use inline form errors for problems requiring corrective action.

Use dialogs for irreversible or consequential decisions.

---

# 6. Responsive Design

The application must be tested at:

- 360px
- 390px
- 768px
- 1024px
- 1440px

Do not create unintentional horizontal page scrolling.

Data tables may have explicitly labeled horizontal scrolling regions.

Mobile bottom action bars must respect iPhone safe-area insets.

## Responsive principles

### Marketplace

- Search becomes progressively compact.
- Mobile search opens a detailed bottom sheet.
- Category cards scroll horizontally on small screens.
- Search Results display one-column vertical cards.
- Room Detail uses a mobile booking bar.

### Customer booking

- Booking Summary becomes an expandable fixed bottom summary on mobile.
- The summary must not cover the Continue button.
- Forms become single-column.
- Step indicators remain readable and keyboard-accessible.

### Host Dashboard

Prioritize mobile usability for:

- Overview.
- Booking management.
- Calendar.

Other management screens must remain usable.

Use a navigation drawer, responsive cards for bookings, and explicitly scrollable data tables where appropriate.

### Admin Dashboard

Prioritize mobile usability for:

- Overview.
- Host approval.
- Search and lookup.

Other administrative screens remain accessible through a drawer and scrollable tables.

---

# 7. Project Architecture

Organize the code by application routes, feature modules, shared UI components, domain logic, and services.

Suggested structure:

- `src/app`: Next.js App Router pages, layouts, loading, error, and not-found boundaries.
- `src/components/ui`: shadcn/ui primitives.
- `src/components/layout`: Navbars, sidebars, dashboard shells, footers.
- `src/components/forms`: Reusable form components.
- `src/components/data-table`: Shared table components.
- `src/components/shared`: Status badges, image fallbacks, summaries, timelines.
- `src/features/auth`: Authentication UI and hooks.
- `src/features/account`: Account status and profile.
- `src/features/marketplace`: Homepage, results, room detail.
- `src/features/booking`: Booking wizard.
- `src/features/payment`: Mock payment.
- `src/features/customer-bookings`: My Bookings.
- `src/features/host`: Studio owner features.
- `src/features/admin`: Administrator features.
- `src/domain`: Pure business logic and domain types.
- `src/services`: Shared service interface and mock implementations.
- `src/services/storage`: Browser storage adapter and migrations.
- `src/services/seed`: Seed data generation.
- `src/lib`: Formatting and shared utilities.
- `src/hooks`: Reusable hooks.
- `src/providers`: Shared React providers.
- `tests/unit`: Domain unit tests.
- `tests/components`: Component tests.
- `tests/e2e`: Playwright tests.
- `tests/fixtures`: Deterministic test fixtures.

Do not unnecessarily duplicate business logic between route components.

Keep components reasonably small and focused.

Use Zod for validating form submissions and persisted mock data.

---

# 8. Server and Client Boundaries

Use Next.js App Router correctly.

Server Components are appropriate for static shells, static seed information, and server-readable metadata.

Client Components are required for interactive functionality and browser storage.

Do not use `localStorage`, `sessionStorage`, or browser APIs during server rendering.

Avoid turning the entire application into a Client Component unnecessarily.

## Metadata

Public room URLs use:

`/studios/[slug]`

Use `generateMetadata()` with server-readable seed data for:

- Page title.
- Description.
- Open Graph image.
- Other applicable metadata.

For rooms created dynamically in browser storage, use a sensible server-readable fallback.

Do not pretend server-generated metadata knows about changes stored only inside one user's browser.

Authentication and private dashboard pages should be marked appropriately for search engine indexing.

---

# 9. Routes to Implement

Implement the following routes, adjusting directory organization to existing repository conventions without changing the intended public URLs.

## Marketplace

- `/`
- `/studios`
- `/studios/[slug]`
- `/become-a-host`

## Authentication and account

- `/login`
- `/register`
- `/register/host`
- `/account`
- `/account/status`

## Customer booking

- `/booking/[slug]`
- `/payment/[code]`
- `/payment/[code]/result`
- `/my-bookings`
- `/my-bookings/[code]`

## Host

- `/host`
- `/host/bookings`
- `/host/bookings/[code]`
- `/host/calendar`
- `/host/rooms`
- `/host/rooms/new`
- `/host/rooms/[id]/edit`
- `/host/equipment`
- `/host/pricing`
- `/host/analytics`
- `/host/studio/settings`

Support creation of a first studio and additional studios through the host settings flow.

## Admin

- `/admin`
- `/admin/approvals`
- `/admin/users`
- `/admin/users/[id]`
- `/admin/studios`
- `/admin/studios/[id]`
- `/admin/categories`
- `/admin/bookings`
- `/admin/bookings/[code]`
- `/admin/audit`

Every route must have a meaningful implemented screen.

No unexplained blank pages.

---

# 10. Shared Mock Data System

This is the foundation of the entire application.

**All customer, host, and administrator interfaces must read and modify the same data source.**

Do not maintain separate booking arrays inside the three role-specific feature folders.

## Storage

Use:

- `localStorage` for versioned persistent demo data.
- `sessionStorage` for the current mock login session and relevant booking drafts.

All storage access must occur through dedicated adapters.

UI components must not directly call `localStorage.getItem()` or `localStorage.setItem()`.

## Architecture

Create a shared service interface that exposes domain operations for:

- Users.
- Authentication.
- Host applications.
- Studios.
- Rooms.
- Images.
- Space types.
- Amenities.
- Equipment.
- Rental rates.
- Availability.
- Bookings.
- Payments.
- Audit events.

Separate internal implementations into domain modules.

The UI consumes the service interface.

Keep pricing, access control, availability, and status derivation as reusable pure functions wherever possible.

## Storage versioning

Persist:

- Schema version.
- Revision identifier.
- Initialization timestamp.
- Normalized collections.
- Required metadata for migrations.

On startup:

1. Detect existing data.
2. Seed only if appropriate.
3. Validate persisted data with Zod.
4. Apply known migrations.
5. Preserve valid user changes.
6. Handle corrupted data gracefully.
7. Offer a confirmed demo reset when recovery is impossible.

Do not silently reset storage on ordinary page navigation.

## Synchronization

Changes within the same browser tab must notify subscribed components.

Changes in another tab should be observed through `storage` events.

Use a consistent subscription mechanism.

Do not promise real-time synchronization across devices.

Be explicit that browser storage is not a transactional database.

## Demo reset

Add a clearly labeled **Reset Demo Data** action inside a demo-oriented account or settings menu.

Require confirmation.

Reset shared mock collections to a coherent seed state.

Keep the implementation separate from production UI concepts.

## Seed data

Provide realistic, internally consistent seed records.

At minimum include:

- One administrator.
- One active customer.
- One approved host owning two studios.
- One pending host application.
- One rejected host application.
- One locked account.
- Several studio types.
- Several amenities.
- Several studios and rooms.
- At least one room with no optional equipment.
- Multiple rental rates.
- Equipment shared across rooms of the same studio.
- Equipment with different rental pricing units.
- Active, paused, hidden, and administrator-hidden room examples.
- A studio hidden by an administrator.
- Bookings across all supported display states.
- An unpaid booking.
- A failed-payment booking.
- A pending-confirmation booking.
- A confirmed booking.
- A booking past its end time awaiting manual completion.
- Completed historical bookings.
- Rejected, cancelled, and expired bookings.
- Bookings close together that still respect the cleaning buffer.
- An administrator-monitoring scenario.
- Audit events consistent with actual seeded states.

Use coherent Vietnamese studio names, locations, descriptions, and contact details.

Avoid invented ratings, testimonials, rental popularity, or platform-wide commercial claims.

Use relative dates based on the current Vietnam date when generating development seed data, so demo bookings do not all become outdated.

Make automated tests deterministic by using injected or frozen time.

---

# 11. Core Data and Business Invariants

## Money

All persisted monetary amounts are integer VND.

Display amounts in Vietnamese formatting, such as:

`250.000đ`

Never display ambiguous prices without their rental unit.

Do not use floating-point numbers for stored money.

## Time

Persist time instants as Unix epoch milliseconds.

Display times using `Intl.DateTimeFormat` with:

`Asia/Ho_Chi_Minh`

Do not depend on the operating system's local timezone.

Convert user-selected Vietnam-local dates and times to instants explicitly.

Use half-open intervals for time conflict detection.

## Booking units

The user has selected these demo policies:

- Each studio configures its selectable time increment.
- Each studio configures the number of hours in one session.
- Hourly rental supports fractional units such as 2.5 hours.
- Session rental uses whole sessions.
- Day rental uses whole 24-hour periods.
- Multi-day rental is continuous.
- Each room has its own operating schedule.
- Only rooms configured to support continuous overnight rental may offer a full 24-hour period.
- Room cleaning buffer defaults to 30 minutes after the booking.
- Each studio can configure its deposit percentage.
- Demo Studio A uses a 30% deposit.
- Demo Studio B uses a 50% deposit.
- Unpaid bookings have a 15-minute temporary hold.
- Remaining payment is displayed but not collected in this demo.
- Refunds are not automatically executed.
- Rejected host applications may be resubmitted without a demo limit.

Seed distinct values for studio-level time increments and session durations to prove the configurations work. Clearly mark these as demo settings.

The service should centralize these configurations.

## Pricing

Implement one reusable pure calculation function:

`calculateBooking()`

It must calculate:

- Rental duration.
- Applicable rental units.
- Room rental amount.
- Each selected equipment line.
- Equipment total.
- Booking total.
- Deposit amount.
- Remaining balance.

Hourly quantities may be fractional according to the configured time increment.

Use integer-minute calculations to avoid time and floating-point inconsistencies.

Use explicit deterministic monetary rounding to the nearest integer VND where required.

Do not calculate units separately inside React components.

Use the same pricing function or its saved snapshot throughout:

- Room Detail.
- Booking.
- Booking Summary.
- Checkout.
- Payment Page.
- Booking Detail.

## Equipment pricing

Equipment may be priced by:

- Hour.
- Session.
- Day.

Its line total must reflect quantity and applicable rental units.

Do not treat every equipment rental as a one-time charge.

Store the calculated line amount and pricing basis in the booking snapshot.

## Rental rates

Support management of the following rate units:

- Hour.
- Session.
- Half-day.
- Day.
- Week.
- Month.

Only hour, session, and supported multi-day booking flows are enabled for online booking in the demo.

Half-day, week, and month rates may be managed as reference-only rates and must be labeled accordingly.

Rate validation must check:

- Positive integer VND price.
- Valid effective dates.
- Minimum rental units.
- Maximum rental units.
- Valid unit selection.
- No overlapping effective periods for two rates with the same unit in the same room, according to the agreed demo rule.

Existing bookings keep the original pricing snapshot after rates change.

## Room availability

Implement a shared function such as:

`checkAvailability()`

Validate:

- Start time before end time.
- No booking in the past.
- Room is effectively publicly bookable.
- Room operating hours.
- Overnight rental policy.
- Studio time-step configuration.
- Minimum and maximum duration.
- Applicable active rate.
- Room capacity.
- Existing occupying bookings.
- The 30-minute room cleaning buffer.

A room booking interval occupies the room from the selected start through its end plus the configured cleaning buffer.

Two room bookings must not overlap their occupied intervals.

Do not count rejected, cancelled, or expired bookings as active room holds.

## Equipment availability

Only equipment belonging to the same studio may be rented with the selected room.

Availability depends on:

- Equipment status.
- Total quantity.
- Quantities already reserved for overlapping rental periods.
- Requested quantity.

A single studio may have multiple rooms sharing its equipment inventory.

Availability must therefore be calculated across relevant bookings, not only bookings for the selected room.

Do not display a permanently calculated "quantity remaining" in the host inventory table, because availability changes by requested time range.

## Booking lifecycle

Keep the underlying mock order status separate from its payment status and derived display status.

Support display states:

- Awaiting deposit.
- Pending host confirmation.
- Confirmed.
- Completed.
- Rejected.
- Cancelled.
- Expired.

Do not implement check-in UI solely because a backend schema contains a `checked_in` value.

A pending-payment booking holds the room temporarily until its configured expiration.

A successfully deposited booking enters the host confirmation queue.

The host may confirm or reject only a deposited, pending-confirmation booking.

A confirmed booking remains an active reservation.

Completion requires a deliberate host action after the rental end time.

Do not automatically complete a booking.

Cancellation and rejection release room and equipment holds according to the shared availability rules.

## Payment mock

Create a dedicated simulated payment page.

Support:

- Pending payment.
- Successful payment.
- Failed payment.
- User-cancelled payment.
- Retrying payment.
- Expired payment hold.

Never create a second booking merely because payment is retried.

Payment retries create a new payment attempt associated with the existing eligible booking.

A successful payment records the deposit amount.

Do not claim the remaining balance has been paid.

Do not implement an actual refund.

When an order is rejected or cancelled after deposit, display an appropriate pending-policy refund status without claiming money has been returned.

## Idempotency and state checks

Before creating, cancelling, confirming, rejecting, completing, or paying an order:

- Read its latest state.
- Revalidate permissions.
- Revalidate applicable time constraints.
- Revalidate required resources.
- Prevent duplicate submissions.
- Return a typed failure if the action is no longer valid.
- Update the appropriate timeline and audit records.

These safeguards make the demo coherent but are not a substitute for backend transactions.

---

# 12. Shared Access Control

Implement a single reusable access resolver:

`resolveAccess(user, route)`

It should derive whether the current session is:

- Loading.
- Unauthenticated.
- Authenticated and allowed.
- Authenticated with the wrong role.
- Pending approval.
- Rejected.
- Locked.

## Session

Store only essential mock session information, such as user ID and login time, in session storage.

Do not use session storage as the source of truth for role or account status.

Re-read the current account state from the mock service.

Show a loading shell while initializing to avoid hydration mismatches or premature redirects.

## Role behavior

Customer:

- Can browse publicly.
- Can start Booking without login.
- Must authenticate before Booking Step 3.
- Can access only their own bookings.

Approved host:

- Can access their own host management area.
- Can operate only on studios they own.

Pending or rejected host:

- Can sign in.
- Cannot enter Host Dashboard.
- Can use Account Status.

Locked account:

- Retains the mock session.
- Can view `/account/status` and its reason.
- Cannot use protected business functions.
- Can log out.

Admin:

- Can access Admin Console.
- Cannot impersonate other roles.
- Cannot use customer-only or host-only management routes.

Use generic not-found behavior for cross-owner or unauthorized resource identifiers where appropriate.

## Return URLs

Accept only safe internal destinations.

Reject external protocols, protocol-relative URLs, malformed paths, and redirect loops to authentication routes.

After login, revalidate whether the destination is permitted for the current role.

Fall back to the appropriate role home when invalid.

## Password handling

Demo accounts may have explicitly documented sample credentials.

Newly registered demo accounts must not persist plaintext passwords.

Use Web Crypto with per-account salt and an appropriate password-derived hash where feasible.

Do not describe client-side hashing as secure production authentication.

Show a warning to avoid reusing real passwords.

---

# 13. Homepage

Create a search-first marketplace homepage.

## Navbar

Display:

- StudioHub logo.
- "Khám phá Studio".
- "Cho thuê Studio".
- Login/Register controls or the authenticated account menu.

Keep the navbar sticky.

The authenticated account menu changes according to role.

"Cho thuê Studio" links to the host introduction/onboarding experience, not automatically to a privileged dashboard.

## Hero

Use the exact concise main headline:

**"Tìm studio, đặt theo giờ."**

Avoid a giant empty hero or broad marketing slogans.

The primary focus is the search interface.

## Main search

Include:

- Location.
- Studio type.
- Rental date.

Use a searchable combobox for studio types when appropriate.

Support direct input, keyboard operation, proper labeling, and validation.

Below search, show useful quick-filter chips for selected locations and studio types.

Clicking a chip updates the relevant search field.

## Homepage section order

1. Studio categories.
2. Featured rooms/studios.
3. How booking works.
4. CTA for studio owners.

Categories use photo-based cards with clearly legible labels.

Featured listings use compact room cards.

Only display availability labels when computed from valid demo availability data.

The booking explanation is:

- Find a studio.
- Select time and optional equipment.
- Submit and track booking.

Do not invent platform usage statistics or testimonials.

## Host CTA

Explain concrete benefits:

- Centralized room management.
- Booking management.
- Equipment management.
- Rental pricing management.

Do not invent commissions, processing times, or guaranteed benefits.

## Footer

Minimal footer with only real destinations.

No placeholder legal or support links without actual pages.

## Mobile

Main search collapses into a compact entry point that opens a detailed bottom sheet.

Category cards scroll horizontally.

Featured listing cards display vertically.

---

# 14. Search Results

Route:

`/studios`

## Desktop layout

- Sticky navbar.
- Compact search summary inside the navbar.
- Search summary expands to edit the selected search criteria.
- Left sidebar approximately 300px wide.
- Main column contains large horizontal room cards.
- Room images occupy approximately 40% of card width.

Sidebar stays visible while scrolling.

If its content exceeds available height, it scrolls internally.

## Filters

Support:

- Location.
- Studio type.
- Rental date.
- Price range.
- Room area.
- Capacity.
- Amenities.

Display active-filter chips above results.

Include a clear "Xóa tất cả" action.

Desktop filters apply immediately.

On mobile, open filters in a bottom sheet and apply using a button labeled "Xem kết quả".

## Sorting

Use a labeled control:

"Sắp xếp: Mặc định"

Options:

- Default.
- Price ascending.
- Price descending.

Do not use an unlabeled sorting icon as the only control.

## Room cards

Display:

- Image.
- Room name.
- Location.
- Area.
- Capacity.
- Price with rental unit.
- Up to three amenities.
- Availability label only when supported by selected date/time data.

Do not show fake ratings, rental counts, or popularity labels.

Clicking the room card or "Xem chi tiết" navigates to Room Detail.

## Pagination

Use numbered pagination.

Preserve filters and sorting.

When filters change, reset to page 1.

Use URL search parameters where practical.

Returning from Room Detail must restore the previous result page and filter state.

## States

Implement:

- Loading skeleton.
- No search results.
- No results after filters.
- Error loading data.
- Image fallback.
- Disabled/unavailable controls.
- Keyboard focus states.

Mobile displays one-column vertical cards and a filter button opening a bottom sheet.

---

# 15. Room Detail

Route:

`/studios/[slug]`

## Breadcrumb

Use:

"Trang chủ / Kết quả / Tên Studio"

Include navigation back to the results while preserving relevant filters, sorting, and page number.

## Desktop layout

The page includes:

- Room title.
- Location.
- Room metadata.
- Mosaic gallery.
- Main content column.
- Sticky booking card approximately 360px wide.

The sticky offset must account for the navbar.

## Mosaic gallery

Use:

- One dominant image.
- Four supporting images.
- "Xem tất cả ảnh" control.

Open an accessible full-gallery lightbox.

Support:

- Keyboard navigation.
- Escape to close.
- Focus trap.
- Focus restoration.
- Meaningful image alt text.
- Image fallback.

## Content sections

Display sequential sections:

1. Room overview.
2. Description.
3. Amenities.
4. Equipment preview.
5. Full rate information.
6. Studio owner and location.
7. Rental rules and cancellation policies.

Do not add ratings or reviews without a supported feature and data model.

## Equipment preview

Show several optional equipment cards with:

- Image.
- Name.
- Price.
- Pricing unit.

Equipment selection and quantities are handled in Booking Step 2.

## Booking card

Show:

- Main reference price and unit.
- Rental date.
- Start time.
- End time.
- Availability status.
- Check availability action.
- Estimated rental price when valid.

Support states:

- Nothing selected.
- Checking availability.
- Available.
- Unavailable.
- Nearby alternative slot suggestions when determinable.
- Schedule loading error.
- Room suspended or not bookable.

Availability suggestions must be calculated from real mock schedule data, not invented.

Successful availability checking allows navigation to the booking wizard with selected data preserved.

The check itself does not reserve the room.

## Mobile

Replace the desktop sticky booking card with a bottom booking bar showing price and a clear action.

Opening it reveals date/time controls.

Respect safe-area insets.

## Error states

Provide appropriate screens for:

- Room not found.
- Room hidden.
- Room suspended.
- Missing images.
- Invalid rate configuration.
- Availability service failure.

Room Detail, Search Results, and Booking must use the shared effective room status function.

---

# 16. Three-Step Booking Wizard

Route:

`/booking/[slug]`

## Overall layout

Three steps:

1. Rental Time.
2. Equipment.
3. Review and Confirmation.

Desktop layout:

- Main step content on the left.
- Sticky price summary on the right.

Mobile layout:

- Single-column step content.
- Expandable bottom price summary.
- Persistent Continue action with adequate spacing.
- Safe-area support.

## Step indicator

Show progress clearly.

Completed previous steps are clickable.

Future steps are disabled.

Set `aria-current` on the current step.

When moving to another step, move focus to the new step heading.

## Step 1 — Rental time

Prepopulate valid selections from Room Detail.

Allow editing:

- Rental dates.
- Start/end times.
- Applicable rental rate.
- Number of participants.

A valid rate may be recommended automatically.

Users may switch to another applicable rate.

Unavailable or incompatible rates should explain why they cannot be selected.

The number of participants is mandatory and cannot exceed room capacity.

Validate configured studio time increments, session durations, minimum and maximum rental limits, room operating hours, overnight policies, and existing bookings.

## Step 2 — Equipment

Display equipment and furniture as cards.

Each card includes:

- Image.
- Name.
- Price.
- Pricing unit.
- Available quantity for the selected period.
- Minus button.
- Quantity.
- Plus button.
- Calculated line total where selected.

Only show equipment from the selected studio.

Do not allow quantity to exceed availability.

Allow customers to continue without any optional equipment.

If a customer changes the rental period after selecting equipment, revalidate selections.

Never silently remove equipment without telling the customer.

## Authentication before Step 3

If the visitor is unauthenticated, redirect to Login while preserving valid booking draft data.

After login, return to the booking wizard.

If the account role is not eligible to book, use the shared access resolver.

## Step 3 — Review

Display:

- Room and studio.
- Start/end times.
- Rental rate.
- Number of participants.
- Selected equipment.
- Customer name.
- Email.
- Phone.
- Optional notes.
- Room cost.
- Each equipment line.
- Equipment total.
- Booking total.
- Deposit.
- Remaining balance.

Prepopulate contact details from the account.

Allow editing the booking contact details without overwriting the account profile.

Show actual configured rental rules.

Require acknowledgement of those rules before creating the booking.

Do not introduce a nonexistent legal Terms of Service page.

Recheck availability when entering Step 3 and again immediately before creating the booking.

## Submission

Prevent duplicate clicks.

If availability changed, show a clear conflict message and return to the relevant step without losing other valid inputs.

If successful:

- Create the booking.
- Create the 15-minute payment hold.
- Persist its snapshot.
- Occupy room and equipment resources.
- Navigate to the dedicated mock payment page.

---

# 17. Dedicated Mock Payment

Route:

`/payment/[code]`

The page must clearly identify payment as a simulation.

Display:

- Booking code.
- Studio and room.
- Rental period.
- Total booking amount.
- Deposit amount.
- Remaining balance.
- Payment status.

Provide working demonstration controls for:

- Simulate successful payment.
- Simulate failed payment.
- Cancel payment.
- Retry a failed or cancelled attempt when the booking remains eligible.

A failed or cancelled payment does not create another booking.

The temporary hold remains valid until its configured expiration unless the booking is explicitly cancelled.

If the hold expires:

- Release room and equipment reservations.
- Disable payment.
- Explain that the booking expired.
- Offer a way to create a new booking draft.

After successful deposit payment:

- Mark the deposit transaction successful.
- Derive booking display status as awaiting host confirmation.
- Preserve the booking and payment snapshot.
- Navigate to a success/result page.

## Success page

Show:

- Payment confirmation for the simulated deposit.
- Booking code.
- Deposit amount.
- Booking status: "Chờ xác nhận".
- Link to Booking Detail.

Never imply the owner has already approved the booking.

---

# 18. My Bookings

Routes:

- `/my-bookings`
- `/my-bookings/[code]`

Customer-only access.

Customers may view only their own orders.

## List layout

Use horizontal booking cards on desktop.

Each card displays:

- Room image.
- Booking code.
- Room name.
- Rental dates.
- Total amount.
- Booking status.
- Separate payment status.
- Applicable primary action.

## Tabs

Support status-based tabs with clear labels.

Use search by:

- Booking code.
- Room or studio name.

Support date-range filtering by rental date.

Use numbered pagination:

- 10 bookings per page.
- `?page=` URL state.

Preserve filters when navigating to a detail page and returning.

## Customer action matrix

### Awaiting deposit

List action: Retry payment.

Detail actions: Retry payment and Cancel Booking.

### Pending confirmation

List action: View Details.

Detail action: Cancel Booking.

### Confirmed

List action: View Details.

Detail action: Cancel Booking only if still within the allowed period.

### Completed

View only.

### Rejected

View Details and Rebook.

### Cancelled

View Details and Rebook.

### Expired

Rebook.

Always allow the user to navigate to booking details even if the primary card action is Retry Payment or Rebook.

## Booking details

Display:

- Booking code and copy action.
- Room and studio.
- Rental period.
- Participant count.
- Equipment snapshot.
- Customer contact snapshot.
- Price breakdown.
- Deposit and remaining balance.
- Booking status.
- Payment status.
- Processing timeline.

Use only recorded timeline events.

Do not create speculative future events.

## Cancellation

Cancellation occurs only in Booking Detail.

Use a confirmation dialog with:

- Booking summary.
- Clear consequences.
- Policy information if available.
- Confirmation action.

The dialog must support focus trapping, Escape, and focus restoration.

Show results through an appropriate live region.

## Rebooking

Rebooking creates a new draft using previous preferences where reasonable.

Revalidate:

- Current room visibility.
- Current price.
- Current equipment.
- Current availability.

Never reuse an old price as a guaranteed current quote.

If a room is hidden or its owner is locked, disable rebooking and explain why.

## States

Support:

- Loading skeleton.
- No bookings.
- No bookings within a selected status.
- No matching filtered results.
- Loading error with retry.
- Booking not found.
- Booking expired while viewing.

## Mobile

Use compact cards with a small image on the left and concise information on the right.

---

# 19. Host Dashboard

All host routes require an approved, active host account.

Hosts may access only their own studios, rooms, equipment, rates, and bookings.

## Host layout

Use a minimal operational dashboard.

The sidebar:

- Opens expanded by default.
- Can be collapsed.
- Stores collapse preference.
- Uses clear icon labels and tooltips when collapsed.
- Marks the selected item with a subtle background and left indicator.
- Does not use orange background for active navigation.

Menu order:

1. Tổng quan.
2. Đơn thuê.
3. Lịch đặt.
4. Phòng.
5. Thiết bị.
6. Bảng giá.
7. Thống kê.

Put "Thông tin Studio" in a separate lower settings section.

Show the actual pending-confirmation count beside Booking management.

## Studio switcher

Place Studio Switcher near the top of the sidebar.

Allow "Tất cả Studio" only for:

- Overview.
- Bookings.
- Analytics.

Require one selected studio for:

- Rooms.
- Equipment.
- Pricing.
- Calendar.
- Studio settings.

Do not silently choose a studio when a specific one is required.

When opening a booking deep link, automatically select its owning studio.

If the host owns only one studio, show its name without an unnecessary dropdown.

If the host owns none, show an empty state with "Tạo Studio đầu tiên".

Use the settings/create flow to add additional studios.

## Host overview

Display four compact KPI values:

- Pending confirmation.
- Rental sessions today.
- Upcoming confirmed bookings.
- Current month's completed booking value.

For the last metric, calculate from completed booking snapshots using the rental start date in the selected period.

Label this metric as booking value, not confirmed cash collected.

Do not invent month-over-month percentages.

### Action queue

Show at most five items:

- Deposited bookings pending confirmation.
- Confirmed bookings past their end time awaiting manual completion.

Sort by relevant scheduled time.

Each row links to Booking Detail.

Do not confirm or reject directly from the overview.

### Calendar preview

For one selected studio, show a compact weekly preview.

For "All Studios", show a list of rental sessions in the next seven days instead of an overcrowded multi-room calendar.

---

# 20. Host Room Management

Route:

`/host/rooms`

Use a reusable DataTable.

Columns:

- Thumbnail.
- Room name and code.
- Status.
- Capacity.
- Area.
- Starting rental price and unit.
- Number of upcoming bookings.
- Actions.

The primary CTA is "Thêm phòng".

## Room form

Use separate create/edit pages.

Form sections:

1. General information.
2. Supported studio types.
3. Images.
4. Capacity and dimensions.
5. Amenities.
6. Visibility status.

Use shared administrator-controlled catalogs for studio types and amenities.

Do not allow arbitrary new catalog entries inside the room form.

New rooms start hidden.

## Publishing checklist

A room can become publicly bookable only when it has:

- Required valid information.
- At least one image.
- At least one active supported rental rate.
- A valid effective visibility state.
- No administrator-level visibility block.
- An approved, unlocked owner.

## Room statuses

Owner-controlled:

- Active.
- Paused.
- Hidden.

Administrator-hidden status is separate.

A paused room may remain visible but cannot receive new bookings.

A hidden room is not publicly discoverable.

## Slug

Generate a stable unique room slug at creation.

Changing the displayed room name must not automatically change the slug after publication.

## Images

Use permitted local image assets or compressed demo uploads.

Support:

- Selecting images.
- Preview.
- Reordering.
- Setting the cover image.
- Removing an image.
- Keyboard-accessible alternatives to drag-and-drop operations.

Use the first ordered image as the primary image.

Handle storage quota errors.

## Existing bookings

Changing room visibility does not automatically cancel existing bookings.

When affected bookings exist, show a warning with links to those bookings.

Rooms with booking history cannot be hard-deleted.

Provide an appropriate hide/archive behavior instead.

## Form safeguards

Include:

- Field validation.
- Error summary.
- Unsaved changes warning.
- Disabled Save while submitting.
- Accessible success/error messages.

---

# 21. Host Equipment Management

Route:

`/host/equipment`

Use a shared DataTable with category filters.

Columns:

- Image.
- Name.
- Equipment/Furniture type.
- Total quantity.
- Unit price.
- Pricing unit.
- Status.

Do not show a globally fixed "remaining quantity" because equipment availability depends on the requested dates.

Use a dialog for create/edit.

Pricing units are restricted to supported values:

- Hour.
- Session.
- Day.

Support statuses:

- Available.
- Maintenance.
- Hidden/archived where needed for historical retention.

Before decreasing quantity or placing an item into maintenance, check whether currently active bookings require that resource.

Block changes that would make existing reservations impossible.

Show affected bookings.

Do not automatically implement partial maintenance of inventory because the current data model does not support it.

Equipment used in past bookings should not be hard-deleted.

Existing booking snapshots remain unchanged.

---

# 22. Host Pricing Management

Route:

`/host/pricing`

**This is the only place where host rental rates may be edited.**

The room edit page may display a read-only price summary and a link to this page.

Do not create two independent rate editors.

Allow the host to select a room and manage rates.

Each rate includes:

- Rate name.
- Rental unit.
- Price.
- Effective start.
- Effective end.
- Minimum units.
- Maximum units.
- Active/inactive status.

Validate all values.

Prevent overlapping active periods for the same rate unit within the same room.

Explain conflicting rates clearly.

Rates already used in bookings may be deactivated but not deleted.

Historical bookings preserve their pricing snapshots.

Half-day, weekly, and monthly rates remain available as management/reference entries but are not selectable in the online booking wizard.

Use one shared helper for the displayed "starting price" across Marketplace and Host Dashboard.

---

# 23. Host Booking Calendar

Route:

`/host/calendar`

The primary desktop view is a weekly timeline.

## Weekly layout

- Rows represent rooms.
- Columns represent Monday through Sunday.
- Blocks represent rental periods.
- Multi-day bookings span relevant days.
- Time positioning is accurate.
- A 30-minute post-booking buffer appears as a striped neutral segment.

Differentiate statuses using color and visual pattern:

- Awaiting deposit: dashed border.
- Pending confirmation: outlined block.
- Confirmed: solid block.
- Completed: muted gray block.

Cancelled, rejected, and expired bookings do not occupy the current availability calendar.

Provide a legend.

## Interactions

Support:

- Previous week.
- Next week.
- Today.
- Select date.
- URL synchronization using `?week=`.
- Clicking a day heading to expand a day view.
- Clicking a booking block to open a popover.
- Link from popover to Booking Detail.

The booking popover includes:

- Booking code.
- Room.
- Customer.
- Rental time.
- Equipment summary.
- Status.
- View Booking action.

Calendar blocks require descriptive accessible labels.

Do not support drag-and-drop booking rescheduling.

## Mobile

Do not render the desktop timeline grid.

Use a seven-day horizontal date selector and an agenda grouped by room for the selected day.

---

# 24. Host Booking Management

Routes:

- `/host/bookings`
- `/host/bookings/[code]`

## List

Use a Booking DataTable.

Tabs:

- Pending Confirmation.
- Confirmed.
- Awaiting Deposit.
- History.
- All.

Default to Pending Confirmation.

The pending confirmation tab displays its actual count.

Use:

- 20 rows per page.
- URL-backed tab and pagination state.
- Search by booking code, customer, and room.
- Filter by room and rental date range.

Pending confirmations sort by the nearest rental start.

Other tabs default to newest creation date.

Support accessible column sorting indicators.

## Booking details

Reuse shared booking components:

- Status badge.
- Payment state.
- Price breakdown.
- Timeline.
- Booking snapshot summary.

Add host-specific details:

- Customer contact.
- Clickable phone number.
- Email.
- Notes.
- Participant count.
- Equipment preparation list.

Use a sticky action area on desktop.

Use a safe-area-aware action bar on mobile.

## Host action matrix

### Awaiting deposit

View only.

No confirmation or rejection.

### Pending confirmation, deposit successful

Allow:

- Confirm.
- Reject.

### Confirmed, before rental start

Allow cancellation with a mandatory reason.

### Confirmed, after rental end

Allow manual completion.

### Confirmed, during rental period

View only.

### Completed, rejected, cancelled, expired

View only.

## Rejection

Require a reason selected from:

- Schedule unavailable.
- Room maintenance.
- Request unsuitable.
- Other.

If Other is selected, require a note.

The reason must appear in the customer's booking timeline.

## Cancellation

Owner cancellation before rental start requires a reason and confirmation.

Timeline should distinguish:

- Customer cancelled.
- Studio owner cancelled.
- Administrator cancelled.

Do not promise an automatic refund.

## Completion

Only allow manual completion after the rental end time.

Do not automatically complete a booking.

## Mutation safeguards

All important actions:

- Use a confirmation dialog.
- Recheck current order state.
- Prevent duplicate submission.
- Record actor and timestamp.
- Update customer views through shared data.
- Append relevant audit events.

---

# 25. Host Studio Settings

Route:

`/host/studio/settings`

Use this page for:

- Studio information.
- Address.
- Location.
- Contact phone.
- Description.
- Studio rental time increment.
- Studio session duration.
- Default deposit percentage.
- Rental rules.
- Cancellation policy configuration.
- General studio settings.

Room-specific operating schedules are configured at room level.

Support creation of the first studio and additional studios through the same family of forms.

Newly approved hosts may have a prefilled suggested studio name from their registration application, but creating the studio is a separate action.

If a studio or room is hidden by an administrator, display a clear informational banner with the reason.

The host cannot override administrator hiding.

---

# 26. Host Analytics

Route:

`/host/analytics`

Period filters:

- Last seven days.
- Last thirty days.
- Current month.
- Custom range.

Persist filters in URL parameters.

## Metrics

Display:

- Booking count.
- Completed booking value.
- Confirmed-but-not-completed booking value.
- Room utilization.

Include a count breakdown by status.

## Revenue definition

For the demo:

Completed booking value is the sum of saved totals for completed bookings whose rental start date falls in the selected period.

This is not the same as collected money.

Label it accurately.

## Utilization

Calculate:

Booked usage hours divided by available opening hours in the selected period.

Use confirmed and completed bookings.

Exclude cleaning buffer from the numerator.

Clip rental intervals to the selected reporting period and valid operating windows.

Handle missing or zero operating hours.

Display "Chưa đủ dữ liệu" rather than an invalid percentage.

## Charts

Use:

- One restrained revenue chart by day or week.
- One horizontal bar chart for utilization by room.

Provide a table alternative for each chart.

Do not show decorative zero-filled charts when no meaningful data exists.

---

# 27. Admin Dashboard

All admin routes require an active administrator account.

Admin uses a separate management shell, but it must share the same design system as Host Dashboard.

## Sidebar

Menu order:

1. Tổng quan.
2. Duyệt Chủ Studio.
3. Tài khoản.
4. Studio & Phòng.
5. Danh mục.
6. Đơn thuê.
7. Nhật ký hoạt động.

Do not use a host-style Studio Switcher.

Provide an accessible global search interface.

## Global search

Group results by:

- Accounts.
- Studios.
- Rooms.
- Bookings.

Show at most five matches per group.

Search relevant names, identifiers, and email addresses.

Support keyboard navigation and accessible result announcements.

---

# 28. Admin Overview

Display four compact KPIs:

- Pending host approvals.
- Bookings requiring administrator attention.
- Active studios.
- Total accounts.

Show role breakdown beneath total accounts.

## Bookings requiring attention

Include pending-confirmation and not-yet-completed confirmed bookings associated with:

- A locked host.
- An administrator-hidden studio.

Do not include unpaid bookings merely waiting for their automatic hold expiration.

Show two short queues:

- Pending host approvals.
- Bookings requiring attention.

Maximum five rows each.

Oldest waiting items should appear first where appropriate.

Actions occur on detail pages, not directly from the overview.

Do not add fabricated growth charts.

---

# 29. Admin Host Approval

Route:

`/admin/approvals`

Only host accounts require manual approval.

Customer accounts do not require approval.

A host application stores:

- Applicant identity.
- Email.
- Phone.
- Proposed studio name.
- Application description.
- Submission timestamp.
- Approval status.
- Rejection reason where applicable.
- Relevant review history.

Approval status is separate from the account lock flag.

## Pending accounts

Pending hosts can sign in but cannot enter Host Dashboard.

They see an Account Status page.

## Approval

Admin approval occurs in the account detail page.

After approval, the host gains access to the management area.

Do not automatically create a studio.

## Rejection

A rejection reason is mandatory.

The host sees that reason in Account Status.

They may update eligible application fields and resubmit.

Resubmission returns the application to pending.

No demo resubmission limit is imposed.

Record approval, rejection, and resubmission events appropriately.

Do not promise processing times.

---

# 30. Admin Account Management

Routes:

- `/admin/users`
- `/admin/users/[id]`

## DataTable

Display:

- Full name.
- Email.
- Role.
- Account status.
- Creation date.
- Booking count for customers or studio count for hosts.

Support search by:

- Name.
- Email.
- Phone.

Filter by role and status.

## Account details

Display:

- Profile.
- Role.
- Approval status.
- Lock status.
- Owned studios where relevant.
- Recent bookings.
- Relevant administrative events.

## Locking

Allow locking eligible active non-admin accounts.

Require a reason.

Show affected active bookings before confirmation.

Locking does not automatically cancel existing bookings.

Do not allow an administrator to lock themselves.

Do not implement changing account roles.

## Unlocking

Unlocking restores the previous approval state.

Do not automatically approve an account that was pending or rejected before being locked.

## Locked account behavior

The account retains its mock session but is restricted to Account Status and Logout.

Account Status displays the actual lock reason.

The user cannot create new bookings or access management functions.

---

# 31. Admin Studio and Room Oversight

Routes:

- `/admin/studios`
- `/admin/studios/[id]`

## List

Show:

- Studio name.
- Owner.
- Room count.
- Effective visibility.
- Administrator-hidden state.
- Relevant reason.

Support search and filtering.

## Detail

Display:

- Studio profile.
- Owner.
- Address.
- Contact.
- Operating-related configuration.
- Deposit policy.
- Rental rules.
- Rooms.
- Relevant bookings.

Content is read-only.

## Administrator visibility

Maintain independent administrator visibility flags for both studios and rooms.

A room is publicly bookable only when:

- The host is approved.
- The host is not locked.
- The studio is not hidden by Admin.
- The room is not hidden by Admin.
- The owner-controlled room status is Active.
- All publishing requirements are satisfied.

Implement one shared function:

`getEffectiveRoomStatus()`

Use it throughout the application.

## Admin actions

Admin may:

- Hide a studio.
- Unhide a studio.
- Hide a room.
- Unhide a room.

Admin may not modify normal studio descriptions, room pricing, equipment, or room content on behalf of the owner.

Require reasons for consequential hiding operations.

Display affected bookings.

Existing bookings remain accessible through snapshots.

New bookings are blocked for hidden resources.

Owner-side controls cannot override administrator hiding.

---

# 32. Admin Catalog Management

Route:

`/admin/categories`

Manage two shared catalogs:

- Studio types.
- Amenities.

Use a two-tab interface.

Support:

- Create.
- Edit.
- Hide.
- Unhide.
- Move up/down.

Use accessible dialogs for editing.

## Validation

Reject duplicate display names after case-insensitive and Vietnamese-diacritic-insensitive normalization.

Maintain stable IDs.

Maintain stable category slugs when display names change.

## Used categories

Categories currently used by rooms must not be hard-deleted.

Hidden categories remain attached to existing rooms but cannot be selected for new assignments.

## Studio type images

Studio-type categories may have a representative image.

Homepage category cards should show only categories that have an appropriate image and at least one publicly available room.

Room counts must be calculated from the shared data.

---

# 33. Admin Booking Oversight

Routes:

- `/admin/bookings`
- `/admin/bookings/[code]`

Use shared booking table, status components, timeline, and snapshot presentation.

Add:

- Studio.
- Studio owner.
- Administrator attention filter.

## Exceptional cancellation

Admin has only one permitted booking mutation:

**Exceptional cancellation.**

Admin must not:

- Confirm bookings for hosts.
- Reject bookings on hosts' behalf.
- Mark bookings completed.

Exceptional cancellation is allowed for:

- Pending host confirmation.
- Confirmed bookings before the rental start time.

Require:

- Mandatory reason.
- Confirmation dialog.
- Current-state revalidation.
- Duplicate-action protection.
- Actor identification.
- Timeline event.
- Audit event.

Display the action in a distinct destructive section, not as an orange primary CTA.

Customer and host timelines must explicitly show "Admin hủy đơn" with the reason.

Do not implement automatic refunds.

## Unresolved completion exception

If a confirmed booking has passed its end time but the host is locked, keep it in administrator monitoring.

Do not automatically complete it or allow Admin to complete it.

It becomes actionable by the host again when the account is unlocked.

---

# 34. Admin Audit Logs

Route:

`/admin/audit`

Audit events must be append-only through the user interface.

Use the shared event store.

The booking timeline is a booking-specific view of relevant events.

Admin Audit displays significant management actions.

Record meaningful events such as:

- Host approval.
- Host rejection.
- Host resubmission.
- Account lock.
- Account unlock.
- Admin hiding/unhiding studios or rooms.
- Host changes to room status.
- Booking confirmation.
- Booking rejection.
- Booking cancellation.
- Booking completion.
- Rental rate changes.
- Catalog changes.

Do not clutter the global audit with ordinary booking creation and every payment attempt; those remain in booking timelines/payment history unless they constitute an important administrative action.

## Audit table

Columns:

- Vietnam-local timestamp.
- Actor name and role.
- Action.
- Entity type.
- Entity identifier.
- Summary.

Expand rows to show:

- Relevant previous status.
- New status.
- Reason.
- Non-sensitive notes.

Support date, actor, action group, entity type, and ID filters.

Use 20 rows per page.

Synchronize filters and pagination with the URL.

Never store plaintext passwords, secrets, or sensitive payment credentials inside audit events.

---

# 35. Authentication Pages

Use a centered form layout with a maximum width around 400px.

Background is warm off-white.

Logo sits above the form and links home.

Labels remain visible above inputs.

Avoid decorative split-screen images.

## Login

Route:

`/login`

Fields:

- Email.
- Password.

Include:

- Show/hide password.
- Proper autocomplete.
- Validation.
- Error summary.
- Disabled button during submission.

Do not include:

- Social login.
- Remember me.
- Forgot password link.
- OTP.
- Generic welcome-back marketing copy.

## Demo account panel

Below the login form, display a clearly separated panel:

"Tài khoản demo"

Only show it when:

`NEXT_PUBLIC_DEMO_MODE=true`

Provide quick entry for the six demo personas.

Indicate role, account status, and sample email.

Allow convenient access without claiming secure authentication.

## Customer registration

Route:

`/register`

Fields:

- Name.
- Email.
- Phone.
- Password.

Email must be unique across all accounts and roles.

Password minimum length: eight characters.

No mandatory special-character rule.

No password confirmation field.

Successful registration creates a demo customer, signs them in, and navigates to a valid return URL or homepage.

## Host registration

Route:

`/register/host`

Use one form with two sections.

### Account

- Full name.
- Email.
- Phone.
- Password.

### Proposed studio

- Proposed studio name.
- Short studio description, maximum 500 characters.
- Live character count.

Successful registration creates a host application, starts a mock session, and navigates to Account Status.

Do not create a studio automatically.

Do not claim confirmation email was sent.

## Cross-links

Customer and host registration pages should link to each other.

The host introduction page and homepage host CTA should point toward host registration.

An already approved host visiting the host introduction flow should see an appropriate management link.

---

# 36. Account Status

Route:

`/account/status`

Use one reusable layout with state-dependent content.

## Pending approval

Display:

- Submitted information.
- Submission date.
- Pending status.
- No invented approval deadline.

When Admin approves the account in another tab, refresh the view through storage synchronization.

## Rejected

Display:

- Actual rejection reason.
- Current application details.
- Edit and resubmit action.

Reuse relevant registration form fields without allowing email/password modification.

Record resubmission history.

## Locked

Display:

- Lock status.
- Actual reason.
- Logout.

Do not redirect a locked account automatically to Login.

Account lock takes precedence over host approval status when determining the displayed state.

---

# 37. Account Profile

Route:

`/account`

Use one profile interface across customer, host, and admin roles.

Display:

- Avatar.
- Full name.
- Email.
- Phone.
- Role.
- Relevant account information.

Allow editing:

- Name.
- Phone.
- Avatar.

Email is read-only.

Do not implement password changes.

## Avatar

Allow JPG, PNG, or WebP.

Maximum input file size: 5MB.

Crop or normalize the avatar to a square and compress it to a small resolution such as 256px before browser storage.

Provide a remove-image action.

Fallback to initials when no image is available or an image fails.

## Host profile

Show read-only host application information:

- Proposed studio name.
- Application description.
- Approval date when available.

Provide a link to Studio management.

## Save behavior

- Disable Save when nothing changed.
- Validate fields.
- Provide error summary.
- Warn on unsaved changes.
- Show successful update feedback.
- Keep existing booking contact snapshots unchanged.

The Account Menu must include role-appropriate navigation and Logout.

---

# 38. Accessibility Requirements

Accessibility is not an optional final polish item.

Apply it while implementing each component.

## General

- Semantic landmarks.
- Correct heading hierarchy.
- Meaningful labels.
- Visible focus styles.
- Keyboard operation.
- Proper disabled states.
- Accessible error messages.
- Descriptive action labels.

## Dialogs and sheets

- Focus trap.
- Escape to close where appropriate.
- Restore focus after closing.
- Avoid focus loss when an item is removed.
- Prevent unintended background interaction.

## Forms

- Use labels, not placeholders alone.
- Connect errors using `aria-describedby`.
- Provide an error summary.
- Move focus appropriately after invalid submission.
- Use autocomplete and input modes.
- Announce relevant form submission results.

## Booking wizard

- Set `aria-current` on current step.
- Allow completed-step navigation.
- Disable inaccessible future steps.
- Move focus to the new step heading.
- Announce important availability errors.

## Status updates

Use live regions for:

- Cancellation results.
- Booking expiration.
- Profile save.
- Copy booking code.
- Payment result.
- Changes detected from another tab.

## Charts

Provide accessible data-table alternatives.

## Images

Every meaningful image needs an appropriate alt description.

Decorative images should not produce noisy redundant announcements.

## Testing

Run axe checks on representative routes.

Also perform manual keyboard and focus-path verification.

Automated axe checks alone do not establish full accessibility.

---

# 39. Loading, Empty, Error, and Edge States

Every major route must intentionally handle:

- Initial loading.
- No records.
- No records matching the current filter.
- Missing resource.
- Hidden or suspended resource.
- Invalid persisted data.
- Storage read failure.
- Storage quota failure.
- Stale booking.
- Expired hold.
- Permission denied.
- Incompatible account state.
- Failed mock payment.
- Failed simulated mutation.
- Cross-tab state changes.

Skeletons should resemble the final layout and avoid unnecessary visual movement.

Images must have fallbacks.

Error copy must be useful and specific to the action, without exposing irrelevant technical details to end users.

Use Retry only when retrying is meaningful.

Do not invent successful outcomes when an action fails.

---

# 40. Content and Data Integrity Rules

The application must not display fabricated:

- Reviews.
- Star ratings.
- Number of rentals.
- Number of active viewers.
- Number of remaining rental slots without computed data.
- Approval response times.
- Customer testimonials.
- Platform-wide adoption statistics.
- Revenue growth percentages.
- Promotions.
- Security guarantees.
- Email delivery claims.
- Refund confirmations.
- Successful backend responses.

The absence of real data should result in a clean and useful empty state.

Use accurate, specific Vietnamese product copy.

Avoid excessive exclamation marks and generic SaaS marketing language.

---

# 41. Internal Implementation Milestones

Although this is one master prompt, execute it internally in the following order.

Do not ask for a new prompt after each milestone.

Keep a checklist and continue to the next milestone after validating the current one.

## Milestone 1 — Foundation and Design System

- Inspect repository.
- Configure Next.js and TypeScript.
- Configure Tailwind CSS.
- Set up shadcn/ui.
- Load Be Vietnam Pro.
- Define design tokens.
- Implement common layouts.
- Implement foundational UI components.
- Establish Impeccable design context.
- Verify responsive foundations.

## Milestone 2 — Domain and Mock Data

- Define domain types.
- Define Zod schemas.
- Implement browser storage adapters.
- Implement versioning and migrations.
- Generate coherent seed data.
- Implement shared service interface.
- Implement price calculation.
- Implement availability.
- Implement status derivation.
- Implement effective room status.
- Implement event subscriptions.
- Write unit tests.

## Milestone 3 — Authentication and Account

- Login.
- Customer registration.
- Host registration.
- Demo account selection.
- Session handling.
- Route guards.
- Access resolver.
- Account Status.
- Profile.
- Host approval state integration.

## Milestone 4 — Marketplace

- Homepage.
- Search.
- Search filters.
- Search result cards.
- Pagination.
- Room Detail.
- Gallery and lightbox.
- Booking availability card.
- Metadata.
- Responsive layouts.

Use Impeccable critique and polish where supported.

## Milestone 5 — Booking and Payment

- Three-step wizard.
- Booking draft persistence.
- Equipment quantities.
- Pricing summary.
- Login restoration.
- Booking submission.
- Temporary holds.
- Payment simulation.
- Success/failure handling.
- Booking snapshot persistence.

## Milestone 6 — Customer My Bookings

- Booking list.
- Tabs.
- Search.
- Date filters.
- Pagination.
- Booking details.
- Timeline.
- Cancellation.
- Payment retry.
- Rebooking.
- Responsive cards.

## Milestone 7 — Host Dashboard

- Dashboard shell.
- Studio switcher.
- Host overview.
- Studio settings.
- Rooms.
- Equipment.
- Rental pricing.
- Calendar.
- Booking management.
- Analytics.
- Shared data synchronization.

## Milestone 8 — Admin Console

- Admin shell.
- Overview.
- Host approval.
- User management.
- Studio and room oversight.
- Catalog management.
- Booking monitoring.
- Exceptional cancellation.
- Audit history.
- Global search.

## Milestone 9 — Integration and Final Polish

- End-to-end tests.
- Accessibility tests.
- Responsive tests.
- Error-state audits.
- Impeccable critique.
- Impeccable technical audit.
- Impeccable polish.
- Simplification of redundant design.
- Regression tests.
- Documentation.
- Final build verification.

---

# 42. Automated Testing Requirements

Tests must verify actual behavior, not simply assert that a page renders.

## Unit tests

Implement tests for:

- Currency formatting.
- Vietnam-local time conversion.
- Rental unit calculation.
- Hourly fractional pricing.
- Session pricing.
- Day pricing.
- Equipment unit pricing.
- Deposit rounding.
- Price snapshots.
- Availability overlap.
- Cleaning buffer.
- Equipment concurrency.
- Expired holds.
- Booking lifecycle transitions.
- Account approval.
- Account locking.
- Effective room status.
- Route access resolution.
- Statistics.
- Storage migrations.

For price calculation, provide at least ten deterministic input/output scenarios with manually verifiable expected results.

For availability, test boundary conditions including:

- Identical intervals.
- Partial overlap.
- Full containment.
- Adjacent intervals.
- Cleaning buffer overlap.
- Expired unpaid bookings.
- Cancelled bookings.
- Multi-day bookings.
- Shared equipment conflicts.
- Requests exceeding equipment stock.

## Component tests

Test:

- Search filters.
- Room cards.
- Availability card.
- Equipment quantity selectors.
- Booking step navigation.
- Validation feedback.
- Cancellation dialog.
- Admin approval actions.
- Role-specific navigation.
- Responsive drawers where meaningful.
- Focus handling.

## End-to-end tests

Implement Playwright scenarios for:

1. Customer searches for a studio.
2. Customer views room details.
3. Customer selects a valid rental interval.
4. Customer adds equipment.
5. Customer logs in before confirmation.
6. Customer creates a booking.
7. Customer successfully pays a simulated deposit.
8. Host sees the newly created booking.
9. Host confirms it.
10. Customer sees the updated status.
11. Customer cancellation releases availability.
12. Payment failure and retry reuse the existing booking.
13. Conflicting booking is rejected.
14. Admin approves a pending host.
15. Approved host enters Host Dashboard.
16. Admin hides a studio.
17. Hidden studio disappears from public search.
18. Existing booking remains readable.
19. Admin performs an eligible exceptional cancellation.
20. Audit and timelines reflect the action.
21. A locked account is restricted to Account Status.
22. Data persists after refresh.
23. Shared data updates across two tabs.
24. Demo reset restores a coherent initial state.

Use isolated test fixtures and deterministic time.

Do not let E2E tests corrupt the developer's ordinary demo data.

## Accessibility testing

Run `@axe-core/playwright` on representative customer, host, and admin routes.

Test responsive layouts at:

- 360px.
- 390px.
- 768px.
- 1024px.
- 1440px.

Test keyboard navigation and focus restoration for dialogs, drawers, gallery lightboxes, and menus.

---

# 43. Visual Quality Assurance

After each major interface group is implemented, inspect the actual rendered application.

Do not review quality solely by reading source code.

Where browser tooling is available:

- Open pages at target widths.
- Capture screenshots.
- Compare related screens for consistency.
- Look for clipping and overflow.
- Check typography and Vietnamese diacritics.
- Verify image aspect ratios.
- Verify meaningful whitespace.
- Check sticky elements do not overlap.
- Inspect empty states.
- Inspect loaded and populated states.
- Inspect form errors.
- Check alignment and spacing.

Use Impeccable to identify and correct generic design patterns.

If Impeccable suggests changes conflicting with the StudioHub specification, preserve the explicit StudioHub requirements.

The result should look like one unified product.

## Specific design review questions

Before completing, answer these questions by inspecting the UI:

- Does the homepage immediately communicate the ability to find and rent a studio?
- Is search visually prioritized over generic marketing?
- Are studio photos presented with appropriate prominence?
- Can users understand the rental price and its unit?
- Can users understand whether their requested time is available?
- Does the Booking wizard feel focused rather than overwhelming?
- Are price changes understandable?
- Can customers distinguish booking confirmation from payment confirmation?
- Can hosts identify urgent tasks without scanning decorative metrics?
- Can administrators identify approval and exceptional-action queues quickly?
- Are mobile interactions genuinely usable rather than simply compressed desktop layouts?
- Does the design avoid recognizable AI-generated SaaS clichés?
- Is the user experience consistent across all roles?

Make necessary corrections before finishing.

---

# 44. Documentation

Create or update `README.md` with:

- Project overview.
- Frontend-only scope.
- Prerequisites.
- Installation instructions.
- Development command.
- Test commands.
- Build command.
- Demo mode configuration.
- Demo accounts.
- Demo credentials.
- Role descriptions.
- Main routes.
- How to reset demo data.
- How browser storage works.
- How to demonstrate customer-to-host booking flow.
- Known demo limitations.
- Clear distinction between mock authentication and real security.
- Clear distinction between mock payments and real payments.

Create or update a design document explaining:

- Color tokens.
- Typography.
- Spacing.
- Core components.
- Marketplace design principles.
- Dashboard design principles.
- Responsive rules.
- Impeccable review considerations.

Document business assumptions that remain subject to backend confirmation.

---

# 45. Business Rules Pending Backend Alignment

Do not present these as finalized production policies:

- Real payment authorization and settlement.
- Real refund eligibility or refund timing.
- Production hold expiration behavior.
- Production concurrency and locking.
- Production host approval requirements.
- Final database enum mappings.
- Final account security policies.
- Server-side role authorization.
- Booking completion exceptions.
- Official cancellation policies.
- Legal terms or privacy agreements.

The mock implementation may demonstrate agreed UI behavior with configurable assumptions, but it must not imply backend enforcement exists.

Preserve a clear separation between:

- Frontend display states.
- Demo domain states.
- Future backend data contracts.

---

# 46. Definition of Done

Do not declare the implementation complete unless all reasonably executable requirements below have been verified.

## Technical

- TypeScript typecheck passes.
- ESLint passes.
- Unit tests pass.
- Component tests pass.
- End-to-end tests pass for implemented flows.
- Next.js production build passes.
- No unexpected browser runtime errors.
- No unhandled promise rejections in main flows.
- No direct localStorage access outside the storage layer.
- No duplicated pricing calculations in components.
- No independently maintained role-specific booking stores.

## Functional

- All required routes exist.
- All required actions work.
- Demo login works.
- Account approval works.
- Customer booking works.
- Payment simulation works.
- Booking lifecycle works.
- Host management works.
- Admin oversight works.
- Shared data updates appropriately.
- Relevant errors and empty states work.
- Booking snapshots preserve historical prices.

## Design

- Warm Minimal theme is consistently applied.
- Be Vietnam Pro renders correctly.
- No generic AI-style gradient SaaS design.
- No unnecessary decorative components.
- Primary actions are clear.
- Mobile layouts work at 360px.
- Sticky controls do not cover content.
- Images have sensible fallbacks.
- No fake review or platform statistics.
- Vietnamese text is clear and concise.

## Accessibility

- Main flows work with keyboard navigation.
- Focus indicators are visible.
- Dialog focus handling works.
- Form errors are programmatically associated.
- Important state changes are announced.
- Reduced-motion settings are respected.
- Charts have readable alternatives.
- Relevant automated accessibility checks pass.

If any requirement cannot be completed because of an actual technical limitation, record it explicitly rather than misrepresenting its status.

---

# 47. Final Delivery Requirements

When implementation and verification are finished, provide a concise but complete report containing:

1. What was implemented.
2. Which routes were created.
3. Main technical architecture.
4. Shared mock service design.
5. Design system implementation.
6. How Impeccable was used.
7. Visual issues found and resolved.
8. Typecheck result.
9. Lint result.
10. Unit/component test results.
11. E2E test results.
12. Production build result.
13. Remaining limitations.
14. Instructions for running and demonstrating StudioHub.

Do not claim a command passed unless it actually ran successfully.

Do not claim Impeccable was used unless the installed skill or corresponding tooling was actually invoked.

If the environment supports screenshots or preview links, provide useful output references.

Do not create fake test reports.

---

# 48. Final Execution Directive

**Start implementation now.**

Inspect the repository first, establish the design context, create the internal implementation plan, and then build the complete StudioHub frontend.

Proceed sequentially through all milestones without requiring the user to provide another prompt.

Treat this specification as the product requirements document.

Respect the established UI decisions, business constraints, access rules, shared data requirements, and responsive behavior.

Prioritize:

1. Functional completeness.
2. Consistent business behavior.
3. Excellent visual design.
4. Accessibility.
5. Maintainable architecture.
6. Automated verification.

Use Impeccable as an active design-quality tool throughout development, not as a decorative reference.

Do not stop after the first successful build.

Continue until the full customer, host, and administrator experience is implemented, integrated, reviewed, and tested.

**The final application should feel like a coherent, carefully designed Vietnamese studio rental product—not an AI-generated dashboard template.**