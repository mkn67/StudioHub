# Frontend → existing PHP API

This reference records the contract consumed by the frontend. No endpoint, backend module or database migration was added. The complete pre-existing contract remains in `server/openapi.yaml`; executable routing is `server/public/index.php`.

## Transport

`NEXT_PUBLIC_API_URL` is the origin, for example `http://localhost:8000`, without `/api`. Requests append the paths below. Protected requests send `Authorization: Bearer <JWT>`. JSON uses `Content-Type: application/json`; room uploads use multipart with a browser-generated boundary. Reads use `cache: no-store`; transport times out after 20 seconds.

Success: `{status:"success", code:200, message:"...", data:T}` (creation generally 201). Errors: `{status:"error", code:400, message:"...", errors:[{field,code,message}]}`. Business error codes come from `errors`, while the envelope `code` may be numeric. The client retains field errors, reports network/invalid-JSON failures and expires the current API session on 401 or `account_locked`. A late failure from an old token cannot remove a newer session.

Common errors: 400 validation/invalid state, 401 unauthenticated/expired JWT, 403 role/ownership/locked account, 404 absent resource, 409 booking/equipment/payment conflict, 500 unavailable database/internal failure. Actual backend error handling, CORS, ownership and transaction behavior still require a live environment test.

## Accounts

| Method/path | Role | Body / parameters | `data` | Records |
|---|---|---|---|---|
| POST `/api/auth/register` | Public | `full_name,email,password,phone?` | `{token,user}` | users, roles |
| POST `/api/auth/login` | Public | `email,password` | `{token,user}` | users, roles |
| GET `/api/auth/profile` | Authenticated | — | user | users, roles |
| PATCH `/api/auth/profile` | Authenticated | `full_name,phone` in UI; backend also supports other documented profile fields | user | users |
| POST `/api/auth/logout` | Authenticated | — | null | Stateless JWT; local token cleared |

User fields consumed: `user_id,full_name,email,phone,role,status?`. Backend registration always assigns Customer. The frontend never offers an Admin registration payload. Logout does not revoke an issued JWT on the server; this existing limitation is unchanged.

## Discovery and booking

| Method/path | Role | Request | `data` | Records |
|---|---|---|---|---|
| GET `/api/rooms` | Public | `keyword,space_type_id,max_price,min_area,page,limit`; backend also supports min_price/rate_unit | `{items,pagination:{page,limit,total_items,total_pages}}` | rooms, studios, rates, images, amenities, space types |
| GET `/api/rooms/{id}` | Public | Physical room ID | room with `studio,images,rates,space_types,amenities` | same |
| GET `/api/rooms/{id}/rates` | Public | Physical room ID | rate array | room_rates |
| GET `/api/rooms/{id}/calendar` | Public | `from?,to?`, max 62 days | `{room_id,from,to,busy_slots:[{busy_start,busy_end}]}` | bookings |
| GET `/api/equipments` | Public | `studio_id`, optional category_id | equipment array, active only | equipments, categories |
| GET `/api/space-types`, `/api/amenities` | Public | — | catalog array | space_types, amenities |
| POST `/api/bookings/check-availability` | Public | Booking selection below | `{available,room,start_time,end_time,busy_start,busy_end,pricing}` | room/rates/bookings/equipment |
| POST `/api/bookings` | Customer | Selection + `customer_name,customer_email,customer_phone,note?` | created booking with `booking_id,booking_code` | bookings, booking_details, audit_logs |
| GET `/api/bookings` | Authenticated | `page,limit,status?` | `{items,page,total_pages,total_items}` | bookings, rooms, studios |
| GET `/api/bookings/{id}` | Authorized owner/Host/Admin | — | booking with `equipments,payments` | bookings, booking_details, payments |
| POST `/api/bookings/{id}/cancel` | Owning Customer | — | updated booking | bookings, audit_logs |
| PATCH `/api/bookings/{id}/status` | Owning Host | `{status}` | updated booking | bookings, audit_logs |
| POST `/api/bookings/{id}/payments` | Owning Customer | `{payment_type:"deposit"|"remaining"|"full",payment_method:"sandbox_qr"}` | simulated payment | payments, bookings |

