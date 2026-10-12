export interface Room {
  id: string;
  name: string;
  studioName: string;
  category: 'photo' | 'video' | 'livestream' | 'concept';
  categoryLabel: string;
  location: string;
  district: string;
  city: string;
  area: number; // m2
  ceilingHeight: number; // m
  capacity: number; // people
  pricePerHour: number; // VND/h
  pricePerSlot: number; // VND/ca 2h
  soundproof: 'Chuẩn A (Cách âm hoàn toàn)' | 'Chuẩn B (Tiêu âm tiêu chuẩn)' | 'Chuẩn Studio';
  powerCapacity: string;
  description: string;
  rules: string[];
  features: string[];
  images: string[];
  rating: number;
  reviewsCount: number;
  available: boolean;
}

export interface TimeSlot {
  id: string;
  slotNumber: number;
  timeRange: string; // "08:00 - 10:00"
  startHour: string;
  endHour: string;
  status: 'available' | 'booked' | 'cleaning';
  bufferAfter: string; // "30 phút dọn phòng (10:00 - 10:30)"
}

export interface Equipment {
  id: string;
  name: string;
  category: 'lighting' | 'modifier' | 'backdrop' | 'furniture';
  categoryLabel: string;
  brand: string;
  pricePerSlot: number; // VND per slot
  maxStock: number;
  availableStock: number;
  unit: string;
  image: string;
  description: string;
}

