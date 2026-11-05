# API list recheck - 2026-11-05

Static audit of the current local PHP source against the user-provided list. No HTTP requests, database writes, migrations or seeds were executed.

Result: **80/80 method-path pairs have registered routes and matching public controller handlers.** Combined GET/PATCH and GET/POST entries count as two operations. Of these, **44 operations** were previously marked missing in the supplied list.

Profile GET/PATCH also supports `date_of_birth` and `address` (not `contact_address`); see AuthService, UserRepository and migration 010.

Limitations and behavior:

- Email change: dev/test returns `development_code`; production uses PHP `mail()` and returns 503 if delivery fails. Mail configuration has not been verified.
- Refund actions support `confirm_succeeded` with `evidence_reference`, or `mark_failed` with `reason`. These record manual reconciliation; they do not transfer money through a payment provider.
- Admin roles returns host/customer roles with descriptions, without a detailed permissions matrix.
- Equipment/rate DELETE checks booking references; rate deletion additionally requires an inactive rate.
- Migrations 009-012 exist in source. Their application to the running database has not been verified. Route/handler presence does not prove runtime success, full business acceptance or frontend integration.
- Older API_REQUIREMENTS_RECHECK.md and REMAINING_MISSING_APIS.md describe an earlier snapshot and should not override this source audit.

## 1. Tài khoản và xác thực

| Method | Path | Previous status | Current source | Handler | Router line |
|---|---|---|---|---|---|
| POST | `/api/auth/register` | Đã có | Đã có | `AuthController::register` | 63 |
| POST | `/api/auth/login` | Đã có | Đã có | `AuthController::login` | 64 |
| POST | `/api/auth/logout` | Đã có | Đã có | `AuthController::logout` | 65 |
| GET | `/api/auth/profile` | Đã có | Đã có | `AuthController::profile` | 66 |
| PATCH | `/api/auth/profile` | Đã có | Đã có | `AuthController::updateProfile` | 67 |
| POST | `/api/auth/email-change-requests` | Chưa có | Đã có | `AccountController::requestEmailChange` | 70 |
| POST | `/api/auth/email-change-confirmations` | Chưa có | Đã có | `AccountController::confirmEmailChange` | 71 |
| POST | `/api/account/avatar` | Chưa có | Đã có | `AccountController::uploadAvatar` | 72 |
| GET | `/api/account/notification-preferences` | Chưa có | Đã có | `AccountController::notificationPreferences` | 73 |
| PATCH | `/api/account/notification-preferences` | Chưa có | Đã có | `AccountController::updateNotificationPreferences` | 74 |
| GET | `/api/account/identity-verification` | Chưa có | Đã có | `AccountController::identityVerification` | 75 |
| POST | `/api/account/identity-verification` | Chưa có | Đã có | `AccountController::submitIdentityVerification` | 76 |

## 2. Danh mục công khai

| Method | Path | Previous status | Current source | Handler | Router line |
|---|---|---|---|---|---|
| GET | `/api/rooms` | Đã có | Đã có | `RoomController::index` | 79 |
| GET | `/api/rooms/{id}` | Đã có | Đã có | `RoomController::show` | 80 |
| GET | `/api/rooms/{id}/calendar` | Đã có | Đã có | `RoomController::calendar` | 81 |
| GET | `/api/rooms/{id}/rates` | Đã có | Đã có | `RoomController::rates` | 82 |
| GET | `/api/equipments` | Đã có | Đã có | `EquipmentController::index` | 83 |
| GET | `/api/space-types` | Đã có | Đã có | `LookupController::spaceTypes` | 84 |
| GET | `/api/amenities` | Đã có | Đã có | `LookupController::amenities` | 85 |

## 3. Host — Studio, phòng, thiết bị và giá

| Method | Path | Previous status | Current source | Handler | Router line |
|---|---|---|---|---|---|
| GET | `/api/studios/mine` | Đã có | Đã có | `StudioController::mine` | 112 |
| POST | `/api/studios` | Đã có | Đã có | `StudioController::create` | 113 |
| PATCH | `/api/studios/{id}` | Đã có | Đã có | `StudioController::update` | 114 |
| POST | `/api/rooms` | Đã có | Đã có | `RoomController::create` | 142 |
| PATCH | `/api/rooms/{id}` | Đã có | Đã có | `RoomController::update` | 143 |
| POST | `/api/rooms/{id}/images` | Đã có | Đã có | `RoomController::uploadImage` | 151 |
| GET | `/api/equipment-categories` | Đã có | Đã có | `EquipmentCategoryController::index` | 138 |
| POST | `/api/equipment-categories` | Đã có | Đã có | `EquipmentCategoryController::create` | 139 |
| POST | `/api/equipments` | Đã có | Đã có | `EquipmentController::create` | 154 |
| PATCH | `/api/equipments/{id}` | Đã có | Đã có | `EquipmentController::update` | 155 |
| POST | `/api/rooms/{id}/rates` | Đã có | Đã có | `RoomController::createRate` | 146 |
| PATCH | `/api/rooms/{id}/rates/{rate_id}` | Đã có | Đã có | `RoomController::updateRate` | 147 |
| GET | `/api/host/rooms` | Chưa có | Đã có | `HostController::rooms` | 189 |
| GET | `/api/host/rooms/{id}` | Chưa có | Đã có | `HostController::room` | 190 |
| GET | `/api/host/equipments` | Chưa có | Đã có | `HostController::equipments` | 192 |
| GET | `/api/host/rooms/{id}/rates` | Chưa có | Đã có | `HostController::roomRates` | 191 |
| GET | `/api/host/calendar` | Chưa có | Đã có | `HostController::calendar` | 193 |
| GET | `/api/host/policies` | Chưa có | Đã có | `StudioPolicyController::index` | 116 |
| PATCH | `/api/host/policies` | Chưa có | Đã có | `StudioPolicyController::update` | 117 |
| POST | `/api/studios/{id}/cover` | Chưa có | Đã có | `StudioController::uploadCover` | 115 |
| POST | `/api/equipments/{id}/images` | Chưa có | Đã có | `EquipmentController::uploadImage` | 156 |
| GET | `/api/host/room-types` | Chưa có | Đã có | `HostRoomTypeController::index` | 118 |
| POST | `/api/host/room-types` | Chưa có | Đã có | `HostRoomTypeController::create` | 119 |
| PATCH | `/api/host/room-types/{id}` | Chưa có | Đã có | `HostRoomTypeController::update` | 120 |
| DELETE | `/api/equipments/{id}` | Chưa có | Đã có | `EquipmentController::delete` | 157 |
| DELETE | `/api/rooms/{id}/rates/{rate_id}` | Chưa có | Đã có | `RoomController::deleteRate` | 148 |

