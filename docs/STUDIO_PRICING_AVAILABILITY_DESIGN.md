# StudioHub — Gói thuê, vận hành Studio và khả dụng minh họa

Ngày triển khai: 27/10/2026. Phạm vi: Next.js frontend hiện có. Tất cả giá, lịch, inventory, xác thực persona và thanh toán trong tài liệu này thuộc **môi trường mock dùng chung trong trình duyệt**, không phải dữ liệu PHP đã xác minh. Không thay PHP business, Helpdesk, RAG, database nghiệp vụ hoặc state machine thanh toán/booking.

## 1. Kết quả khảo sát và phần tái sử dụng

| Khả năng | File hiện có | Trước thay đổi | Phần triển khai |
| --- | --- | --- | --- |
| Routing Room Detail/Host | `client/src/components/application.tsx`, `marketplace.tsx`, `operations.tsx` | Catch-all app chọn page theo pathname | Giữ route, gallery/lightbox, sticky booking; mở rộng đúng trang hiện có |
| Phân cấp Studio/Type/Unit | `client/src/domain/models.ts` | Exact roomId, rateOverride | Giữ hierarchy; gói kế thừa Type và override Unit |
| Editorial detail/pricing | `client/src/features/pricing/` | Danh sách giá có separator, featured theo phòng | Giữ layout; hạ heading, thêm nội dung bundle/media/conditions |
| Host rates/featured | `operations.tsx`, `featured-pricing.ts` | Chọn tập năm plan, giá giờ × số giờ, một featured/Unit | Thêm trình chỉnh package, không tạo kho dữ liệu mới |
| Equipment inventory | `engine.ts`, Host EquipmentManagement | Kho Studio, lượng giữ theo interval và buffer | Tính cả bundled demand, metadata description/ảnh local |
| Operating hours | `Studio.policy.openHour/closeHour` | Cùng ngày, giờ nguyên | Fallback giá trị cũ; cấu hình mới fixed hoặc all_day, qua đêm |
| Price/availability | `engine.ts::price/validateSelection` | Giá tuyến tính, validator Room Unit/stock/lead/buffer | Delegate tới `domain/rental.ts` dùng chung UI và commit |
| Booking modal | `components/wizard.tsx` | Ba bước, native date và select giờ | Giữ ba bước/modal/motion/auth/payment handoff; thêm calendar/slots |
| State/persistence | `components/store.tsx`, `data/repository.ts` | Context + execute + localStorage `studiohub.demo.v1` | Tiếp tục dùng; fields mới optional, không có mock store song song |
| Lifecycle | `engine.ts::execute/tick` | Hold, grace, payment, Host approval, refund, reschedule | Không đổi các chuyển trạng thái hoặc quyền |
| Motion/font/tokens | `components/motion/`, `DESIGN.md`, app CSS | GSAP scoped, Bricolage + DM/IBM Mono, cool tokens | Tái sử dụng motion hiện có; CSS Module cho giao diện mới |

Không thêm framework, thư viện ngày, font hoặc dependency. Đọc hướng dẫn Next.js cục bộ cho Client Components trước khi triển khai. Các component tương tác mới chạy phía client và không dựng API upload giả.

## 2. Hợp đồng dữ liệu frontend

`models.ts` thêm các kiểu optional, giữ `State.version=1` và dữ liệu cũ:

- `Studio.operatingHours`: `{mode:'fixed',opens:'HH:mm',closes:'HH:mm'}` hoặc `{mode:'all_day'}`. Chính xác hai mode; thiếu cấu hình mới thì dùng giờ cũ đã có, không suy ra 24/24.
- `Studio.timeSurcharge`: một khung duy nhất, enabled/start/end/method/value. Không có chồng nhiều rule lên cùng phút.
- `RoomType.rentalPlans`, `Room.rentalPlans`: mảng `RentalPlanConfig`; Unit override thay toàn bộ tập inherited. Xóa override thì kế thừa lại; mảng chỉ có inactive plans nghĩa chưa có gói bookable.
- `RoomType.crewPolicy`, `Room.crewPolicy`: included/maximum/surchargeEnabled/unit/amount. Host UI quản lý policy từng Room Unit; type field là khả năng kế thừa của model.
- `Equipment.description`: mô tả công dụng; `image` cũ được dùng cho ảnh local hợp lệ. Không biến room photo thành product photo.
- `Booking.rentalSnapshot`: bản sao plan, breakdown, totalEquipment và cấu hình crew/hours/time surcharge hiệu lực lúc tạo hoặc lúc duyệt thay đổi lịch.

