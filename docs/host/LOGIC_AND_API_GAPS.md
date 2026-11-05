<!-- rest-integration-2026-11-05 -->
> **Cập nhật 05/11/2026:** Đây là bản lịch sử. Các nhãn “Chưa có API” / “chưa hỗ trợ” bên dưới không còn đại diện source hiện tại. 80/80 method/path đã có route/handler; frontend REST đã được nối lại. Xem [ma trận tích hợp hiện tại](../api/FINAL_INTEGRATION_MATRIX.md). Kiểm thử mock khác với nghiệm thu PHP/MySQL; runtime và persistence chưa được xác nhận. Nội dung cũ được giữ lại để tra cứu.

# Host Workspace: logic and API review queue

This is an evidence log for a later business/API review. The UI redesign does not change PHP, schemas, authentication, ownership checks, booking transitions, pricing, inventory or payment calculations. Findings below describe current limits, not authorization to change those rules.

## 1. Host room inventory and pagination

| Field | Finding |
|---|---|
| Page | Rooms, pricing, calendar |
| Feature | Complete owned room inventory |
| Current behavior | Existing integration fetches `/api/rooms?page=…&limit=50`, then keeps rooms belonging to the selected owned Studio. |
| Issue | This is a paginated public catalog, not an owner-management list. Active rooms in active Studios are visible; hidden and maintenance rooms are missing. Pagination totals are global catalog totals. |
| UI data requirement | Owner-scoped inventory including operational statuses, pagination/counts scoped to Studio and reliable detail reads for non-public rooms. |
| Evidence | `server/src/Modules/Rooms/RoomRepository.php::searchRooms`, `findActiveRoomById`; previous `HostRooms` implementation. Live seed: Artemis has 3 non-inactive rooms in `/api/studios/mine`, but 2 public room entries. |
| Impact | Public page can be empty for a selected Studio while other catalog pages have its rooms. A room changed to inactive/maintenance disappears and cannot be reopened through current public reads. |
| Required decision | Which owner-only statuses and inventory scopes should a management endpoint expose? |
| Suggested next step | Design an owner-scoped room list/detail contract and migration plan separately. Current UI explicitly labels public scope and catalog page, preserving existing request behavior. |

## 2. Space classification is not a Room Type management model

| Field | Finding |
|---|---|
| Page | Rooms |
| Feature | Room Types versus physical units |
| Current behavior | Public rooms expose `primary_space_type`; creation submits `space_type_ids`. The old demo model had separate `types` and `rooms`. |
| Issue | No Room Type CRUD or parent/type-level pricing contract is registered in the PHP API. A public space category must not be silently treated as a managed room template. |
| UI data requirement | Explicit identity, ownership, physical-unit relationship, descriptions and supported type-level actions. |
| Evidence | `server/public/index.php` management routes; `RoomRepository` joins `room_space_types`; `client/src/components/operations.tsx` demo `RoomManagement`. |
| Impact | The redesigned screen groups actual physical rooms by their supplied classification and calls it “phân loại không gian”; it does not invent “Add Room Type”. |
| Required decision | Are space types global categories, Host-owned types, or two distinct concepts? |
| Suggested next step | Agree the model and ownership semantics before implementing type-management workflows. |

## 3. Equipment reads and media are incomplete for management

| Field | Finding |
|---|---|
| Page | Equipment |
| Feature | Inventory, inactive records and thumbnails |
| Current behavior | `/api/equipments?studio_id=…` returns active equipment with `total_quantity`, `image_url`, category, brand and unit price. POST/PATCH and category POST are available. |
| Issue | No owner list of inactive equipment or date-scoped available quantity is exposed. No equipment-image upload route is registered. An active status or total quantity is not real-time availability. |
| UI data requirement | Owner-scoped list, status restoration and supported media lifecycle; availability would require an explicit time interval and authoritative result. |
| Evidence | `server/src/Modules/Equipment/EquipmentRepository.php::getActiveEquipmentsByStudio`; `server/public/index.php`. Seed equipment has null `image_url`. |
| Impact | Hiding equipment removes it from this read list. UI shows total quantity and actual status, not invented available/reserved stock. Category icons fill missing image slots; no upload button is offered. |
| Required decision | Which inactive/maintenance statuses, restoration actions and media operations should management support? |
| Suggested next step | Add a deliberate owner inventory/media contract later; leave booking inventory calculations unchanged. |

