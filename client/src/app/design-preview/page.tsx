import "./preview.css";

const rooms = [
  { name: "Daylight Atelier", type: "Studio ánh sáng tự nhiên", place: "Quận 3 · TP. Hồ Chí Minh", price: "350.000đ", image: "/images/daylight.jpg", tag: "Được yêu thích" },
  { name: "The Loft Saigon", type: "Không gian sáng tạo", place: "Bình Thạnh · TP. Hồ Chí Minh", price: "420.000đ", image: "/images/loft.jpg", tag: "Nhiều ánh sáng" },
  { name: "Sound Room 02", type: "Phòng thu âm & podcast", place: "Quận 1 · TP. Hồ Chí Minh", price: "280.000đ", image: "/images/sound.jpg", tag: "Cách âm tốt" },
];

function Brand({ variant = "b" }: { variant?: "a" | "b" }) {
  return <div className={`pv-brand pv-brand-${variant}`}><span className="pv-mark">s.</span><span>studiohub</span></div>;
}

function HomeMock({ variant }: { variant: "a" | "b" }) {
  return <div className={`pv-screen pv-home pv-${variant}`}>
    <header className="pv-nav"><Brand variant={variant}/><nav><span>Khám phá</span><span>Trở thành host</span></nav><button className="pv-login">Đăng nhập</button></header>
    <div className="pv-home-hero" style={{ backgroundImage: "linear-gradient(90deg, rgba(18,34,37,.60), rgba(18,34,37,.06)), url('/images/cyclorama-2.jpg')" }}>
      <div className="pv-hero-copy"><span className="pv-kicker">KHÔNG GIAN CHO Ý TƯỞNG</span><h3>Tìm nơi để<br/><em>ý tưởng thành hình.</em></h3><p>Studio, phòng chụp và không gian sáng tạo — sẵn sàng cho dự án tiếp theo của bạn.</p></div>
      <div className="pv-search"><div><small>BẠN ĐANG TÌM</small><b>Studio chụp ảnh</b></div><div><small>NGÀY & GIỜ</small><b>Chọn lịch</b></div><div><small>KHU VỰC</small><b>TP. Hồ Chí Minh</b></div><button aria-label="Tìm kiếm">⌕</button></div>
      <span className="pv-photo-credit">Không gian sáng tạo, theo cách của bạn</span>
    </div>
    <section className="pv-content"><div className="pv-section-title"><div><span className="pv-kicker">KHÁM PHÁ KHÔNG GIAN</span><h4>Chọn theo dự án của bạn</h4></div><span className="pv-link">Xem tất cả →</span></div>
      <div className="pv-categories"><div>◉ <b>Chụp ảnh</b><small>Ánh sáng đẹp, phông nền đa dạng</small></div><div>◌ <b>Quay phim</b><small>Không gian rộng, thiết bị sẵn có</small></div><div>▧ <b>Workshop</b><small>Gặp gỡ và sáng tạo cùng nhau</small></div></div>
      <div className="pv-section-title rooms-title"><div><span className="pv-kicker">ĐƯỢC CỘNG ĐỒNG YÊU THÍCH</span><h4>Không gian nổi bật</h4></div><span className="pv-link">Khám phá phòng →</span></div>
      <div className="pv-room-grid">{rooms.map((room, i) => <article className="pv-room" key={room.name}><div className="pv-room-img" style={{ backgroundImage: `url('${room.image}')` }}><span>{room.tag}</span><b>♡</b></div><div className="pv-room-info"><div className="pv-room-top"><b>{room.name}</b><span>★ 4.{9-i}</span></div><small>{room.type} · {room.place}</small><div className="pv-room-price"><b>{room.price}</b> / giờ <span>›</span></div></div></article>)}</div>
    </section>
  </div>;
}