Không tự gán bundle/phí/crew cho dữ liệu cũ. Gói cũ vẫn tính theo giờ × thời lượng, bundle rỗng, không khẳng định tiết kiệm. Những record cũ không có snapshot vẫn đọc và tính inventory theo `Booking.equipment` như trước.

### Các loại gói và kế thừa

Hệ thống giữ năm mã plan đã tồn tại (`hourly`, `session`, `combo3`, `combo5`, `combo10`) để không phá shape các booking cũ. Host có thể đổi tên, kiểu tính, thời lượng, giá và nội dung của các vị trí này; thêm vị trí đang thiếu qua editor. Không có số lượng package ID tùy ý trong phiên bản này.

`kind='hourly'`: đơn giá/giờ, thời lượng khách chọn 0,5–24 giờ, bước 30 phút. `kind='duration'`: giá trọn gói, flexible start, phải đủ đúng durationMinutes. `kind='session'`: chỉ nhận sessionStart và đúng durationMinutes khớp sessionEnd, có thể qua ngày hôm sau. Đổi duration/package/date làm mất slot selection trong wizard; validator vẫn kiểm tra lại khi chuyển bước và commit.

Unit.rentalPlans > Type.rentalPlans > legacy Type.plans. `rateOverride` vẫn đổi legacy rates; với custom Type packages nó chỉ đổi custom hourly rate, không tự nhân lại giá combo cố định. Nếu Unit có custom plans riêng thì chúng là cấu hình cuối. Public sticky panel hiển thị một giá và billing unit có thật, không đổi giá gói thành lời quảng cáo “/ giờ”.

## 3. Operating hours và timezone

Tất cả ngày lịch theo Asia/Ho_Chi_Minh (UTC+07). Date key `yyyy-MM-dd` để tính; nhãn Customer `dd/MM/yyyy`, thời điểm có ngày cụ thể khi qua đêm. Không dựa timezone máy chạy test.

Fixed 05:00–22:00: ca phải nằm trọn cửa sổ. Fixed 18:00–02:00: ngày mở cửa tạo một interval kết thúc hôm sau; ca 00:00–02:00 thuộc cửa sổ mở từ ngày trước. `all_day` chỉ bỏ điều kiện đóng cửa, không bỏ room/inventory/lead/package validation. Equal fixed times bị từ chối để không lẫn 24/24.

`effectiveOperatingHours()` giữ giờ policy cũ khi không có field mới. Thiếu giờ hợp lệ trả không khả dụng, không tạo giờ mặc định thương mại. UI vận hành nằm ở `/host/studios`; trang policy cũ dẫn về đó, tránh hai bộ input giờ cạnh tranh. Không có holiday calendar hoặc maintenance model mới; dự án chưa có maintenance-block entity riêng để nối vào.

## 4. Một đường tính giá

`engine.price()` gọi `quoteRental()`; `engine.validateSelection()` gọi `rentalSelectionError()`. Wizard, calendar và lệnh create dùng cùng dữ liệu/helper. `featured-pricing.ts::effectivePricingPlans()` chỉ project cùng các effective plans để hiển thị, không có công thức giá cạnh tranh.

```text
R = giá phòng/gói hiệu lực theo ngày thuê
E = tổng (đơn giá thiết bị × số lượng thuê thêm × giờ thuê)
T = phụ thu khung giờ
C = phụ thu ekip
Total = R + E + T + C
Deposit = round(Total × depositPercent / 100)
```

Tất cả giá lưu dưới integer VND, chỉ làm tròn mỗi khoản cuối về VND rồi cộng. Validator yêu cầu tiền nguyên không âm, giá gói dương; quote từ chối các kết quả không phải safe integer không âm. Duration theo phút/30 phút; phép tính tỷ lệ có thể là phân số ở trung gian, không cộng dồn sai số theo từng slot. Tổng và cọc dùng cùng breakdown ở cả ba bước. Không hardcode tỷ lệ cọc30%; lấy studio.policy.depositPercent.

