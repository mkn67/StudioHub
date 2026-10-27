# StudioHub public FAQ — candidate release 1.0.0

Prepared 27 October 2026. Language: Vietnamese. This is an unpublished review dataset, not a deployed Helpdesk or newly approved public policy. Approval identity/date and policy effective dates are unknown. `ready_for_approval` means source comparison completed, not permission to publish. `needs_review` entries are withheld because referenced documents disagree. See [catalog](KNOWLEDGE_CATALOG.md). Structured source: [faq.v1.json](faq.v1.json).

Answers explain policy; none retrieves a booking, commits an action, guarantees availability, or confirms implementation. Studio-specific values require the Studio policy or the booking's policy snapshot. No Studio-specific policy source is available. The two Host-only entries are deliberately absent from this public FAQ.

## FAQ-001 — StudioHub là gì?

StudioHub là nền tảng giúp khách tìm, so sánh và đặt thuê phòng Studio thực tế theo thời gian, có thể thuê thêm thiết bị hoặc nội thất.

- Status: `ready_for_approval`; topic: `introduction`; audience: public/customer.
- Knowledge: KB-001. Sources: client/docs/references/StudioHub_Design_Business_Specification_v1.0.md · section 1 · v1.0.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: none in this release.

## FAQ-002 — Tôi tìm và so sánh phòng ở đâu?

Mở /rooms để tìm từng phòng thực tế, xem ảnh, đặc điểm, tiện ích và thông tin giá; mở chi tiết phòng để kiểm tra lịch và chính sách. Thông tin minh họa không chứng minh giá hay phòng trống hiện tại.

- Status: `ready_for_approval`; topic: `search`; audience: public/customer.
- Knowledge: KB-002. Sources: client/docs/references/StudioHub_Design_Business_Specification_v1.0.md · section 4.1 · v1.0; client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-05 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No current inventory, price or availability guarantee. No action performed; no live data accessed.
- Related: none in this release.

## FAQ-003 — Tôi đặt một loại phòng hay một phòng cụ thể?

Bạn chọn đúng một Room Unit, tức một phòng vật lý cụ thể. Hai phòng cùng loại có ảnh, vị trí, đặc điểm và lịch riêng; không mặc định được thay sang phòng khác.

- Status: `ready_for_approval`; topic: `booking`; audience: public/customer.
- Knowledge: KB-003. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-05 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: FAQ-004, FAQ-005, FAQ-007.

## FAQ-004 — Tôi có cần đăng nhập để tìm phòng không?

Bạn có thể tìm và xem phòng khi chưa đăng nhập. Cần đăng nhập trước bước xác nhận tạo đơn thuê.

- Status: `ready_for_approval`; topic: `booking`; audience: public/customer.
- Knowledge: KB-004. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-01 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: FAQ-003, FAQ-005, FAQ-007.

## FAQ-005 — Quy trình đặt phòng gồm những bước nào?

Từ trang chi tiết phòng, chọn thời gian hoặc gói thuê, chọn thiết bị thuê thêm nếu cần, rồi kiểm tra thông tin và chi phí trước khi xác nhận. Cần đăng nhập để tạo đơn. Thanh toán trong bản frontend hiện tại là mô phỏng.

- Status: `ready_for_approval`; topic: `booking`; audience: public/customer.
- Knowledge: KB-005. Sources: client/docs/references/StudioHub_Design_Business_Specification_v1.0.md · section 4.1 · v1.0; client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-01 · v1.1; client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-11 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: FAQ-003, FAQ-004, FAQ-007.

## FAQ-006 — Tôi có thể thuê thêm thiết bị của Studio khác không?

Thiết bị thuê thêm phải thuộc cùng Studio với phòng được đặt và còn đủ số lượng trong thời gian thuê. Thiết bị có sẵn trong phòng khác với thiết bị thuê thêm tính phí.

- Status: `ready_for_approval`; topic: `equipment`; audience: public/customer.
- Knowledge: KB-006. Sources: client/docs/references/StudioHub_Design_Business_Specification_v1.0.md · section 2 · v1.0; client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-07 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: none in this release.

## FAQ-007 — Số người và số lượng thiết bị có giới hạn không?

Số người phải lớn hơn 0 và không vượt sức chứa phòng. Số lượng thiết bị thuê thêm phải lớn hơn 0 và không vượt lượng khả dụng trong thời gian tương ứng.

