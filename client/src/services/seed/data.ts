import type {
  Booking,
  Database,
  DomainEvent,
  Room,
  User,
} from "@/domain/schema";
import { addDays, localDate, vietnamInstant } from "@/lib/format";
import { calculateBooking } from "@/domain/pricing";

export const demoPassword = "StudioHub123";
export const imageAssets = {
  daylight: "/images/daylight.jpg",
  loft: "/images/loft.jpg",
  podcast: "/images/podcast.jpg",
  equipment: "/images/equipment.jpg",
  corner: "/images/corner.jpg",
};
export function createSeed(now = Date.now()): Database {
  const day = localDate(now),
    at = (offset: number, hour = "09:00") =>
      vietnamInstant(addDays(day, offset), hour);
  const user = (
    id: string,
    name: string,
    email: string,
    role: User["role"],
    approval: User["approval"] = "approved",
    locked = false,
  ): User => ({
    id,
    name,
    email,
    role,
    approval,
    locked,
    phone: "0901234567",
    lockReason: locked ? "Tài khoản đang được kiểm tra thông tin demo." : "",
    avatar: "",
    createdAt: at(-30),
    approvedAt: approval === "approved" ? at(-28) : null,
    passwordHash: "",
    salt: "",
    demo: true,
  });
  const users = [
    user("customer-1", "Nguyễn Minh Anh", "khach@studiohub.demo", "customer"),
    user("host-1", "Trần Hoàng Nam", "chu@studiohub.demo", "host"),
    user("admin-1", "Lê Thu Hà", "admin@studiohub.demo", "admin"),
    user(
      "host-pending",
      "Phạm Bảo Ngọc",
      "choduyet@studiohub.demo",
      "host",
      "pending",
    ),
    user(
      "host-rejected",
      "Đỗ Gia Huy",
      "tuchoi@studiohub.demo",
      "host",
      "rejected",
    ),
    user(
      "customer-locked",
      "Vũ Thanh An",
      "bikhoa@studiohub.demo",
      "customer",
      "approved",
      true,
    ),
  ];
  const studio = (
    id: string,
    name: string,
    district: string,
    step: number,
    session: number,
    deposit: number,
  ) => ({
    id,
    name,
    ownerId: "host-1",
    city: "TP. Hồ Chí Minh",
    district,
    address: `28 đường số 3, ${district}, TP. Hồ Chí Minh`,
    phone: "0901234567",
    description:
      "Không gian làm việc cho những buổi chụp ảnh, quay phim và sáng tạo nội dung.",
    adminHidden: false,
    adminReason: "",
    stepMinutes: step,
    sessionMinutes: session,
    depositPercent: deposit,
    cancellationHours: 24,
    rules:
      "Giữ gìn thiết bị và không gian. Không hút thuốc trong phòng. Trao đổi với chủ studio trước khi thay đổi bố trí. Chính sách demo: hủy đơn đã xác nhận trước giờ thuê ít nhất 24 giờ; khoản cọc chờ xử lý theo chính sách, không hoàn tiền tự động.",
  });
  const studios = [
    studio("studio-1", "Nắng Studio", "Bình Thạnh", 30, 240, 30),
    studio("studio-2", "Mộc Creative Space", "Thảo Điền", 15, 180, 50),
    {
      ...studio("studio-3", "Góc Nhỏ Studio", "Quận 3", 30, 240, 30),
      adminHidden: true,
      adminReason: "Kiểm tra lại thông tin địa chỉ trong dữ liệu demo.",
    },
  ];
  const types = ["Chụp ảnh", "Quay phim", "Podcast", "Không gian sáng tạo"].map(
    (name, index) => ({
      id: `type-${index + 1}`,
      name,
      slug: ["chup-anh", "quay-phim", "podcast", "sang-tao"][index],
      hidden: false,
      order: index,
      image: [
        imageAssets.daylight,
        imageAssets.loft,
        imageAssets.podcast,
        imageAssets.corner,
      ][index],
    }),
  );
  const amenities = [
    "Ánh sáng tự nhiên",
    "Điều hòa",
    "Wi-Fi",
    "Phòng thay đồ",
    "Bãi đỗ xe",
    "Cách âm",
  ].map((name, index) => ({
    id: `amenity-${index + 1}`,
    name,
    slug: `tien-ich-${index + 1}`,
    hidden: false,
    order: index,
    image: "",
  }));
  const room = (
    id: string,
    studioId: string,
    name: string,
    slug: string,
    image: string,
    capacity: number,
    area: number,
    typeIds: string[],
    extras: Partial<Room> = {},
  ): Room => ({
    id,
    studioId,
    name,
    slug,
    code: `P${id.replace("room-", "").padStart(3, "0")}`,
    description:
      "Không gian thoáng, bố trí linh hoạt cho ê-kíp nhỏ. Phòng có khu vực chuẩn bị riêng và các tiện ích cơ bản. Hình ảnh và địa điểm phục vụ trải nghiệm demo.",
    area,
    capacity,
    typeIds,
    amenityIds: ["amenity-1", "amenity-2", "amenity-3", "amenity-4"],
    images: [
      image,
      imageAssets.corner,
      imageAssets.equipment,
      imageAssets.loft,
      imageAssets.daylight,
    ],
    status: "active",
    adminHidden: false,
    adminReason: "",
    openMinute: 480,
    closeMinute: 1320,
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    overnight: false,
    cleaningMinutes: 30,
    ...extras,
  });
  const rooms = [
    room(
      "room-1",
      "studio-1",
      "Phòng Nắng · Ánh sáng tự nhiên",
      "phong-nang",
      imageAssets.daylight,
      12,
      65,
      ["type-1", "type-2"],
    ),
    room(
      "room-2",
      "studio-1",
      "Phòng Trắng · Phông vô cực",
      "phong-trang",
      imageAssets.loft,
      18,
      90,
      ["type-1", "type-2"],
      { overnight: true, openMinute: 0, closeMinute: 1440 },
    ),
    room(
      "room-3",
      "studio-2",
      "Phòng Mộc · Không gian sáng tạo",
      "phong-moc",
      imageAssets.corner,
      10,
      48,
      ["type-1", "type-4"],
    ),
    room(
      "room-4",
      "studio-2",
      "Phòng Âm · Thu âm & Podcast",
      "phong-am",
      imageAssets.podcast,
      4,
      24,
      ["type-3"],
      { amenityIds: ["amenity-2", "amenity-3", "amenity-6"] },
    ),
    room(
      "room-5",
      "studio-2",
      "Gác Nhỏ · Chụp sản phẩm",
      "gac-nho",
      imageAssets.loft,
      6,
      32,
      ["type-1"],
      { status: "paused" },
    ),
    room(
      "room-6",
      "studio-1",
      "Phòng thử nghiệm",
      "phong-thu-nghiem",
      imageAssets.corner,
      8,
      40,
      ["type-4"],
      { status: "hidden" },
    ),
    room(
      "room-7",
      "studio-1",
      "Phòng đang kiểm tra",
      "phong-kiem-tra",
      imageAssets.daylight,
      8,
      40,
      ["type-1"],
      { adminHidden: true, adminReason: "Kiểm tra nội dung demo." },
    ),
    room(
      "room-8",
      "studio-3",
      "Phòng Góc Nhỏ",
      "phong-goc-nho",
      imageAssets.corner,
      8,
      40,
      ["type-1"],
    ),
  ];
  const rates = rooms.flatMap((room, index) => {
    const studio = studios.find((s) => s.id === room.studioId)!;
    const price = [
      250000, 350000, 220000, 180000, 160000, 200000, 200000, 150000,
    ][index];
    return [
      {
        id: `rate-${room.id}-hour`,
        roomId: room.id,
        name: "Thuê theo giờ",
        unit: "hour" as const,
        price,
        effectiveFrom: at(-365, "00:00"),
        effectiveTo: null,
        minUnits: 1,
        maxUnits: 72,
        active: true,
      },
      {
        id: `rate-${room.id}-session`,
        roomId: room.id,
        name: `Buổi ${studio.sessionMinutes / 60} giờ`,
        unit: "session" as const,
        price: Math.round(((price * studio.sessionMinutes) / 60) * 0.9),
        effectiveFrom: at(-365, "00:00"),
        effectiveTo: null,
        minUnits: 1,
        maxUnits: 3,
        active: true,
      },
      ...(room.overnight
        ? [
            {
              id: `rate-${room.id}-day`,
              roomId: room.id,
              name: "Thuê liên tục 24 giờ",
              unit: "day" as const,
              price: 2400000,
              effectiveFrom: at(-365, "00:00"),
              effectiveTo: null,
              minUnits: 1,
              maxUnits: 7,
              active: true,
            },
          ]
        : []),
      {
        id: `rate-${room.id}-week`,
        roomId: room.id,
        name: "Giá tham khảo theo tuần",
        unit: "week" as const,
        price: 9000000,
        effectiveFrom: at(-365, "00:00"),
        effectiveTo: null,
        minUnits: 1,
        maxUnits: 4,
        active: true,
      },
    ];
  });
  const equipment = [
    {
      id: "equipment-1",
      studioId: "studio-1",
      name: "Đèn LED Aputure 300d",
      category: "equipment" as const,
      quantity: 3,
      price: 80000,
      unit: "hour" as const,
      status: "available" as const,
      image: imageAssets.equipment,
    },
    {
      id: "equipment-2",
      studioId: "studio-1",
      name: "Bộ softbox 90 cm",
      category: "equipment" as const,
      quantity: 2,
      price: 120000,
      unit: "session" as const,
      status: "available" as const,
      image: imageAssets.equipment,
    },
    {
      id: "equipment-3",
      studioId: "studio-1",
      name: "Ghế gỗ & bàn nhỏ",
      category: "furniture" as const,
      quantity: 4,
      price: 60000,
      unit: "day" as const,
      status: "available" as const,
      image: imageAssets.corner,
    },
    {
      id: "equipment-4",
      studioId: "studio-1",
      name: "Đèn flash bảo trì",
      category: "equipment" as const,
      quantity: 1,
      price: 50000,
      unit: "hour" as const,
      status: "maintenance" as const,
      image: imageAssets.equipment,
    },
  ];
  const db: Database = {
    schemaVersion: 2,
    revision: "seed",
    initializedAt: now,
    users,
    studios,
    rooms,
    types,
    amenities,
    rates,
    equipment,
    applications: [
      {
        id: "app-pending",
        userId: "host-pending",
        studioName: "Ngọc Studio",
        description: "Studio chụp ảnh sản phẩm và chân dung tại Quận 7.",
        submittedAt: at(-2),
        reason: "",
        history: [{ at: at(-2), action: "Đã gửi hồ sơ", reason: "" }],
      },
      {
        id: "app-rejected",
        userId: "host-rejected",
        studioName: "Huy Creative",
        description: "Không gian cho quay phim và sáng tạo nội dung.",
        submittedAt: at(-5),
        reason: "Vui lòng bổ sung mô tả studio và số điện thoại liên hệ.",
        history: [
          { at: at(-5), action: "Đã gửi hồ sơ", reason: "" },
          {
            at: at(-3),
            action: "Từ chối hồ sơ",
            reason: "Vui lòng bổ sung mô tả studio và số điện thoại liên hệ.",
          },
        ],
      },
    ],
    bookings: [],
    payments: [],
    audit: [],
  };
  const states: {
    status: Booking["orderStatus"];
    payment: Booking["paymentStatus"];
    offset: number;
    hour: string;
    roomIndex: number;
  }[] = [
    {
      status: "pending",
      payment: "pending",
      offset: 2,
      hour: "09:00",
      roomIndex: 0,
    },
    {
      status: "pending",
      payment: "failed",
      offset: 3,
      hour: "09:00",
      roomIndex: 0,
    },
    {
      status: "pending",
      payment: "success",
      offset: 1,
      hour: "13:00",
      roomIndex: 0,
    },
    {
      status: "confirmed",
      payment: "success",
      offset: 4,
      hour: "09:00",
      roomIndex: 0,
    },
    {
      status: "confirmed",
      payment: "success",
      offset: -1,
      hour: "09:00",
      roomIndex: 1,
    },
    {
      status: "completed",
      payment: "success",
      offset: -7,
      hour: "09:00",
      roomIndex: 0,
    },
    {
      status: "completed",
      payment: "success",
      offset: -3,
      hour: "13:00",
      roomIndex: 2,
    },
    {
      status: "rejected",
      payment: "success",
      offset: 5,
      hour: "09:00",
      roomIndex: 1,
    },
    {
      status: "cancelled",
      payment: "success",
      offset: 6,
      hour: "09:00",
      roomIndex: 2,
    },
    {
      status: "expired",
      payment: "pending",
      offset: 7,
      hour: "09:00",
      roomIndex: 0,
    },
    {
      status: "confirmed",
      payment: "success",
      offset: 2,
      hour: "13:00",
      roomIndex: 7,
    },
    {
      status: "confirmed",
      payment: "success",
      offset: 4,
      hour: "11:30",
      roomIndex: 0,
    },
  ];
  states.forEach((s, index) => {
    const room = rooms[s.roomIndex],
      studio = studios.find((t) => t.id === room.studioId)!,
      rate = rates.find((r) => r.roomId === room.id && r.unit === "hour")!;
    const start = at(s.offset, s.hour),
      end = start + 2 * 3_600_000,
      code = `SH-DEMO-${String(index + 1).padStart(3, "0")}`;
    const price = calculateBooking({
      start,
      end,
      rate,
      studio,
      equipment,
      selections:
        room.studioId === "studio-1" && index === 2
          ? [{ id: "equipment-1", quantity: 1 }]
          : [],
    });
    const creationAt = Math.min(now - 300_000, start - 86_400_000);
    const event = (
      action: string,
      at: number,
      actorId = "customer-1",
      reason = "",
    ): DomainEvent => {
      const actor = users.find((u) => u.id === actorId)!;
      return {
        id: `event-seed-${index}-${action}`,
        at,
        actorId,
        actorName: actor.name,
        role: actor.role,
        action,
        entityType: "booking",
        entityId: code,
        summary: action,
        reason,
        previous: "",
        next: s.status,
      };
    };
    const timeline = [event("Đã tạo đơn thuê", creationAt)];
    if (s.payment === "success")
      timeline.push(event("Đã đặt cọc mô phỏng", creationAt + 60_000));
    if (s.payment === "failed")
      timeline.push(event("Thanh toán mô phỏng thất bại", now - 120_000));
    if (s.status === "confirmed" || s.status === "completed")
      timeline.push(
        event("Chủ studio xác nhận", creationAt + 120_000, "host-1"),
      );
    if (s.status === "completed")
      timeline.push(event("Chủ studio hoàn thành", end + 60_000, "host-1"));
    if (s.status === "rejected")
      timeline.push(
        event(
          "Chủ studio từ chối",
          creationAt + 120_000,
          "host-1",
          "Phòng cần bảo trì.",
        ),
      );
    if (s.status === "cancelled")
      timeline.push(event("Khách hủy đơn", creationAt + 120_000, "customer-1"));
    if (s.status === "expired")
      timeline.push(event("Hết hạn giữ chỗ", creationAt + 900_000));
    const booking: Booking = {
      id: `booking-${index + 1}`,
      code,
      customerId: "customer-1",
      ownerId: studio.ownerId,
      studioId: studio.id,
      roomId: room.id,
      start,
      end,
      createdAt: creationAt,
      holdUntil: s.status === "expired" ? now - 1 : now + 900_000,
      participants: 2,
      orderStatus: s.status,
      paymentStatus: s.payment,
      depositPaid: s.payment === "success" ? price.deposit : 0,
      refundStatus:
        ["rejected", "cancelled"].includes(s.status) && s.payment === "success"
          ? "pending-policy"
          : "none",
      notes: "Đơn mẫu để trải nghiệm quy trình.",
      contact: {
        name: users[0].name,
        email: users[0].email,
        phone: users[0].phone,
      },
      snapshot: {
        roomName: room.name,
        studioName: studio.name,
        slug: room.slug,
        image: room.images[0],
        address: studio.address,
        rules: studio.rules,
        cleaningMinutes: room.cleaningMinutes,
        cancellationHours: studio.cancellationHours,
        price,
      },
      timeline,
    };
    db.bookings.push(booking);
    if (s.payment !== "pending")
      db.payments.push({
        id: `payment-seed-${index}`,
        bookingId: booking.id,
        at: creationAt + 60_000,
        amount: price.deposit,
        status: s.payment as "success" | "failed",
      });
    db.audit.push(...timeline.filter((e) => e.actorId === "host-1"));
  });
  db.audit.push({
    id: "admin-hide-seed",
    at: at(-1),
    actorId: "admin-1",
    actorName: users[2].name,
    role: "admin",
    action: "Admin ẩn studio",
    entityType: "studio",
    entityId: "studio-3",
    summary: "Ẩn Góc Nhỏ Studio",
    reason: studios[2].adminReason,
    previous: "visible",
    next: "hidden",
  });
  return db;
}