### Phụ thu khung giờ

Gọi M là phút thuê thuộc khung surcharge, D là tổng phút thuê:

- Fixed: `T = round(value × M / 60)`.
- Percentage: `T = round(R × percent × M / (100 × D))`.

Ví dụ ca21:00–23:00, khung22:00–05:00: chỉ M=60. Fixed100.000đ/giờ →100.000đ. Combo3giờ600.000đ từ21:00–00:00,20%: M=120,D=180 →80.000đ. Không lấy hourly rate để định giá lại combo; không áp phần trăm lên E hoặc C. Một khung có thể qua midnight, các interval ngày không cộng trùng phút. Surcharge không mở rộng operating hours; đóng22:00 thì ca22:00 vẫn bị chặn dù rule bắt đầu22:00.

Phí này khác overtime sau khi khách dùng quá giờ; overtimePerBlock và logic làm tròn30phút cũ được giữ nguyên.

### Ekip

Ràng buộc `1 ≤ included ≤ maximum ≤ physical capacity`. Khách phải là integer1..effectiveMaximum. Nếu không có crew policy, chỉ enforce capacity và không tự tạo phụ thu. Package includedCrew có thể override allowance nếu đã có policy hợp lệ; không được vượt maximum. Tắt phí không bỏ maximum.

`extraPeople=max(0,participants-included)`. Per booking: `C=extraPeople×amount`; per hour: `C=round(extraPeople×amount×D/60)`. Ví dụ8người/gồm5,50.000đ/người:150.000đ mỗi đơn hoặc450.000đ cho3giờ. Không thêm state duyệt ekip. Step1 nêu rõ mức gồm/tối đa/phụ thu, quá mức không thể tiếp tục.

### Promotion và featured

Featured metadata vẫn tách khỏi tính giá; mỗi Unit một lựa chọn, chỉ nhãn “Gói nổi bật”/“Host đề xuất”, không tự sinh popularity/savings. Inactive/inapplicable plan bị ẩn và clear featured khi command cấu hình thay đổi.

Promotion chỉ khi Host nhập originalPrice lớn hơn price và startsOn/endsOn hợp lệ. Trong thời hạn **ngày bắt đầu thuê**, dùng price; ngoài thời hạn dùng originalPrice. Public list dùng ngày mock hiện tại và ghi rõ thời hạn; quote theo ngày thuê. Breakdown lưu discountSavings, hiển thị giá đã giảm cùng mức giảm thực. Không tự tạo giá gốc và không tuyên bố combo5giờ1.500.000đ tiết kiệm so với5×300.000đ. Host chịu trách nhiệm tính xác thực giá gốc nhập; frontend không có dữ liệu lịch sử bán để xác thực tuyên bố đó độc lập.

## 5. Thiết bị và dịch vụ

Ba lớp riêng biệt:

1. Room.amenities/included là tiện ích cố định, không tạo shared-stock demand.
2. Plan.includedEquipment là map ID→quantity, thuộc kho Studio. Có trong giá gói nhưng vẫn giữ stock.
3. Selection.equipment là **số lượng thuê thêm ngoài phần kèm gói**, mới tính thêm E.

Demand cuối = included + extras theo từng ID. Không append included vào Selection.equipment rồi cộng lại lần nữa. Booking snapshot lưu totalEquipment đúng một lần. Đơn cũ thiếu snapshot dùng equipment map cũ. Shared inventory được kiểm tra giữa mọi Room Unit có cùng thiết bị; sweep tại interval boundaries tránh cộng sai hai reservation nối tiếp không đồng thời. Sau ca vẫn giữ buffer30phút như hệ thống trước. Host giảm stock không được thấp hơn peak reservation, gồm cả snapshot bundles.

Package không đủ included stock không có slot khả dụng; không bỏ âm thầm item thiếu. Validator kiểm tra equipment active, thuộc Studio, quantity nguyên dương và tổng khả dụng. Disabled equipment có thể làm gói mới không bookable, không viết lại snapshot giá của đơn cũ.