- Status: `ready_for_approval`; topic: `booking`; audience: public/customer.
- Knowledge: KB-007. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-07 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: FAQ-003, FAQ-004, FAQ-005.

## FAQ-008 — Khoảng đệm 30 phút có phải giờ dùng phòng miễn phí không?

Không. Sau mỗi ca có 30 phút đệm để dọn và chuẩn bị phòng. Ca kết thúc lúc 12:00 có đệm tới 12:30; ca mới bắt đầu 12:30 chỉ có thể hợp lệ nếu đáp ứng các điều kiện khác.

- Status: `ready_for_approval`; topic: `availability`; audience: public/customer.
- Knowledge: KB-008. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-08 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No current inventory, price or availability guarantee. No action performed; no live data accessed.
- Related: none in this release.

## FAQ-009 — Tôi phải đặt trước bao lâu?

Thời điểm tạo đơn phải trước giờ thuê ít nhất 24 giờ cộng thời hạn thanh toán cọc của Host. Thời hạn cọc nằm trong khoảng 15 phút đến 3 giờ; nếu là 3 giờ thì cần đặt trước ít nhất 27 giờ.

- Status: `needs_review`; topic: `deposit`; audience: public/customer.
- Knowledge: KB-009. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-10 · v1.1.
- Constraints: Candidate only; source conflict requires review before release. No action performed; no live data accessed.
- Related: FAQ-010, FAQ-011, FAQ-012.

## FAQ-010 — Có phải Studio nào cũng yêu cầu cọc 30% không?

Không có tỷ lệ cọc 30% chung cho mọi Studio. Tỷ lệ áp dụng theo chính sách Studio; giá và chính sách được lưu tại thời điểm tạo đơn. Khoản cọc đã trả được tính vào tiền thuê.

- Status: `needs_review`; topic: `deposit`; audience: public/customer.
- Knowledge: KB-010. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-18 · v1.1; client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-19 · v1.1.
- Constraints: Candidate only; source conflict requires review before release. No action performed; no live data accessed.
- Related: FAQ-009, FAQ-011, FAQ-012.

## FAQ-011 — Sau khi tạo đơn tôi giữ phòng đến khi nào?

Theo chính sách, đơn mới ở trạng thái awaiting_payment và giữ phòng cùng thiết bị tới hạn thanh toán cọc ghi trên đơn. Không suy ra hạn của một đơn cụ thể từ hướng dẫn chung này.

- Status: `needs_review`; topic: `deposit`; audience: public/customer.
- Knowledge: KB-011. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-11 · v1.1.
- Constraints: Candidate only; source conflict requires review before release. No action performed; no live data accessed.
- Related: FAQ-009, FAQ-010, FAQ-012.

## FAQ-012 — Tôi có được bắt đầu trả cọc sau hạn không?

Không được khởi tạo giao dịch mới sau hạn. Nếu giao dịch bắt đầu trước hạn còn processing, thời gian xử lý thêm tối đa 5 phút sau hạn; kết quả chưa rõ cần đối soát và không được coi là đã thanh toán thành công.

- Status: `ready_for_approval`; topic: `deposit`; audience: public/customer.
- Knowledge: KB-012. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-13 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: FAQ-009, FAQ-010, FAQ-011.

## FAQ-013 — Trả cọc xong có nghĩa là đơn đã được xác nhận không?

Theo chính sách, trả cọc thành công đưa đơn sang pending để chờ Host duyệt. Chỉ khi Host duyệt đơn mới là confirmed. Đã trả cọc không đồng nghĩa đã thanh toán toàn bộ.

- Status: `needs_review`; topic: `confirmation`; audience: public/customer.
- Knowledge: KB-013. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-14 · v1.1.
- Constraints: Candidate only; source conflict requires review before release. No action performed; no live data accessed.
- Related: FAQ-014.

## FAQ-014 — Host có bao lâu để duyệt đơn sau khi tôi cọc?

Host có đúng 2 giờ từ khi cọc được xác nhận thành công để duyệt hoặc từ chối. Quá hạn không phản hồi thì theo chính sách đơn bị hủy, không tính strike và khởi tạo/xử lý hoàn 100% cọc; không có nghĩa tiền đã về tài khoản.

- Status: `needs_review`; topic: `confirmation`; audience: public/customer.
- Knowledge: KB-014. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-15 · v1.1; client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-25 · v1.1.
- Constraints: Candidate only; source conflict requires review before release. No action performed; no live data accessed.
- Related: FAQ-013.