## 4. Pricing reads only currently active/effective records

| Field | Finding |
|---|---|
| Page | Pricing |
| Feature | Rate lifecycle, scope and promotions |
| Current behavior | `/api/rooms/{id}/rates` supplies active effective physical-room rates. Existing POST/PATCH forms retain their current field sets. |
| Issue | Current reads cannot provide a full history, inactive rates or future-effective schedules. No connected API contract exposes demo featured-plan/promotion metadata, Room Type defaults, or overrides. |
| UI data requirement | Authoritative rate lifecycle and scope metadata; explicit supported update fields. |
| Evidence | `RoomService::getRoomRates`, `RoomRepository::getActiveRatesByRoomId`, mutation routes in `server/public/index.php`; prior `RoomRates` form. |
| Impact | UI preserves returned records, durations and prices, displays physical-room scope and readonly min/max unit limits. It does not invent promotions, discounts, type-level defaults or new edit permissions. |
| Required decision | Which rate fields are mutable, how scheduled rates should be managed, and whether featured plans belong in the connected contract. |
| Suggested next step | Review pricing contract separately. No pricing formula or stored value was changed. |

## 5. Calendar has occupied intervals only

| Field | Finding |
|---|---|
| Page | Calendar |
| Feature | Scheduling blocks, booking details, setup/cleaning display |
| Current behavior | `/api/rooms/{id}/calendar` returns `busy_start`/`busy_end`; the interval includes cleaning. Date `to` is inclusive through end of day. Maximum range is 62 days. |
| Issue | No booking ID, customer, booking status or separate cleaning start/end is available. Public room availability checks also prevent reading non-active rooms. |
| UI data requirement | Owner calendar contract with explicit booking references, interval kinds and authoritative boundaries. |
| Evidence | `server/src/Modules/Rooms/RoomService.php::getRoomCalendar`; `CalendarData` in `client/src/services/api/contracts.ts`. |
| Impact | Timetable renders accurate occupied intervals, including cross-midnight clips and exact-time details. It cannot truthfully color by booking status, open booking details or split a striped cleaning segment. |
| Required decision | Which operational information may the Host calendar expose, and how should separate interval types be represented? |
| Suggested next step | Specify owner scheduling data without changing availability or cleaning calculations in this UI task. |

## 6. Overview totals and today's activity have different scopes

| Field | Finding |
|---|---|
| Page | Overview |
| Feature | Action center and today's operations |
| Current behavior | Role-scoped booking list supports status, pagination and limit up to 50. It orders by creation time. Pending includes waiting for payment and waiting for Host confirmation. |
| Issue | No operational-summary/today endpoint or supported date filter is present. Filtering the latest 50 cannot produce an authoritative all-day booking total. |
| UI data requirement | Server-supported daily schedule and operational totals, with an explicit distinction between unpaid holds and actionable paid requests. |
| Evidence | `BookingService::listBookings`, `BookingRepository::listBookings`; pending confirmation payment check in `BookingService::updateStatus`. |
| Impact | Status KPIs use API `total_items` rather than page lengths. Today’s list is visibly scoped to the latest 50 records and does not claim a complete daily count. Pending previews link to existing detail/actions. No outstanding-collection KPI is invented. |
| Required decision | Which items are actionable now, and which dates/statuses define each operational KPI? |
| Suggested next step | Define an operational summary contract in a later phase. |

## 7. Reports are aggregate, not a time series or cash ledger