Included services là các chuỗi mô tả riêng, không chiếm stock vật lý và không chứng minh lịch nhân sự có người trực.

### Media

Room Detail giữ editorial rows, thumbnail64–76px, tên/công dụng/giá/unit; không chuyển thành card grid. Ảnh mock cũ là ảnh phòng nên renderer dùng category icon có chữ “Minh họa”. Chỉ local `/images/equipment/...` hoặc data URL PNG/JPEG/WebP được hiển thị như ảnh thiết bị. Host chọn file≤100KB, FileReader lưu data URL trong state/localStorage; không có upload API, không fetch ảnh sản phẩm ngoài. Giới hạn quota localStorage vẫn có; Provider hiện báo không lưu được và giữ state trong phiên khi quota đầy.

## 6. Calendar, slots và quyền đặt

Calendar tháng có navigation, disabled past/unavailable days, dấu trạng thái available/partial, ngày và thời điểm bắt đầu với aria labels. Phím mũi tên đổi focus ngày khả dụng; Enter/Space chọn theo button native. Slot mỗi30phút có reason được đọc qua accessible label/title, gồm outside hours, lead, hold/buffer, thiếu đủ duration và equipment. Không hiển thị bookingId/tên khách khác.

Mỗi candidate interval kiểm tra:

1. Đúng Room Unit/studio active và effective plan.
2. Lead time24giờ + paymentMinutes, không rút còn24giờ.
3. Participants/crew/capacity; granularity30phút, thời lượng và session đúng.
4. Toàn interval nằm trong operating hours, kể cả midnight.
5. Không giao room reservation/buffer ở cả hai đầu.
6. Combined demand không vượt shared inventory tại bất kỳ boundary liên quan.

`blocksAt()` phản ánh effective expiry đã có trong tick: awaiting-payment còn deadline; payment processing khởi tạo trước deadline giữ thêm5phút; pending đã paid còn2giờ chờ Host; confirmed chưa hết ca; checked-in. Expired/cancelled/completed/no-show không block. Đây là kiểm tra preview, không tạo thêm lifecycle hoặc chuyển trạng thái mới. Command create vẫn qua execute/tick rồi validate lại trước khi ghi trong mock state hiện tại.

Buffer dùng interval nửa mở: ca09–11 giữ tới11:30, ca tiếp có thể bắt đầu11:30. Ca mới cũng không được kết thúc quá sát ca sau. 24/24 không phải luôn trống. Calendar tính lại khi date/plan/duration/crew/equipment/state đổi; selection slot không hợp lệ không thể confirm. Thay date/duration/plan yêu cầu chọn lại giờ rõ ràng.

## 7. Snapshot và tính nhất quán

Create lấy quote một lần, lưu rentalSnapshot bằng structuredClone, total và deposit từ breakdown; lifecycle giữ awaiting_payment → paid/pending → Host approval như cũ. Bản sao có plan/title/price/bundle/service, pricing breakdown, totalEquipment, effective crew/hour/surcharge. Đổi cấu hình tương lai không rewrite các giá đã lưu.

Reschedule giữ nguyên flow cũ: đề nghị không mất lịch cũ; khi Host duyệt, validator/quote kiểm tra lại và thay snapshot theo lựa chọn được duyệt, giữ deposit cũ; refund excess/debt rules không thay đổi. Không tự thu phí để duyệt ekip. Booking Detail dùng snapshot để trình bày giá và nội dung gói đã lưu; legacy bookings không có snapshot dùng UI cũ.

State Host và Customer cùng Context/execute/browserRepository. Đã kiểm tra chuyển route và reload trong cùng browser context. Không có persistence server, đồng bộ nhiều thiết bị, chống cạnh tranh giữa các browser hoặc giao dịch database thật. Không bổ sung storage-event realtime sync giữa các tab độc lập trong thay đổi này.

## 8. UI, responsive và motion

Giữ Bricolage/DM Mono/IBM Mono tiếng Việt và canonical tokens. Section heading desktop tối đa35px/700, mobile27px; editorial labels13px, ít tracking; hero/gallery/sticky architecture không đổi. Giá30–32px, featured là một row tint cyan/left border, không giant card. Thiết bị có separator, descriptions và fallback rõ ràng.