## FAQ-015 — Các trạng thái đơn thuê có nghĩa gì?

Theo chính sách: awaiting_payment là chờ cọc; pending là đã cọc chờ Host; confirmed là đã được Host duyệt; checked_in là Host xác nhận nhận phòng; completed là Host xác nhận trả phòng; cancelled là đã hủy; expired là hết hạn thanh toán; no_show là hết ca mà chưa có check-in xác nhận. Đây không phải kết quả tra cứu đơn.

- Status: `needs_review`; topic: `statuses`; audience: public/customer.
- Knowledge: KB-015. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-16 · v1.1; client/docs/references/StudioHub_Design_Business_Specification_v1.0.md · section 7.1 · v1.0.
- Constraints: Candidate only; source conflict requires review before release. No action performed; no live data accessed.
- Related: none in this release.

## FAQ-016 — Đơn đã hủy có nghĩa là cọc đã được hoàn không?

Không. Trạng thái đơn, thanh toán và hoàn tiền độc lập. Một đơn có thể đã hủy, cọc đã thu nhưng hoàn tiền còn chờ; cần dữ liệu hoàn tiền có xác thực để biết tình trạng cụ thể.

- Status: `ready_for_approval`; topic: `refund`; audience: public/customer.
- Knowledge: KB-016. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-16 · v1.1; client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-17 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No booking-specific entitlement, amount or settlement promise. No action performed; no live data accessed.
- Related: FAQ-019, FAQ-020.

## FAQ-017 — Tôi được tự hủy trước giờ thuê bao lâu?

Host cấu hình hạn tự hủy là 24, 48 hoặc 72 giờ trước giờ thuê. Qua hạn bạn không tự hủy được, nhưng có thể yêu cầu hỗ trợ ngoại lệ. Hạn hủy và hạn đổi lịch là hai cấu hình riêng.

- Status: `ready_for_approval`; topic: `cancellation`; audience: public/customer.
- Knowledge: KB-017. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-22 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No booking-specific entitlement, amount or settlement promise. No action performed; no live data accessed.
- Related: FAQ-018.

## FAQ-018 — Hủy sau khi cọc có được hoàn toàn bộ không?

Nếu đã cọc và hủy trong hạn cho phép, mức hoàn theo chính sách được lưu khi tạo đơn, có thể từ 0% đến 100%; không có bảo đảm hoàn toàn bộ và không tính strike cho nhánh này.

- Status: `needs_review`; topic: `cancellation`; audience: public/customer.
- Knowledge: KB-018. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-23 · v1.1.
- Constraints: Candidate only; source conflict requires review before release. No booking-specific entitlement, amount or settlement promise. No action performed; no live data accessed.
- Related: FAQ-017.

## FAQ-019 — Host từ chối đơn sau khi tôi cọc thì sao?

Theo chính sách, đơn bị hủy và bạn được hoàn 100% cọc, không tính strike. Nhánh Host từ chối theo quy trình hoàn thông thường cần Host xác nhận; khác với hoàn tự động khi Host quá hạn phản hồi.

- Status: `needs_review`; topic: `refund`; audience: public/customer.
- Knowledge: KB-019. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-15 · v1.1; client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-24 · v1.1; client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-25 · v1.1.
- Constraints: Candidate only; source conflict requires review before release. No booking-specific entitlement, amount or settlement promise. No action performed; no live data accessed.
- Related: FAQ-016, FAQ-020.

## FAQ-020 — Khi nào tiền hoàn chắc chắn về tài khoản?

Chính sách phân biệt hoàn đang chờ, đang xử lý, thành công và thất bại, nhưng không nêu thời gian tiền chắc chắn về tài khoản. Chỉ xác nhận đã hoàn khi có kết quả được xác minh; trợ lý không thể cam kết ngày tiền về.

- Status: `ready_for_approval`; topic: `refund`; audience: public/customer.
- Knowledge: KB-020. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-25 · v1.1; client/docs/references/StudioHub_Design_Business_Specification_v1.0.md · section 13 · v1.0.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No booking-specific entitlement, amount or settlement promise. No action performed; no live data accessed.
- Related: FAQ-016, FAQ-019.

## FAQ-021 — Studio đổi chính sách sau khi tôi đặt thì có áp dụng lại không?

Giá và chính sách hủy/hoàn được lưu khi tạo đơn. Việc Host thay bảng giá hoặc chính sách về sau không sửa hồi tố giá và chính sách đã lưu của đơn đó.

