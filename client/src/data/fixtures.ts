import type { State, Booking, Status } from "@/domain/models";
import { HOUR, execute, roomRate } from "@/domain/engine";
export function initialState(): State {
  const now = new Date("2026-10-25T09:00:00+07:00").getTime();
  const s: State = {
    version: 1,
    now,
    sessionId: null,
    users: [
      {
        id: "customer",
        name: "Nguyễn Minh Anh",
        email: "minhanh@example.test",
        phone: "0901234567",
        role: "customer",
        locked: false,
        restricted: false,
        strikes: [],
      },
      {
        id: "host",
        name: "Trần Hoàng Nam",
        email: "host@example.test",
        phone: "0902345678",
        role: "host",
        locked: false,
        restricted: false,
        strikes: [],
      },
      {
        id: "admin",
        name: "Quản trị StudioHub",
        email: "admin@example.test",
        phone: "0903456789",
        role: "admin",
        locked: false,
        restricted: false,
        strikes: [],
      },
      {
        id: "applicant",
        name: "Lê Thanh Hà",
        email: "thanhha@example.test",
        phone: "0904567890",
        role: "customer",
        locked: false,
        restricted: false,
        strikes: [],
      },
    ],
    studios: [
      {
        id: "uit",
        hostId: "host",
        name: "UIT Studio Rooms",
        address: "25 Đường số 12, Thảo Điền, TP. Hồ Chí Minh",
        district: "Thảo Điền",
        description:
          "Một không gian dành cho những ý tưởng đang thành hình. Bốn loại phòng, tám không gian riêng biệt, cùng đội ngũ hỗ trợ tại chỗ.",
        active: true,
        policy: {
          paymentMinutes: 180,
          depositPercent: 30,
          cancelHours: 24,
          changeHours: 24,
          refundTiers: [
            { hours: 72, percent: 100 },
            { hours: 24, percent: 50 },
          ],
          overtimePerBlock: 150000,
          openHour: 8,
          closeHour: 22,
        },
      },
    ],
    types: [
      {
        id: "daylight",
        studioId: "uit",
        name: "Daylight Studio",
        category: "Chụp ảnh",
        hourlyRate: 350000,
        plans: ["hourly", "combo3", "combo5", "combo10"],
      },
      {
        id: "cyclorama",
        studioId: "uit",
        name: "White Cyclorama",
        category: "Quay phim",
        hourlyRate: 450000,
        plans: ["hourly", "session", "combo3", "combo5"],
      },
      {
        id: "loft",
        studioId: "uit",
        name: "Creative Loft",
        category: "Workshop",
        hourlyRate: 300000,
        plans: ["hourly", "session", "combo3", "combo5"],
      },
      {
        id: "sound",
        studioId: "uit",
        name: "Sound Room",
        category: "Thu âm",
        hourlyRate: 250000,
        plans: ["hourly", "combo3", "combo5"],
      },
    ],
    rooms: [],
    equipment: [
      {
        id: "light",
        studioId: "uit",
        name: "Đèn LED Aputure 300D",
        description: "Nguồn sáng bổ sung cho chụp ảnh và quay video.",
        category: "Ánh sáng",
        quantity: 3,
        hourlyRate: 80000,
        active: true,
        image: "/images/cyclorama.jpg",
      },
      {
        id: "softbox",
        studioId: "uit",
        name: "Softbox Light Dome II",
        description: "Phụ kiện tán và làm mềm ánh sáng từ đèn.",
        category: "Phụ kiện",
        quantity: 4,
        hourlyRate: 30000,
        active: true,
        image: "/images/daylight.jpg",
      },
      {
        id: "mic",
        studioId: "uit",
        name: "Micro thu âm condenser",
        description: "Thu giọng nói và âm thanh cho nội dung ghi âm.",
        category: "Âm thanh",
        quantity: 2,
        hourlyRate: 50000,
        active: true,
        image: "/images/sound.jpg",
      },
    ],
    bookings: [],
    applications: [
      {
        id: "APP-001",
        userId: "applicant",
        studioName: "Nắng Studio",
        address: "Bình Thạnh, TP. Hồ Chí Minh",
        description:
          "Studio ánh sáng tự nhiên, phòng chụp ảnh và không gian sáng tạo.",
        status: "pending",
      },
    ],
    audit: [],
    notifications: [],
  };
  const names = [
    "Ánh sáng tự nhiên, cảm hứng bất tận",
    "Một phông nền. Mọi khả năng.",
    "Không gian mở cho ý tưởng lớn",
    "Để âm thanh kể câu chuyện",
  ];
  s.rooms = s.types.flatMap((t, i) =>
    [0, 1].map((j) => ({
      id: `${String.fromCharCode(97 + i)}10${j + 1}`,
      typeId: t.id,
      code: `${String.fromCharCode(65 + i)}10${j + 1}`,
      name: t.name,
      floor: `Tầng ${i + 1} · ${j === 0 ? "Hướng Đông" : "Hướng Tây"}`,
      area: [65, 90, 75, 35][i] + j * 5,
      capacity: [12, 18, 20, 6][i],
      feature:
        j === 0
          ? [
              "Nắng sớm qua cửa sổ lớn",
              "Phông vô cực trắng 6m",
              "Trần cao, không gian mở",
              "Cách âm hai lớp",
            ][i]
          : [
              "Nắng chiều, cửa sổ góc",
              "Phông rộng, lối vào riêng",
              "Góc bếp, bàn làm việc lớn",
              "Buồng vocal độc lập",
            ][i],
      amenities: [
        "Wi-Fi",
        "Điều hòa",
        ...(i === 3 ? ["Cách âm"] : ["Ánh sáng tự nhiên"]),
        "Phòng thay đồ",
      ],
      included:
        i === 3
          ? ["Bàn mixer", "Tai nghe kiểm âm"]
          : ["Giá treo phông", "Gương toàn thân", "Bàn trang điểm"],
      images: [
        `/images/${t.id}${j === 1 ? "-2" : ""}.jpg`,
        `/images/${t.id}${j === 0 ? "-2" : ""}.jpg`,
        `/images/${t.id}${j === 1 ? "-2" : ""}.jpg`,
      ],
      active: true,
      description: names[i],
    })),
  );
  const sample = (
    id: string,
    roomId: string,
    status: Status,
    start: number,
    end: number,
  ): Booking => ({
    id,
    roomId,
    status,
    start,
    end,
    participants: 4,
    plan: "hourly",
    equipment: {},
    customerId: "customer",
    createdAt: now - 5 * HOUR,
    deadline: now - 2 * HOUR,
    policy: structuredClone(s.studios[0].policy),
    total: (roomRate(s, roomId) * (end - start)) / HOUR,
    deposit: Math.round(((roomRate(s, roomId) * (end - start)) / HOUR) * 0.3),
    payment: "paid",
    paidAt: now - HOUR,
    paymentAttempts: [{ id: `PAY-${id}`, at: now - HOUR, status: "paid" }],
    reconciliation: false,
    refund: {
      status: "not_required",
      amount: 0,
      reason: "",
      attempts: [],
      escalated: false,
    },
    collections: [],
    overtime: 0,
    changes: [],
    history: [
      { at: now - 5 * HOUR, text: "Đơn minh họa đã tạo" },
      { at: now - HOUR, text: "Cọc minh họa đã ghi nhận" },
    ],
  });
  s.bookings = [
    sample("SH-1025-01", "a101", "confirmed", now + HOUR, now + 3 * HOUR),
    sample(
      "SH-1027-02",
      "b101",
      "pending",
      now + 2 * 24 * HOUR,
      now + 2 * 24 * HOUR + 2 * HOUR,
    ),
    sample(
      "SH-1028-03",
      "c102",
      "confirmed",
      now + 3 * 24 * HOUR,
      now + 3 * 24 * HOUR + 2 * HOUR,
    ),
    sample("SH-1024-04", "d101", "completed", now - 24 * HOUR, now - 22 * HOUR),
  ];
  s.bookings[3].actualIn = now - 24 * HOUR;
  s.bookings[3].actualOut = now - 22 * HOUR;
  s.bookings[3].collections = [
    {
      id: "COL-001",
      at: now - 22 * HOUR,
      amount: 200000,
      method: "cash",
      actorId: "host",
    },
  ];
  return s;
}
export const demoScenarios = {
  hold: "Giữ chỗ chờ cọc",
  processing: "Giao dịch cần đối soát",
  approval: "Host chờ xác nhận",
  checkout: "Ca đang sử dụng",
  refund: "Hoàn cọc cần xử lý",
  restricted: "Tài khoản tạm ngưng",
};
export type DemoScenario = keyof typeof demoScenarios;
export function scenarioState(name: DemoScenario): State {
  let s = initialState();
  s.bookings = [];
  s.sessionId = "customer";
  const selection = {
    roomId: "a102",
    start: s.now + 3 * 24 * HOUR,
    end: s.now + 3 * 24 * HOUR + 2 * HOUR,
    participants: 3,
    plan: "hourly" as const,
    equipment: { light: 1 },
  };
  if (name === "restricted") {
    for (let i = 0; i < 3; i++) {
      s = execute(s, { type: "create", selection });
      s = execute(s, {
        type: "cancel",
        id: s.bookings.at(-1)!.id,
        reason: "Hủy chưa cọc · tình huống minh họa",
      });
    }
    return s;
  }
  s = execute(s, { type: "create", selection });
  const id = s.bookings.at(-1)!.id;
  if (name === "hold") return s;
  if (name === "processing") {
    s = execute(s, { type: "payment", id, outcome: "processing" });
    return execute(s, { type: "advance", minutes: 185 });
  }
  s = execute(s, { type: "payment", id, outcome: "paid" });
  s.sessionId = "host";
  if (name === "approval") return s;
  if (name === "refund")
    return execute(s, {
      type: "reject",
      id,
      reason: "Studio không thể phục vụ · minh họa",
    });
  s = execute(s, { type: "approve", id });
  s = execute(s, {
    type: "advance",
    minutes: (selection.start - s.now) / 60000,
  });
  return execute(s, { type: "checkin", id });
}