Wizard vẫn ba bước. Desktop calendar và slots cạnh nhau trong cột nội dung, summary riêng; tablet/mobile stack, local slot scrolling và dialog scrolling theo native, footer mobile sticky. Không pin/scroll hijack. Giữ native dialog focus trap/Escape, Presence/StepPanel/GSAP summary feedback. Calendar dùng CSS transition nhỏ, tắt reduced motion. Không animation lửa, không giả delay giá/availability. Kiểm tra360/390/768/1024/1440px ở cả reduce/full motion.

## 9. Hợp đồng PHP tương lai — chưa triển khai

Các tên endpoint bên dưới là **đề xuất contract**, không phải route đã đăng ký. Không sửa FastRoute/PHP/schema trong nhiệm vụ này.

| Nhu cầu | Contract đề xuất | Dữ liệu/quyền bắt buộc |
| --- | --- | --- |
| Studio operating/surcharge | GET/PATCH `/studios/{studioId}/rental-settings` | Actor Host thật + ownership; exactly2modes; timezone, rule, revision/ETag; validate không overlap |
| Effective plans/overrides | GET `/rooms/{roomId}/rental-plans`; PUT cấu hình Type/Unit riêng | Opaque plan IDs, kind/duration/session, integer money/currency, effectivity, override semantics, active; no client-price authority |
| Included equipment/services | Trong rental-plan DTO | Equipment ID/quantity cùng Studio; fixed amenities riêng; staff description không thành availability guarantee |
| Crew policy | Trong Type/Unit rental config | included/max/fee unit/amount; kiểm tra physical capacity/ownership và package override |
| Featured selection | PUT `/rooms/{roomId}/featured-pricing` | Một selection/Unit, truthful label; kiểm tra plan active/effective; tách promotion |
| Availability | GET `/rooms/{roomId}/availability` | bounded date range, selected plan/duration/crew, required inventory; reason codes public; không lộ PII/reservation IDs người khác |
| Quote | POST `/booking-quotes` | Actor/context, exact room, timestamps, plan revision, participants, **extras only**; server resolve bundles/pricing/policies, trả quoteId/version/expiresAt/itemized breakdown/deposit |
| Booking hold | POST `/booking-holds` | Idempotency key, actor/ownership, quote ID; revalidate price/version/availability; atomic room+shared inventory locking; establish hold/deadline theo policy |
| Media | Thiết kế riêng sau | Authenticated upload/storage/size/type validation và authorized media references; data URL frontend không phải API upload |

Server phải dùng đồng tiền nguyên, timezone rõ, source-of-truth inventory, payment grace/deadline hiện có, audit và policy/rate snapshots. Hold creation phải kiểm tra và reserve **room + mọi included/extra equipment trong một giao dịch an toàn đồng thời**. Quote/availability frontend không phải quyền giữ chỗ. Version mismatch/stock conflict trả error có reason và yêu cầu quote lại, không âm thầm đổi giá hay bỏ item. Không mở mutation booking/payment/refund cho AI Helpdesk như phần phụ của contract này.

## 10. File thay đổi

Mở rộng:

- `client/src/domain/models.ts`
- `client/src/domain/engine.ts`
- `client/src/domain/featured-pricing.ts`
- `client/src/data/fixtures.ts` — chỉ mô tả thiết bị, không tự thêm bundle/phí/promo.
- `client/src/components/marketplace.tsx`
- `client/src/components/operations.tsx`
- `client/src/components/wizard.tsx`
- `client/src/components/bookings.tsx` — hiển thị snapshot mới khi có.
- `client/src/features/pricing/components/RoomEditorialContent.tsx`
- `client/src/features/pricing/components/PricingList.tsx`
- `client/src/features/pricing/styles/editorial.module.css`

Tạo mới:

- `client/src/domain/rental.ts`
- `client/src/domain/rental.test.ts`
- `client/src/features/pricing/components/BookingCalendar.tsx`
- `client/src/features/pricing/components/RentalPriceSummary.tsx`
- `client/src/features/pricing/components/EquipmentVisual.tsx`
- `client/src/features/pricing/components/StudioRentalSettings.tsx`
- `client/src/features/pricing/components/RentalPackageManager.tsx`
- `client/src/features/pricing/styles/rental.module.css`
- `client/scripts/rental-pricing-qa.mjs`
- `docs/STUDIO_PRICING_AVAILABILITY_DESIGN.md`