- Status: `ready_for_approval`; topic: `pricing`; audience: public/customer.
- Knowledge: KB-021. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-18 · v1.1; client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-23 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: none in this release.

## FAQ-022 — Tôi có thể đổi lịch hoặc đổi phòng bao nhiêu lần?

Chỉ đơn confirmed, chưa check-in và còn đủ hạn đổi do Host cấu hình 24/48/72 giờ trước giờ bắt đầu gốc mới được gửi yêu cầu. Tối đa một lần thay đổi thành công; yêu cầu bị từ chối, rút lại hoặc chưa hoàn tất không mất lượt. Mỗi đơn chỉ có một yêu cầu đang xử lý.

- Status: `ready_for_approval`; topic: `rescheduling`; audience: public/customer.
- Knowledge: KB-022. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-30 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: FAQ-023, FAQ-024.

## FAQ-023 — Gửi yêu cầu đổi lịch có làm mất lịch cũ ngay không?

Không. Host phải duyệt; trong khi xét yêu cầu, đơn và lịch cũ vẫn được giữ. Chỉ thay thế sau khi kiểm tra khả dụng và hoàn tất thay đổi an toàn. Yêu cầu bị từ chối không làm mất đơn gốc.

- Status: `ready_for_approval`; topic: `rescheduling`; audience: public/customer.
- Knowledge: KB-023. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-31 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: FAQ-022, FAQ-024.

## FAQ-024 — Đổi lịch giá cao hơn thì phải cọc thêm ngay không?

Sau thay đổi được duyệt, khoản cọc đã trả được giữ nguyên; tổng giá và công nợ được tính lại, không thu ngay phần tăng cọc. Nếu tổng mới thấp hơn cọc thực thu thì ghi nghĩa vụ hoàn phần dư; đây không phải hủy đơn.

- Status: `ready_for_approval`; topic: `rescheduling`; audience: public/customer.
- Knowledge: KB-024. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-21 · v1.1; client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-32 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: FAQ-022, FAQ-023.

## FAQ-025 — Tới giờ thuê thì đơn tự check-in không?

Không. Host xác nhận check-in thủ công và lưu giờ nhận phòng thực tế; không bắt buộc QR và không tự chuyển trạng thái theo đồng hồ.

- Status: `ready_for_approval`; topic: `checkin`; audience: public/customer.
- Knowledge: KB-025. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-33 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: FAQ-026.

## FAQ-026 — Tôi đến trễ thì được trả phòng muộn tương ứng không?

Không tự kéo dài giờ thuê, giảm giá hay bù thời gian đến muộn. Giờ kết thúc vẫn theo giờ đặt ban đầu; Host ghi nhận giờ đến thực tế.

- Status: `ready_for_approval`; topic: `checkin`; audience: public/customer.
- Knowledge: KB-026. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-34 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: FAQ-025.

## FAQ-027 — Chưa trả hết tiền thì đơn có hoàn tất khi trả phòng không?

Host xác nhận check-out thủ công và lưu giờ trả phòng thực tế. Khi được xác nhận, đơn completed dù còn công nợ hoặc phụ thu; khoản phải thu được theo dõi riêng.

- Status: `ready_for_approval`; topic: `checkout`; audience: public/customer.
- Knowledge: KB-027. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-35 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: none in this release.

## FAQ-028 — Không đến sử dụng phòng thì cọc và strike thế nào?

Hết ca dự kiến mà chưa có check-in xác nhận thì theo chính sách là no_show: không hoàn cọc và không cộng strike. Không tự coi là completed hay tự thu toàn bộ phần tiền còn lại ngoài quy tắc đã chốt.

- Status: `ready_for_approval`; topic: `no_show`; audience: public/customer.
- Knowledge: KB-028. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-36 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: none in this release.

## FAQ-029 — Quá giờ 31 phút được tính thế nào?

Phụ thu quá giờ tính theo mỗi block 30 phút, làm tròn lên theo đơn giá Host cấu hình. Quá 31 phút là 2 block; khoảng đệm dọn phòng không phải thời gian dùng miễn phí. Cần đơn giá thực tế để tính số tiền.

- Status: `ready_for_approval`; topic: `overtime`; audience: public/customer.
- Knowledge: KB-029. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-37 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: FAQ-030.