export interface BookingOrder {
  id: string;
  bookingCode: string;
  room: Room;
  selectedDate: string;
  selectedSlots: TimeSlot[];
  selectedEquipments: { equipment: Equipment; quantity: number }[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  note?: string;
  roomCost: number;
  equipmentCost: number;
  cleaningFee: number;
  subtotal: number;
  depositAmount: number; // 30%
  remainingAmount: number;
  paymentMethod: 'sandbox_qr' | 'hold_slot';
  paymentStatus: 'paid' | 'pending' | 'refunded';
  bookingStatus: 'pending' | 'checked_in' | 'completed' | 'deposit_refunded';
  createdAt: string;
}

// ---------------- SAMPLE ROOMS ----------------
export const SAMPLE_ROOMS: Room[] = [
  {
    id: 'room-artemis-01',
    name: 'Studio Artemis - Phòng Cyclorama Vô Cực Trắng',
    studioName: 'Artemis Creative Hub',
    category: 'photo',
    categoryLabel: 'Chụp ảnh Lookbook / Thương mại',
    location: '142 Nguyễn Thị Minh Khai, Phường 6',
    district: 'Quận 3',
    city: 'TP. Hồ Chí Minh',
    area: 75,
    ceilingHeight: 4.5,
    capacity: 12,
    pricePerHour: 350000,
    pricePerSlot: 650000,
    soundproof: 'Chuẩn B (Tiêu âm tiêu chuẩn)',
    powerCapacity: 'Điện 3 pha 32A, 12 ổ cắm chuẩn CEE',
    description: 'Phòng vô cực trắng góc bo uốn cong 3 mặt liền mạch, sàn sơn Epoxy bóng chống trầy. Phù hợp chụp thời trang lookbook, profile doanh nhân và quay TVC quảng cáo sản phẩm.',
    rules: [
      'Bắt buộc dán băng dính đế giày trước khi bước vào phông vô cực',
      'Không mang đồ ăn có nước sốt, phẩm màu vào khu vực cyclorama',
      'Tắt toàn bộ thiết bị công suất cao trước 10 phút trả phòng để kiểm tra'
    ],
    features: ['Phông vô cực trắng 3 mặt', 'Phòng thay đồ & Makeup riêng', 'Điều hòa âm trần 4 ngựa', 'Bàn ủi hơi nước công nghiệp'],
    images: [
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
    ],
    rating: 4.9,
    reviewsCount: 38,
    available: true,
  },
  {
    id: 'room-lumina-soundproof',
    name: 'Studio Lumina - Soundstage Cách Âm Chuyên Nghiệp',
    studioName: 'Lumina Media Complex',
    category: 'video',
    categoryLabel: 'Quay phim MV / TVC / Phim ngắn',
    location: '88 Đường số 7, KDC An Phú',
    district: 'TP. Thủ Đức',
    city: 'TP. Hồ Chí Minh',
    area: 120,
    ceilingHeight: 5.2,
    capacity: 25,
    pricePerHour: 550000,
    pricePerSlot: 1050000,
    soundproof: 'Chuẩn A (Cách âm hoàn toàn)',
    powerCapacity: 'Trạm điện chuyên dụng 60A 3 pha, tủ nguồn có CB chống giật riêng',
    description: 'Soundstage xử lý âm học hoàn chỉnh với vách Rockwool tỷ trọng 100kg/m³, cửa cách âm 2 lớp gioăng từ tính. Lý tưởng cho thu âm trực tiếp đồng bộ, ghi hình talkshow và quay video chuyên nghiệp.',
    rules: [
      'Đảm bảo đóng chặt cửa khoang kép khi đang bật đèn cảnh báo "ON AIR"',
      'Tuân thủ tải trọng treo đèn trên dàn Truss tối đa 250kg',
      'Đội ngũ dọn dẹp vệ sinh rác thải sau mỗi ca quay'
    ],
    features: ['Dàn khung truss trần treo đèn xoay 360°', 'Tiêu âm tuyệt đối STC 55+', 'Cổng bốc dỡ đạo cụ xe tải vào tận nơi', 'Phòng kỹ thuật audio riêng biệt'],
    images: [
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
    ],
    rating: 5.0,
    reviewsCount: 52,
    available: true,
  },
  {
    id: 'room-nordic-loft',
    name: 'Studio Nordic - Concept Nội Thất Bauhaus & Vintage',
    studioName: 'Minimalist House Studio',
    category: 'concept',
    categoryLabel: 'Concept Nội Thất & Đời Sống',
    location: '235 Hoàng Sa, Phường Tân Định',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    area: 60,
    ceilingHeight: 3.8,
    capacity: 8,
    pricePerHour: 280000,
    pricePerSlot: 520000,
    soundproof: 'Chuẩn Studio',
    powerCapacity: 'Điện sinh hoạt 2 pha công suất 5000W',
    description: 'Căn phòng ngập tràn ánh sáng tự nhiên với 3 ô cửa kính hướng Đông Nam, bài trí sofa da bò vintage, bàn trà đá travertine và tranh nghệ thuật tối giản.',
    rules: [
      'Nhấc bổng đồ nội thất khi di chuyển, không kéo lê trên sàn gỗ sồi',
      'Không tự ý di dời cây xanh thân lớn ra khỏi khay hứng nước',
      'Chỉ dùng nến trang trí giả đèn LED, nghiêm cấm lửa thật'
    ],
    features: ['Ánh sáng tự nhiên từ 07:00 đến 16:30', 'Đầy đủ đạo cụ decor gốm sứ cao cấp', 'Rèm lụa 2 lớp cản sáng linh hoạt'],
    images: [
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    ],
    rating: 4.8,
    reviewsCount: 29,
    available: true,
  },
  {
    id: 'room-podcast-pod',
    name: 'Studio Podcast & Livestream Siêu Tốc',
    studioName: 'Nexus Stream Studio',
    category: 'livestream',
    categoryLabel: 'Podcast / Talkshow / Livestream',
    location: '56 Kim Mã, Phường Ngọc Khánh',
    district: 'Ba Đình',
    city: 'Hà Nội',
    area: 40,
    ceilingHeight: 3.2,
    capacity: 6,
    pricePerHour: 300000,
    pricePerSlot: 580000,
    soundproof: 'Chuẩn A (Cách âm hoàn toàn)',
    powerCapacity: 'Nguồn UPS lưu điện liên tục chống sập nguồn',
    description: 'Phòng setup sẵn bàn Podcast 4 người với micro Shure SM7B, switch trộn hình Blackmagic ATEM Mini Pro và đường truyền Internet cáp quang đối xứng 500Mbps.',
    rules: [
      'Không cắm thiết bị sạc ngoài vào đường điện của hệ thống mixer âm thanh',
      'Sử dụng tai nghe kiểm âm đúng cổng đánh số trên bàn',
      'Bàn giao nguyên trạng góc máy quay sau ca livestream'
    ],
    features: ['Trang bị sẵn 4 mic Shure SM7B', 'Đường truyền Internet kép 2 line 1Gbps', 'Setup đèn LED Key/Fill/Rim chuẩn streamer'],
    images: [
      'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
    ],
    rating: 4.9,
    reviewsCount: 44,
    available: true,
  }
];

// ---------------- SAMPLE TIME SLOTS ----------------
export const SAMPLE_TIME_SLOTS: TimeSlot[] = [
  {
    id: 'slot-1',
    slotNumber: 1,
    timeRange: '08:00 - 10:00',
    startHour: '08:00',
    endHour: '10:00',
    status: 'available',
    bufferAfter: '10:00 - 10:30 (Đệm 30p dọn phòng & reset đèn)',
  },
  {
    id: 'slot-2',
    slotNumber: 2,
    timeRange: '10:30 - 12:30',
    startHour: '10:30',
    endHour: '12:30',
    status: 'booked',
    bufferAfter: '12:30 - 13:00 (Đệm 30p dọn phòng & reset đèn)',
  },
  {
    id: 'slot-3',
    slotNumber: 3,
    timeRange: '13:00 - 15:00',
    startHour: '13:00',
    endHour: '15:00',
    status: 'available',
    bufferAfter: '15:00 - 15:30 (Đệm 30p dọn phòng & reset đèn)',
  },
  {
    id: 'slot-4',
    slotNumber: 4,
    timeRange: '15:30 - 17:30',
    startHour: '15:30',
    endHour: '17:30',
    status: 'available',
    bufferAfter: '17:30 - 18:00 (Đệm 30p dọn phòng & reset đèn)',
  },
  {
    id: 'slot-5',
    slotNumber: 5,
    timeRange: '18:00 - 20:00',
    startHour: '18:00',
    endHour: '20:00',
    status: 'booked',
    bufferAfter: '20:00 - 20:30 (Đệm 30p dọn phòng & reset đèn)',
  },
  {
    id: 'slot-6',
    slotNumber: 6,
    timeRange: '20:30 - 22:30',
    startHour: '20:30',
    endHour: '22:30',
    status: 'available',
    bufferAfter: '22:30 - 23:00 (Đệm 30p đóng cửa studio)',
  },
];

// ---------------- SAMPLE ADD-ON EQUIPMENTS ----------------
export const SAMPLE_EQUIPMENTS: Equipment[] = [
  {
    id: 'eq-godox-sl200',
    name: 'Đèn Continuous Godox SL200III (5600K)',
    category: 'lighting',
    categoryLabel: 'Hệ thống Ánh sáng',
    brand: 'Godox',
    pricePerSlot: 120000,
    maxStock: 6,
    availableStock: 4,
    unit: 'cây / ca',
    image: 'https://images.unsplash.com/photo-1527011046414-4781f1f94f8c?auto=format&fit=crop&w=600&q=80',
    description: 'Đèn công suất 215W chuẩn CRI 96+, đi kèm chóa phản xạ và chân đèn lò xo chịu lực.',
  },
  {
    id: 'eq-softbox-octa',
    name: 'Softbox Bát Giác Octabox 120cm + Grid Lưới',
    category: 'modifier',
    categoryLabel: 'Tản sáng & Modifier',
    brand: 'Aputure / Godox',
    pricePerSlot: 50000,
    maxStock: 8,
    availableStock: 6,
    unit: 'chiếc / ca',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80',
    description: 'Kèm 2 lớp vải khuếch tán tản sáng mịn màng, ngàm Bowens tháo lắp nhanh dưới 1 phút.',
  },
  {
    id: 'eq-c-stand',
    name: 'Chân Đèn C-Stand Tay Boom Thép Không Gỉ 3.3m',
    category: 'lighting',
    categoryLabel: 'Hệ thống Ánh sáng',
    brand: 'Kupo',
    pricePerSlot: 40000,
    maxStock: 10,
    availableStock: 8,
    unit: 'cây / ca',
    image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80',
    description: 'Chân rùa C-stand hạng nặng chịu tải 15kg, kèm 2 túi cát đối trọng thăng bằng.',
  },
  {
    id: 'eq-paper-backdrop',
    name: 'Cuộn Phông Giấy Colorama 2.72m (Nhiều Màu)',
    category: 'backdrop',
    categoryLabel: 'Phông nền & Backdrop',
    brand: 'Colorama UK',
    pricePerSlot: 150000,
    maxStock: 12,
    availableStock: 9,
    unit: 'cuộn / ca',
    image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=600&q=80',
    description: 'Tùy chọn màu Pastel Beige, Pastel Pink, Chroma Green, Storm Grey, Super White.',
  },
  {
    id: 'eq-vintage-chair',
    name: 'Ghế Armchair Wassily Concept Marcel Breuer',
    category: 'furniture',
    categoryLabel: 'Nội thất & Đạo cụ',
    brand: 'Bauhaus Iconic',
    pricePerSlot: 90000,
    maxStock: 3,
    availableStock: 2,
    unit: 'chiếc / ca',
    image: 'https://images.unsplash.com/photo-1580481077195-c3a821458327?auto=format&fit=crop&w=600&q=80',
    description: 'Khung thép mạ chrome sáng bóng, dây da bò đan chéo mang đậm chất nghệ thuật tối giản.',
  },
  {
    id: 'eq-smoke-machine',
    name: 'Máy Tạo Khói Haze Machine 1500W DMX',
    category: 'modifier',
    categoryLabel: 'Hiệu ứng trường quay',
    brand: 'Antari',
    pricePerSlot: 200000,
    maxStock: 2,
    availableStock: 1,
    unit: 'máy / ca',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80',
    description: 'Tạo khói mờ sương hạt mịn bắt tia sáng nghệ thuật, dung dịch khói y tế không mùi.',
  }
];

// ---------------- SAMPLE HOST BOOKING ORDERS ----------------
export const INITIAL_HOST_BOOKINGS: BookingOrder[] = [
  {
    id: 'bk-8821',
    bookingCode: 'STD-2026-8821',
    room: SAMPLE_ROOMS[0],
    selectedDate: '2026-10-06',
    selectedSlots: [SAMPLE_TIME_SLOTS[1]], // 10:30 - 12:30
    selectedEquipments: [
      { equipment: SAMPLE_EQUIPMENTS[0], quantity: 2 },
      { equipment: SAMPLE_EQUIPMENTS[1], quantity: 2 },
    ],
    customerName: 'Nguyễn Phương Thảo (Studio Lookbook)',
    customerPhone: '0903 124 567',
    customerEmail: 'phuongthao.lookbook@gmail.com',
    note: 'Chụp lookbook áo dài Tết cho nhãn hàng thời trang The Muse',
    roomCost: 650000,
    equipmentCost: 340000,
    cleaningFee: 0,
    subtotal: 990000,
    depositAmount: 297000,
    remainingAmount: 693000,
    paymentMethod: 'sandbox_qr',
    paymentStatus: 'paid',
    bookingStatus: 'pending', // Tiếp nhận
    createdAt: '2026-10-05 08:30:00',
  },
  {
    id: 'bk-8822',
    bookingCode: 'STD-2026-8822',
    room: SAMPLE_ROOMS[1],
    selectedDate: '2026-10-06',
    selectedSlots: [SAMPLE_TIME_SLOTS[0], SAMPLE_TIME_SLOTS[1]], // 08:00 - 12:30 (2 ca)
    selectedEquipments: [
      { equipment: SAMPLE_EQUIPMENTS[0], quantity: 4 },
      { equipment: SAMPLE_EQUIPMENTS[2], quantity: 4 },
      { equipment: SAMPLE_EQUIPMENTS[5], quantity: 1 },
    ],
    customerName: 'Đạo diễn Trần Minh Đức',
    customerPhone: '0918 899 001',
    customerEmail: 'duc.filmmaker@production.vn',
    note: 'Quay MV ca nhạc phân cảnh acoustic trong nhà',
    roomCost: 2100000,
    equipmentCost: 840000,
    cleaningFee: 100000,
    subtotal: 3040000,
    depositAmount: 912000,
    remainingAmount: 2128000,
    paymentMethod: 'sandbox_qr',
    paymentStatus: 'paid',
    bookingStatus: 'checked_in', // Đã check-in
    createdAt: '2026-10-04 14:15:00',
  },
  {
    id: 'bk-8823',
    bookingCode: 'STD-2026-8823',
    room: SAMPLE_ROOMS[2],
    selectedDate: '2026-10-05',
    selectedSlots: [SAMPLE_TIME_SLOTS[3]], // 15:30 - 17:30
    selectedEquipments: [
      { equipment: SAMPLE_EQUIPMENTS[4], quantity: 1 },
    ],
    customerName: 'Lê Hoàng Yến',
    customerPhone: '0977 445 123',
    customerEmail: 'yenle.interior@gmail.com',
    note: 'Chụp hình tạp chí phong cách sống Bắc Âu',
    roomCost: 520000,
    equipmentCost: 90000,
    cleaningFee: 0,
    subtotal: 610000,
    depositAmount: 183000,
    remainingAmount: 427000,
    paymentMethod: 'sandbox_qr',
    paymentStatus: 'paid',
    bookingStatus: 'completed', // Hoàn thành
    createdAt: '2026-10-03 10:20:00',
  },
  {
    id: 'bk-8824',
    bookingCode: 'STD-2026-8824',
    room: SAMPLE_ROOMS[3],
    selectedDate: '2026-10-04',
    selectedSlots: [SAMPLE_TIME_SLOTS[4]], // 18:00 - 20:00
    selectedEquipments: [],
    customerName: 'TechTalk Vietnam',
    customerPhone: '0932 789 456',
    customerEmail: 'producer@techtalk.vn',
    note: 'Livestream số ra mắt chuỗi podcast Khởi Nghiệp Công Nghệ',
    roomCost: 580000,
    equipmentCost: 0,
    cleaningFee: 0,
    subtotal: 580000,
    depositAmount: 174000,
    remainingAmount: 406000,
    paymentMethod: 'sandbox_qr',
    paymentStatus: 'paid',
    bookingStatus: 'deposit_refunded', // Đã kiểm tra hoàn cọc
    createdAt: '2026-10-02 16:45:00',
  }
];