function DetailMock({ variant, mobile = false }: { variant: "a" | "b"; mobile?: boolean }) {
  return <div className={`pv-screen pv-detail pv-${variant} ${mobile ? "pv-mobile" : ""}`}>
    <header className="pv-nav"><Brand variant={variant}/>{!mobile && <nav><span>Khám phá</span><span>Trở thành host</span></nav>}<button className="pv-login">♡ {!mobile && "Lưu"}</button></header>
    <main className="pv-detail-main"><div className="pv-detail-heading"><div><span className="pv-kicker">STUDIO CHỤP ẢNH · QUẬN 3</span><h3>Daylight Atelier — studio ánh sáng tự nhiên</h3><p>★ <b>4.92</b> <u>· 28 đánh giá</u>　•　TP. Hồ Chí Minh</p></div>{!mobile && <button className="pv-share">↗ Chia sẻ</button>}</div>
      <div className="pv-gallery"><div className="pv-gallery-main" style={{ backgroundImage: "url('/images/daylight.jpg')" }}></div><div style={{ backgroundImage: "url('/images/daylight-2.jpg')" }}></div><div style={{ backgroundImage: "url('/images/loft-2.jpg')" }}></div><button>▦　Xem tất cả ảnh</button></div>
      {!mobile && <div className="pv-anchor"><span>Không gian</span><span>Tiện ích</span><span>Thiết bị</span><span>Giá & chính sách</span><span>Đánh giá</span></div>}
      <div className="pv-detail-columns"><div className="pv-description"><h4>Ánh sáng đẹp, ý tưởng rộng mở</h4><p>Một studio yên tĩnh với cửa sổ lớn đón nắng tự nhiên, phông nền linh hoạt và mọi thứ bạn cần cho buổi chụp trọn vẹn.</p><div className="pv-detail-feature"><span>⌂</span><div><b>Không gian riêng tư</b><small>85 m² · Tối đa 12 khách</small></div></div><div className="pv-detail-feature"><span>☼</span><div><b>Ánh sáng tự nhiên</b><small>Cửa sổ hướng Đông, đẹp nhất buổi sáng</small></div></div><div className="pv-detail-feature"><span>✓</span><div><b>Đặt lịch linh hoạt</b><small>Miễn phí hủy trước 48 giờ</small></div></div></div>
        {!mobile && <aside className="pv-booking"><div className="pv-booking-price"><b>350.000đ</b><small> / giờ</small><span>★ 4.92</span></div><div className="pv-booking-fields"><div><small>NGÀY</small><b>Chọn ngày</b></div><div><small>GIỜ BẮT ĐẦU</small><b>09:00</b></div><div><small>SỐ GIỜ</small><b>2 giờ</b></div></div><button className="pv-cta">Kiểm tra lịch trống</button><small className="pv-note">Bạn chưa bị tính phí</small><div className="pv-total"><span>2 giờ × 350.000đ</span><b>700.000đ</b></div></aside>}</div>
    </main>
    {mobile && <div className="pv-mobile-bar"><div><b>350.000đ</b><small> / giờ　★ 4.92</small></div><button className="pv-cta">Chọn lịch</button></div>}
  </div>;
}

function VariantLabel({ name, desc, code }: { name: string; desc: string; code: string }) {
  return <div className="pv-variant-label"><span>{code}</span><div><b>{name}</b><small>{desc}</small></div></div>;
}

export default function DesignPreviewPage() {
  return <main className="preview-page">
    <header className="preview-header"><Brand/><div><span className="pv-kicker">STUDIOHUB · DESIGN EXPLORATION</span><h1>Một nền tảng,<br/><em>hai cá tính.</em></h1><p>So sánh hai hướng thiết kế trên cùng trải nghiệm thuê studio. Cả hai giữ nguyên teal, Bricolage Grotesque và chất riêng của StudioHub.</p></div><div className="preview-meta"><span>01 / 02</span><small>MOODBOARD & GIAO DIỆN</small></div></header>
    <section className="preview-section"><div className="preview-section-head"><div><span className="pv-kicker">01 — TRANG CHỦ</span><h2>Mở đầu hành trình khám phá</h2></div><p>Hero ảnh thật, tìm kiếm nổi bật và phòng được tuyển chọn ngay trong tầm mắt.</p></div>
      <div className="preview-pair"><article><VariantLabel code="A" name="Brutalist tinh gọn" desc="Viền mảnh · mực đậm · cạnh vuông"/><HomeMock variant="a"/></article><article><VariantLabel code="B" name="Editorial mềm mại" desc="Bo 10px · ảnh lớn · nhịp thở thoáng"/><HomeMock variant="b"/></article></div>
    </section>
    <section className="preview-section"><div className="preview-section-head"><div><span className="pv-kicker">02 — CHI TIẾT KHÔNG GIAN</span><h2>Giúp khách tự tin đặt lịch</h2></div><p>Ảnh gallery, thông tin dễ quét và thẻ đặt lịch cố định bên cạnh nội dung.</p></div>
      <div className="preview-pair"><article><VariantLabel code="A" name="Thông tin có cấu trúc" desc="Khung nét rõ · tương phản mạnh"/><DetailMock variant="a"/></article><article><VariantLabel code="B" name="Lưu trú trong trải nghiệm" desc="Bề mặt nhẹ · bo góc · bóng dịu"/><DetailMock variant="b"/></article></div>
    </section>
    <section className="preview-section preview-mobile-section"><div className="preview-section-head"><div><span className="pv-kicker">03 — TRẢI NGHIỆM MOBILE</span><h2>Đặt lịch ngay trong tầm tay</h2></div><p>Thanh giá ghim dưới màn hình, CTA rõ ràng và nội dung gọn cho màn nhỏ.</p></div>
      <div className="preview-pair mobile-pair"><article><VariantLabel code="A" name="Gọn và trực diện" desc="Đường nét mạnh · CTA tương phản"/><DetailMock variant="a" mobile/></article><article><VariantLabel code="B" name="Sáng và thân thiện" desc="Bo mềm · thao tác thoải mái"/><DetailMock variant="b" mobile/></article></div>
    </section>
    <footer className="preview-footer"><div><span className="pv-kicker">GỢI Ý</span><h2>Chọn hướng B cho khu khách hàng</h2><p>Giữ A như một nhánh nhận diện riêng nếu muốn tiếp tục dùng chất brutalist ở các màn quản trị.</p></div><div className="preview-swatches"><span><i></i>Teal hiện tại</span><span><i></i>Mực xanh đen</span><span><i></i>Nền sáng ấm</span></div></footer>
  </main>;
}