| Field | Finding |
|---|---|
| Page | Reports |
| Feature | Revenue, utilization and trends |
| Current behavior | `/api/host/statistics` returns aggregate bookings, completed-order revenue, occupancy, active Studio/room counts and period. Statistics use `[from 00:00, to 00:00)` in Vietnam time. |
| Issue | No daily series, room popularity, deposits, collections, refunds or cash-balance metrics are returned. Active-resource counts describe now, not historical inventory. Occupancy uses the backend operating-hours denominator. |
| UI data requirement | Defined metric periods/scopes and authoritative series or financial-ledger data. |
| Evidence | `server/src/Modules/Admin/StatsService.php::resolvePeriod`, `getHostStatistics`, `computeOccupancyRate`. Bookings use start time excluding expired; revenue uses completion time for completed bookings. |
| Impact | UI shows actual zero separately from unavailable data, labels the current active counts, and uses backend occupancy directly. It renders an honest unavailable trend panel, not a fabricated chart. Report presets preserve exclusive end boundaries. |
| Required decision | Decide cash versus recognized revenue, denominators, historical inventory and desired series granularity. |
| Suggested next step | Review these definitions and extend reporting deliberately; do not infer a trend from one aggregate. |

## 8. Existing booking actions rely on server-side constraints

| Field | Finding |
|---|---|
| Page | Booking list/detail |
| Feature | Confirmation, rejection, check-in, completion, cancellation |
| Current behavior | Existing `BackendBookingDetail` chooses available action buttons from status; PATCH sends `{ status }`. Confirmation requires a successful deposit/full payment on the server; completion requires full payment. Rejection/cancellation confirmation uses the existing browser prompt. |
| Issue | The existing UI can offer an action that the server later rejects; `pending` alone does not mean it can be confirmed. There is no rejection-reason input or richer action/permission metadata in the current UI contract. |
| UI data requirement | Explicit supported action conditions and reason/audit requirements, if the business chooses them. |
| Evidence | `client/src/features/booking/backend-booking.tsx::BackendBookingDetail`; `BookingService::updateStatus` and `BookingStateMachine`. |
| Impact | Redesign reuses this component and preserves its action semantics/confirmations. Server errors remain authoritative. No new transition, payment shortcut or reason requirement is introduced. |
| Required decision | Review payment prerequisites, timing rules and reason requirements with the product owner. |
| Suggested next step | Reconcile action metadata and workflows separately, retaining backend authorization. |

## 9. Policy management is not exposed by the connected API

| Field | Finding |
|---|---|
| Page | Policies (`/host/settings`) |
| Feature | Host configuration of booking/deposit/cancellation/rescheduling/hours |
| Current behavior | Previous connected screen already reported unsupported advanced settings. No Host policy GET/PATCH route is registered. Demo policy editors operate on the separate local demo store. |
| Issue | There is no authoritative readable/editable policy contract to present as a live form. |
| UI data requirement | Current values, editable fields, validation, ownership and effective-date behavior. |
| Evidence | `server/public/index.php`; legacy `PolicySettings` in `client/src/components/operations.tsx`. |
| Impact | The redesigned page is a deliberate unavailable state. It does not show Save or substitute demo policy values. Existing backend rules continue to apply. |
| Required decision | Which policies are Host-owned versus platform-owned, and when changes take effect. |
| Suggested next step | Agree policy semantics and API in the next business-review task. |

## 10. Studio media and counts need consistent interpretation

| Field | Finding |
|---|---|
| Page | Studios, overview, reports |
| Feature | Cover images and resource summaries |
| Current behavior | `/api/studios/mine` returns owned Studios plus counts of non-inactive rooms/equipment; it does not expose a Studio-cover upload contract. Statistics separately count active rooms in active Studios. |
| Issue | These counts have deliberately different scopes. Reusing one as the other would mislead. Missing cover media must not be presented as uploaded. |
| UI data requirement | Named count scopes and explicit Studio media read/upload support if desired. |
| Evidence | `StudioRepository::findByHostId`; `StatsService::getHostStatistics`. Seed observed counts are 3 non-inactive Artemis rooms versus 2 active public rooms. |
| Impact | Studio list labels counts “chưa ẩn”; reports label “hoạt động”. Missing covers use a building icon. No media-save capability is fabricated. |
| Required decision | Confirm resource-count labels and desired Studio cover lifecycle. |
| Suggested next step | Document shared definitions and add supported media endpoints only in a separate scope. |
