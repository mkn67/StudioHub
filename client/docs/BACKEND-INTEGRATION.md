# Backend Integration Status

The API is configured with `NEXT_PUBLIC_API_URL`. Docker Compose supplies
`http://localhost:8000`; local frontend development can set the same variable
in `.env.local`. Requests use the PHP API response envelope (`ApiResponse`) and
attach the session JWT as a bearer token (`Authorization: Bearer <token>`).

## Connected

### Authentication & Profiles (Phase 1 & 2)
- Customer & Host login calls `POST /api/auth/login` and stores the returned JWT
  in the tab's session storage. Host and customer roles are both authenticated.
- Customer registration calls `POST /api/auth/register` with `full_name`.
- Profile refresh and updates call `GET /api/auth/profile` and `PATCH /api/auth/profile`.
- Logout calls `POST /api/auth/logout` and clears the local tab session.

Seed accounts for development:
- Customer: `customer@studio.local` / `password123`
- Host 1: `host1@studio.local` / `password123` (Studio: "Skyline Sound Studio")
- Host 2: `host2@studio.local` / `password123` (Studio: "Vintage Visuals & Acoustics")

### Marketplace & Catalog (Phase 3 & 4)
- Homepage, room catalog, and filters call `GET /api/rooms` with optional query params (`studio_id`, `category`, `search`).
- Room detail calls `GET /api/rooms/{id}`, fetching room images, amenities, pricing rates, and studio owner metadata from MySQL.
- Public calendar busy slots call `GET /api/rooms/{id}/calendar`.

### Host Management (Phase 5)
- Studio operations:
  - `GET /api/studios/mine`: lists host-owned studios with room and equipment counts.
  - `POST /api/studios`: creates new host studio profile.
  - `PATCH /api/studios/{id}`: updates studio name, address, phone, policy, and operating hours.
- Room operations:
  - `GET /api/rooms?studio_id={id}`: retrieves host studio room listings.
  - `POST /api/rooms`: creates a new room with capacity, dimensions, and soundproofing level.
  - `PATCH /api/rooms/{id}`: updates room specs and description.
  - `POST /api/rooms/{id}/rates`: adds rental rates (`hourly`, `half_day`, `full_day`) and pricing.
  - `POST /api/rooms/{id}/images`: uploads room photos using `multipart/form-data` with primary flag.
- Equipment inventory:
  - `GET /api/equipment-categories` & `POST /api/equipment-categories`: reads and creates equipment categories.
  - `GET /api/equipments?studio_id={id}`: retrieves studio equipment inventory.
  - `POST /api/equipments`: adds equipment with category, serial number, rental price, and condition.
  - `PATCH /api/equipments/{id}`: updates equipment details and operational status.

### Booking Engine (Phase 6)
- Room booking wizard (`/rooms/[id]/book` and `/booking/[id]`):
  - **Step 1 (Schedule & Rate):** Select rate tier (`hourly`, `half_day`, `full_day`), booking date, start hour, and units. Checks real-time availability via `POST /api/bookings/check-availability` (with 30-minute cleaning buffer detection). Previews busy time slots via `GET /api/rooms/{id}/calendar`.
  - **Step 2 (Equipment Add-ons):** Fetches studio equipment via `GET /api/equipments?studio_id={id}`, validates available inventory stocks, and recalculates order subtotal.
  - **Step 3 (Confirmation & Deposit):** Customer details form with auth guard, calculates 30% required deposit, and submits booking order via `POST /api/bookings`.
  - **Step 4 (Success & Escrow Instructions):** Generates booking code (`BK-YYYYMMDD-NNNN`), displays `pending` status, 15-minute deposit countdown timer, and mock escrow payment instructions.

## Remaining In Demo / Offline Mode

The following areas do not yet have corresponding PHP API endpoints in `server/public/index.php` and remain backed by the browser client demo database:
1. **Customer Booking History (`/my-bookings`):**
   - The backend creates bookings, but there is no `GET /api/bookings/mine` or customer cancellation endpoint.
2. **Host Booking Operations (`/host/bookings`):**
   - No `PATCH /api/bookings/{id}/status` endpoint for host approval/rejection or check-in check-out logs.
3. **Simulated Payment Gateway (`/checkout`, `/payment`):**
   - Simulated payment transactions and gateway webhook callbacks.
4. **Platform Administration (`/admin/*`):**
   - Admin audit logs, role permissions, and host application approval workflows.

## Data & Contract Harmonization

- **Identifiers:** Backend routes use numeric IDs (`1`, `2`), while frontend demo mode uses string slugs (`studio-aurora`, `room-echo`). The frontend routes dynamically handle both.
- **Rental Units:** Frontend demo uses `half-day`, mapped cleanly to the backend database enum `half_day`.
- **Deposit Policy:** Backend default is 30% required deposit, calculated automatically during step 3 of the booking wizard.
- **Image Uploads:** Uploads route through `POST /api/rooms/{id}/images` storing files in `/uploads/` and returning absolute/relative URLs.

- **Identifiers:** Backend routes use numeric IDs (`1`, `2`), while frontend demo mode uses string slugs (`studio-aurora`, `room-echo`). The frontend routes dynamically handle both.
- **Rental Units:** Frontend demo uses `half-day`, mapped cleanly to the backend database enum `half_day`.
- **Deposit Policy:** Backend default is 30% required deposit, calculated automatically during step 3 of the booking wizard.
- **Image Uploads:** Uploads route through `POST /api/rooms/{id}/images` storing files in `/uploads/` and returning absolute/relative URLs.