## FAQ-030 — Nếu ca trước quá giờ thì hệ thống tự dời ca của tôi không?

Chính sách yêu cầu cảnh báo và xử lý sự cố khi quá giờ xung đột ca sau; không tự dời hoặc hủy đơn của khách kế tiếp.

- Status: `ready_for_approval`; topic: `overtime`; audience: public/customer.
- Knowledge: KB-030. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-09 · v1.1; client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-37 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: FAQ-029.

## FAQ-031 — Khi nào tôi bị tính strike?

Một strike áp dụng khi bạn tự hủy đơn đã tạo nhưng chưa cọc, hoặc bỏ đơn để hết hạn thanh toán. Không tính trùng cho cùng sự cố. Hủy đã cọc đúng hạn, Host từ chối hoặc trễ duyệt, lỗi thanh toán đã xác minh do hệ thống và no-show không thuộc nhánh cộng strike.

- Status: `ready_for_approval`; topic: `restrictions`; audience: public/customer.
- Knowledge: KB-031. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-12 · v1.1; client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-27 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: FAQ-032, FAQ-033.

## FAQ-032 — Bị 3 strike có mất quyền đăng nhập và nhận hoàn tiền không?

Ba strike hiệu lực tạm ngưng quyền tạo đơn trên toàn hệ thống và không cho đổi lịch tới khi Admin khôi phục. Bạn vẫn có thể đăng nhập, xem và tiếp tục đơn hợp lệ có trước, thanh toán công nợ, nhận hoàn và yêu cầu hỗ trợ. Việc này khác khóa đăng nhập vì bảo mật.

- Status: `ready_for_approval`; topic: `restrictions`; audience: public/customer.
- Knowledge: KB-032. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-04 · v1.1; client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-28 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: FAQ-031, FAQ-033.

## FAQ-033 — Khôi phục quyền đặt có xóa lịch sử vi phạm không?

Khi Admin khôi phục, số strike hiệu lực về 0; lịch sử vi phạm và audit vẫn được giữ. Đây là quy tắc chung, không xác nhận tài khoản cụ thể đã được mở.

- Status: `ready_for_approval`; topic: `restrictions`; audience: public/customer.
- Knowledge: KB-033. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-29 · v1.1.
- Constraints: Source-grounded policy guidance; not proof of deployed behavior. No action performed; no live data accessed.
- Related: FAQ-031, FAQ-032.

## FAQ-034 — Thanh toán ở bản frontend hiện tại có phải chuyển tiền thật không?

Không. Bản frontend hiện tại dùng thao tác mô phỏng thành công hoặc thất bại, chưa phải giao dịch ngân hàng thật. Không chuyển tiền dựa trên câu trả lời của trợ lý.

- Status: `needs_review`; topic: `demo_scope`; audience: public/customer.
- Knowledge: KB-034. Sources: client/docs/references/StudioHub_Business_Policy_VI_v1.1.md · BP-11 · v1.1; client/docs/references/StudioHub_Design_Business_Specification_v1.0.md · section 1 · v1.0.
- Constraints: Candidate only; source conflict requires review before release. No action performed; no live data accessed.
- Related: none in this release.

## Live-data and action questions — no static answers

| ID | Example | Required capability | Current behavior |
| --- | --- | --- | --- |
| LIVE-001 | Has my booking been confirmed? | authenticated_booking_reader | unavailable; No booking endpoint exists; never infer confirmation from a booking code. |
| LIVE-002 | Tiền hoàn đơn SH-123 đã về chưa? | authenticated_refund_reader | unavailable; Refund API and ledger missing; never infer money state from cancelled. |
| LIVE-003 | Phòng này còn trống ngày mai không? | verified_availability_reader | unavailable; Busy calendar alone does not prove bookability. |
| LIVE-004 | Giá phòng A101 hôm nay bao nhiêu? | scoped_current_rates_reader | unavailable; Need resolved real room ID, effective rates and timestamp; no mock quote. |
| LIVE-005 | Hủy đơn giúp tôi ngay. | authorized_confirmed_business_workflow | unavailable; H1 has no business write capability. |
| LIVE-006 | Tài khoản tôi có bị ngưng đặt thuê không? | authenticated_restriction_reader | unavailable; Client persona and security locked status cannot establish booking restrictions. |

These routing examples have no canonical policy answer. Authentication alone cannot enable a missing API. A future anonymous private-data request may return unauthorized; an authenticated request remains unavailable until a reviewed capability exists.