## 11. Cách kiểm tra và bằng chứng

Từ `client/`:

```powershell
node --import tsx --test src/domain/*.test.ts
npx.cmd tsc --noEmit --incremental false
npm.cmd run lint
npm.cmd run build
node scripts/rental-pricing-qa.mjs
```

Browser script dùng local Next dev server mặc định127.0.0.1:3000 (`RENTAL_QA_URL` có thể đổi), context riêng, state demo riêng; cấu hình Host qua UI, chuyển Customer, không gọi Helpdesk/PHP/model. Nó ghi screenshots/results ignored tại `client/.impeccable/review/rental-pricing/`. Không ghi dữ liệu vào browser context đang dùng của người dùng.

Kiểm tra mới gồm operating boundaries/overnight/all-day, fixed/percentage overlap và fractional duration, crew thresholds/max/units, bundles/extras/shared peak, snapshot stock, full-day/partial slots, effective hold/grace expiry, lead time, session scheduling, promotions/inheritance/featured/auth và pricing snapshot. Các test booking/payment/refund/reschedule cũ được giữ nguyên và chạy regression.

Kết quả thực thi được ghi sau lần rà soát cuối ở mục dưới; không suy từ source có test rằng test đã chạy. Những thông báo Windows PowerShell chặn `npx.ps1` được xử lý bằng `npx.cmd`; tsx không đọc được Windows userInfo trong sandbox nên suite Node được chạy ngoài sandbox qua công cụ có kiểm soát. Không thay dependency hoặc chính sách máy để né lỗi.

### Kết quả đã thực thi

| Kiểm tra | Kết quả |
| --- | --- |
| Domain unit/integration/regression | **106/106 đạt**, 0 thất bại; gồm43 ca cũ và63 ca mới |
| TypeScript | `tsc --noEmit --incremental false` đạt; build cũng hoàn tất bước TypeScript |
| ESLint | `npm run lint` đạt |
| Production build | `next build` đạt compile/typecheck/page generation; còn thông báo nhiều lockfile có sẵn, không sửa cấu hình ngoài phạm vi để che thông báo |
| Browser tích hợp | **84 kiểm tra đạt**, không page error; Host settings/package/equipment/featured qua UI, reload, Customer quote, overnight và định dạng ngày Việt Nam, crew limit, keyboard ngày, ba bước, snapshot và simulated payment pending |
| Responsive |360/390/768/1024/1440, cả reduced/full motion; document/dialog không tràn ngang theo assertions |
| Rendered inspection | Đã mở ảnh thực tế Room Detail, Host form và calendar desktop/mobile; chỉnh spacing control sau lần xem đầu |
| External calls | Browser QA ghi **0 request ngoài local frontend**, 0 provider calls; không test PHP/9Router |
| Phạm vi bảo vệ | So SHA-256 **144 file PHP/business/database/Helpdesk/docs Helpdesk**: không file thay đổi/mất. Hai file env riêng không thay đổi theo hash đã lưu; generated next-env được khôi phục sau build |

Ảnh và `results.json` nằm tại thư mục artifact đã nêu. Browser QA dùng dev server hiện có ở cổng3000 và context riêng; production build được kiểm tra riêng, không gọi bộ QA dev là bộ kiểm thử runtime production. Không có kiểm thử thiết bị mobile vật lý, screen reader thật, tải cao hay concurrent backend trong kết quả này. Không sửa test cũ để làm xanh các thay đổi trạng thái.

### Giới hạn và bước tiếp theo

Chưa có API-backed pricing/availability/hold mới; mọi feature mới chỉ mock browser. Cần backend atomic hold/quote và versioned contracts trước khi nhận giao dịch thật; cần audit dữ liệu/ảnh/giá gốc Host và test thiết bị mobile/screen reader thật. Chưa có holiday/staff scheduler, arbitrary package IDs, storage đa thiết bị hoặc chứng nhận concurrency server. Không claim sales/popularity hoặc bảo đảm online support. Không commit, push hay deploy.