## 4. Đặt phòng và thanh toán

| Method | Path | Previous status | Current source | Handler | Router line |
|---|---|---|---|---|---|
| POST | `/api/bookings/check-availability` | Đã có | Đã có | `BookingController::checkAvailability` | 160 |
| POST | `/api/bookings` | Đã có | Đã có | `BookingController::create` | 161 |
| GET | `/api/bookings` | Đã có | Đã có | `BookingController::index` | 164 |
| GET | `/api/bookings/{id}` | Đã có | Đã có | `BookingController::show` | 165 |
| PATCH | `/api/bookings/{id}/status` | Đã có | Đã có | `BookingController::updateStatus` | 166 |
| POST | `/api/bookings/{id}/cancel` | Đã có | Đã có | `BookingController::cancel` | 167 |
| POST | `/api/bookings/{id}/payments` | Đã có | Đã có | `BookingController::pay` | 168 |

## 5. Đăng ký Host, hồ sơ pháp lý và hợp đồng

| Method | Path | Previous status | Current source | Handler | Router line |
|---|---|---|---|---|---|
| POST | `/api/host-applications` | Chưa có | Đã có | `HostApplicationController::submit` | 68 |
| GET | `/api/admin/host-applications` | Chưa có | Đã có | `HostApplicationController::index` | 173 |
| GET | `/api/admin/host-applications/{id}` | Chưa có | Đã có | `HostApplicationController::show` | 174 |
| PATCH | `/api/admin/host-applications/{id}/decision` | Chưa có | Đã có | `HostApplicationController::decide` | 175 |
| GET | `/api/host/legal-profile` | Chưa có | Đã có | `LegalContractController::legalProfile` | 121 |
| PATCH | `/api/host/legal-profile` | Chưa có | Đã có | `LegalContractController::updateLegalProfile` | 122 |
| GET | `/api/host/contracts` | Chưa có | Đã có | `LegalContractController::contracts` | 123 |
| GET | `/api/host/contracts/{id}` | Chưa có | Đã có | `LegalContractController::contract` | 124 |
| POST | `/api/host/contracts/{id}/document-access` | Chưa có | Đã có | `LegalContractController::grantDocumentAccess` | 125 |

## 6. Admin và báo cáo

| Method | Path | Previous status | Current source | Handler | Router line |
|---|---|---|---|---|---|
| GET | `/api/admin/users` | Đã có | Đã có | `AdminController::users` | 183 |
| PATCH | `/api/admin/users/{id}/status` | Đã có | Đã có | `AdminController::updateUserStatus` | 184 |
| PATCH | `/api/admin/users/{id}/role` | Đã có | Đã có | `AdminController::updateUserRole` | 185 |
| GET | `/api/admin/statistics` | Đã có | Đã có | `AdminController::statistics` | 186 |
| GET | `/api/host/statistics` | Đã có | Đã có | `HostController::statistics` | 188 |
| GET | `/api/admin/studios` | Chưa có | Đã có | `AdminController::studios` | 198 |
| GET | `/api/admin/rooms` | Chưa có | Đã có | `AdminController::rooms` | 199 |
| GET | `/api/admin/equipments` | Chưa có | Đã có | `AdminController::equipments` | 200 |
| PATCH | `/api/admin/studios/{id}` | Chưa có | Đã có | `AdminController::updateStudio` | 201 |
| PATCH | `/api/admin/rooms/{id}` | Chưa có | Đã có | `AdminController::updateRoom` | 202 |
| PATCH | `/api/admin/equipments/{id}` | Chưa có | Đã có | `AdminController::updateEquipment` | 203 |
| GET | `/api/admin/roles` | Chưa có | Đã có | `AdminController::roles` | 197 |
| GET | `/api/admin/refund-exceptions` | Chưa có | Đã có | `AdminController::refundExceptions` | 205 |
| GET | `/api/admin/refund-exceptions/{id}` | Chưa có | Đã có | `AdminController::refundException` | 206 |
| POST | `/api/admin/refund-exceptions/{id}/actions` | Chưa có | Đã có | `AdminController::refundExceptionAction` | 207 |
| GET | `/api/admin/audit-logs` | Chưa có | Đã có | `AdminController::auditLogs` | 204 |
| GET | `/api/admin/reports/series` | Chưa có | Đã có | `AdminController::reportSeries` | 208 |
| GET | `/api/host/reports/series` | Chưa có | Đã có | `HostController::reportSeries` | 194 |
| GET | `/api/host/overview` | Chưa có | Đã có | `HostController::overview` | 195 |