Selection is `{room_id,rate_id,start_time,end_time,party_size,equipments:[{equipment_id,quantity}]}`. All IDs originate in API responses. The browser sends no authoritative price. Quote fields consumed: `room_amount,equipment_amount,total_amount,deposit_amount`. Any selection change invalidates the displayed quote before submission; the backend checks again when creating the reservation. Units use the actual rate's `unit_minutes`, minimum and maximum.

Dates sent as Vietnam-local `YYYY-MM-DD HH:mm:ss`; display parses SQL timestamps as `+07:00` and uses `Asia/Ho_Chi_Minh`. VND values come from the server. The UI accepts only whole VND for new prices.

Actual server lifecycle: `pending → confirmed/rejected/cancelled/expired`, `confirmed → checked_in/cancelled`, `checked_in → completed`. Deposit remains pending until Host action. Backend completion currently requires full payment, unlike the requested debt-on-checkout workflow. Holds/deadlines are server values, not browser-generated business deadlines. Payment is sandbox only; refunds are `recorded_only` audit amounts. No real refund, payment-provider verification or retry/reconciliation API is claimed.

## Host and Admin

| Method/path | Role | Body / query | Records |
|---|---|---|---|
| GET `/api/studios/mine` | Host | — → studio array | studios, counts of rooms/equipment |
| POST `/api/studios` | Host | `name,address,district,city,phone` | studios |
| PATCH `/api/studios/{id}` | Owning Host | same editable fields, `status:active/inactive` | studios |
| POST `/api/rooms` | Owning Host | `studio_id,name,area,capacity,space_type_ids` | rooms, room_space_types |
| PATCH `/api/rooms/{id}` | Owning Host | `name,area,capacity,status` in UI | rooms |
| POST `/api/rooms/{id}/images` | Owning Host | multipart `image`, `is_primary?`; JPG/PNG/WebP ≤5 MB | room_images + filesystem |
| POST `/api/rooms/{id}/rates` | Owning Host | `rate_unit,unit_price,minimum_units,effective_from`; session requires `unit_minutes` | room_rates |
| PATCH `/api/rooms/{id}/rates/{rate_id}` | Owning Host | `unit_price,minimum_units,status` in UI | room_rates |
| GET `/api/equipment-categories` | Owning Host | `studio_id` → category array | equipment_categories |
| POST `/api/equipment-categories` | Owning Host | `studio_id,name` | equipment_categories |
| POST `/api/equipments` | Owning Host | `studio_id,category_id,name,unit_price,pricing_unit,total_quantity` | equipments |
| PATCH `/api/equipments/{id}` | Owning Host | editable equipment fields; cannot change studio | equipments |
| GET `/api/host/statistics` | Host | `from,to`; half-open period, ≤366 days | bookings, studios, rooms |
| GET `/api/admin/statistics` | Admin | same | above + users |
| GET `/api/admin/users` | Admin | `page,limit,search,role` → paginated items | users, roles |
| PATCH `/api/admin/users/{id}/status` | Admin | `{status:"active"|"locked"}` | users, audit_logs |
| PATCH `/api/admin/users/{id}/role` | Admin | `{role:"host"|"customer"}` | users, audit_logs |

Reports display server `total_bookings,total_revenue,occupancy_rate,total_studios,total_rooms,total_customers?`. Revenue is completed bookings grouped by `completed_at`. No invented deposit/refund/outstanding/popularity KPIs are displayed.

Known API gaps: private Host room/equipment listing (public listings omit inactive/maintenance records), Room Type management, advanced amenity/package/bundle administration, rescheduling, strike restoration, collections, overtime/no-show, actual refund processing, Host applications, Admin resource moderation/audit browsing. Existing database schema has 16 tables with decimal money, foreign keys and booking checks; it does not match the entire domain in the attachment. These are backend dependencies and remain unchanged.
