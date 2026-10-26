import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState } from "../data/fixtures";
import {
  execute,
  validateSelection,
  overlaps,
  price,
  balance,
  HOUR,
  MIN,
  validatePolicy,
} from "./engine";
import type { Selection, State } from "./models";
function setup() {
  const s = initialState();
  s.sessionId = "customer";
  s.bookings = [];
  return s;
}
function selection(s: State, overrides: Partial<Selection> = {}): Selection {
  return {
    roomId: "a102",
    start: s.now + 5 * 24 * HOUR,
    end: s.now + 5 * 24 * HOUR + 2 * HOUR,
    participants: 3,
    plan: "hourly",
    equipment: {},
    ...overrides,
  };
}
function create(s = setup(), x = selection(s)) {
  return execute(s, { type: "create", selection: x });
}
function last(s: State) {
  return s.bookings.at(-1)!;
}
function paid(s = create()) {
  return execute(s, { type: "payment", id: last(s).id, outcome: "paid" });
}
function confirmed() {
  const s = paid();
  s.sessionId = "host";
  return execute(s, { type: "approve", id: last(s).id });
}
test("exact room A102 is reserved without assigning A101", () => {
  const s = create();
  assert.equal(last(s).roomId, "a102");
  assert.equal(last(s).status, "awaiting_payment");
  assert.equal(s.rooms.find((r) => r.id === "a101")!.id, "a101");
});
test("overlap and 30 minute buffer block a room; exact buffer end is free", () => {
  const s = create(),
    b = last(s);
  assert.match(
    validateSelection(
      s,
      selection(s, { start: b.start + HOUR, end: b.end + HOUR }),
    )!,
    /giữ/,
  );
  assert.equal(
    overlaps(b, { start: b.end + 29 * MIN, end: b.end + 2 * HOUR }),
    true,
  );
  assert.equal(
    overlaps(b, { start: b.end + 30 * MIN, end: b.end + 2 * HOUR }),
    false,
  );
});
test("buffer works in both directions", () => {
  assert.equal(
    overlaps({ start: 0, end: HOUR }, { start: -HOUR, end: -15 * MIN }),
    true,
  );
});
test("equipment inventory includes other rooms and buffer", () => {
  let s = setup();
  s = create(s, selection(s, { equipment: { light: 3 } }));
  assert.match(
    validateSelection(
      s,
      selection(s, { roomId: "a101", equipment: { light: 1 } }),
    )!,
    /không đủ/,
  );
});
test("sequential equipment reservations are not incorrectly summed", () => {
  let s = setup();
  const x = selection(s);
  s = create(s, {
    ...x,
    roomId: "a101",
    end: x.start + HOUR,
    equipment: { light: 2 },
  });
  s = create(s, {
    ...x,
    roomId: "b101",
    start: x.start + 2 * HOUR,
    end: x.start + 3 * HOUR,
    equipment: { light: 2 },
  });
  assert.equal(
    validateSelection(s, {
      ...x,
      roomId: "a102",
      end: x.start + 4 * HOUR,
      equipment: { light: 1 },
    }),
    null,
  );
});
test("payment window 3h requires at least 27h lead; capacity and package validated", () => {
  const s = setup();
  assert.match(
    validateSelection(
      s,
      selection(s, { start: s.now + 26 * HOUR, end: s.now + 28 * HOUR }),
    )!,
    /24 giờ/,
  );
  assert.equal(
    validateSelection(
      s,
      selection(s, { start: s.now + 27 * HOUR, end: s.now + 29 * HOUR }),
    ),
    null,
  );
  assert.match(
    validateSelection(s, selection(s, { participants: 99 }))!,
    /Số người/,
  );
  assert.match(
    validateSelection(s, selection(s, { plan: "combo3" }))!,
    /Thời lượng/,
  );
});
test("deposit calculation uses room and equipment hours in integer VND", () => {
  const s = setup(),
    x = selection(s, { equipment: { light: 2 } });
  assert.equal(price(s, x), 1020000);
  const b = last(create(s, x));
  assert.equal(b.deposit, 306000);
});
test("expired unpaid hold releases room and adds exactly one strike", () => {
  let s = create();
  const x = selection(s);
  s = execute(s, { type: "advance", minutes: 180 });
  assert.equal(last(s).status, "expired");
  assert.equal(s.users[0].strikes.length, 1);
  s = execute(s, { type: "advance", minutes: 1 });
  assert.equal(s.users[0].strikes.length, 1);
  assert.equal(validateSelection(s, x), null);
  assert.equal(s.audit.at(-1)!.actorId, "system");
});
test("failure retry before deadline succeeds; paid deposit becomes pending", () => {
  let s = create();
  s = execute(s, { type: "payment", id: last(s).id, outcome: "failed" });
  assert.equal(last(s).payment, "failed");
  s = paid(s);
  assert.equal(last(s).status, "pending");
  assert.equal(last(s).paymentAttempts.length, 2);
  assert.throws(() => paid(s));
});
test("verified payment failure expiration does not add strike", () => {
  let s = create();
  s = execute(s, { type: "payment", id: last(s).id, outcome: "failed" });
  s = execute(s, { type: "advance", minutes: 181 });
  assert.equal(s.users[0].strikes.length, 0);
});
test("processing begun before deadline succeeds within five minute grace", () => {
  let s = create();
  s = execute(s, { type: "advance", minutes: 179 });
  s = execute(s, { type: "payment", id: last(s).id, outcome: "processing" });
  s = execute(s, { type: "advance", minutes: 5 });
  assert.equal(last(s).status, "awaiting_payment");
  s = paid(s);
  assert.equal(last(s).status, "pending");
});
test("no new transaction after deadline; unresolved grace needs reconciliation without strike", () => {
  let s = create();
  s = execute(s, { type: "payment", id: last(s).id, outcome: "processing" });
  s = execute(s, { type: "advance", minutes: 185 });
  assert.equal(last(s).status, "expired");
  assert.equal(last(s).reconciliation, true);
  assert.equal(s.users[0].strikes.length, 0);
  assert.throws(() => paid(s));
});
test("late payment reconciliation refunds deposit without reclaiming room", () => {
  let s = create();
  s = execute(s, { type: "payment", id: last(s).id, outcome: "processing" });
  s = execute(s, { type: "advance", minutes: 185 });
  s.sessionId = "admin";
  s = execute(s, {
    type: "reconcile",
    id: last(s).id,
    paid: true,
    reason: "Đã xác minh tiền đến muộn",
  });
  assert.equal(last(s).status, "expired");
  assert.equal(last(s).refund.amount, last(s).deposit);
  assert.equal(last(s).refund.status, "pending");
});
test("Host has exactly two hours after deposit; timeout automatically refunds 100%", () => {
  let s = paid();
  s = execute(s, { type: "advance", minutes: 120 });
  const b = last(s);
  assert.equal(b.status, "cancelled");
  assert.equal(b.refund.status, "refunded");
  assert.equal(b.refund.amount, b.deposit);
  assert.equal(s.users[0].strikes.length, 0);
  s.sessionId = "host";
  assert.throws(() => execute(s, { type: "approve", id: b.id }));
});
test("Host rejection creates independent pending refund and requires reason", () => {
  let s = paid();
  s.sessionId = "host";
  assert.throws(() => execute(s, { type: "reject", id: last(s).id }));
  s = execute(s, { type: "reject", id: last(s).id, reason: "Sự cố phòng" });
  assert.equal(last(s).status, "cancelled");
  assert.equal(last(s).payment, "paid");
  assert.equal(last(s).refund.status, "pending");
});
test("verified refund failures cap at initial attempt plus two retries then escalate", () => {
  let s = paid();
  s.sessionId = "host";
  s = execute(s, { type: "reject", id: last(s).id, reason: "Sự cố" });
  s = execute(s, { type: "refund", id: last(s).id, outcome: "failed" });
  assert.equal(last(s).refund.escalated, true);
  assert.equal(last(s).refund.attempts.length, 3);
  assert.throws(() =>
    execute(s, { type: "refund", id: last(s).id, outcome: "refunded" }),
  );
  s.sessionId = "admin";
  s = execute(s, {
    type: "resolve_refund",
    id: last(s).id,
    reason: "Đối soát thủ công xác nhận đã hoàn",
  });
  assert.equal(last(s).refund.status, "refunded");
});
test("cancellation policy is snapshotted; paid cancellation adds no strike", () => {
  let s = confirmed();
  s.studios[0].policy.refundTiers = [{ hours: 24, percent: 0 }];
  s.sessionId = "customer";
  s = execute(s, { type: "cancel", id: last(s).id, reason: "Đổi kế hoạch" });
  assert.equal(last(s).refund.amount, last(s).deposit);
  assert.equal(s.users[0].strikes.length, 0);
});
test("three unpaid cancellations suspend booking but allow existing access; restoration keeps history", () => {
  let s = setup();
  for (let i = 0; i < 3; i++) {
    s = create(s);
    s = execute(s, { type: "cancel", id: last(s).id, reason: "Đổi kế hoạch" });
  }
  assert.equal(s.users[0].restricted, true);
  assert.throws(() => create(s));
  s = execute(s, { type: "login", userId: "customer" });
  assert.equal(s.sessionId, "customer");
  s.sessionId = "admin";
  s = execute(s, {
    type: "restore",
    userId: "customer",
    reason: "Đã xem xét yêu cầu",
  });
  assert.equal(s.users[0].strikes.filter((x) => x.active).length, 0);
  assert.equal(s.users[0].strikes.length, 3);
});
test("pending reschedule preserves old slot; rejection does not consume successful change", () => {
  let s = confirmed();
  const b = last(s),
    oldStart = b.start;
  s.sessionId = "customer";
  s = execute(s, {
    type: "change",
    id: b.id,
    selection: selection(s, { roomId: "b102" }),
  });
  assert.equal(last(s).start, oldStart);
  assert.equal(last(s).roomId, "a102");
  s.sessionId = "host";
  s = execute(s, { type: "reject_change", id: b.id });
  s.sessionId = "customer";
  s = execute(s, {
    type: "change",
    id: b.id,
    selection: selection(s, { roomId: "b102" }),
  });
  assert.equal(last(s).changes.at(-1)!.status, "pending");
});
test("one successful reschedule preserves deposit and updates balance; second disallowed", () => {
  let s = confirmed();
  const dep = last(s).deposit,
    id = last(s).id;
  s.sessionId = "customer";
  s = execute(s, {
    type: "change",
    id,
    selection: selection(s, { roomId: "b102" }),
  });
  s.sessionId = "host";
  s = execute(s, { type: "approve_change", id });
  assert.equal(last(s).deposit, dep);
  assert.equal(last(s).total, 900000);
  assert.equal(balance(last(s)), 900000 - dep);
  s.sessionId = "customer";
  assert.throws(() =>
    execute(s, { type: "change", id, selection: selection(s) }),
  );
});
test("change to a total below deposit creates excess-deposit refund", () => {
  let s = confirmed();
  const dep = last(s).deposit,
    id = last(s).id;
  s.rooms.find((r) => r.id === "b102")!.rateOverride = 50000;
  s.sessionId = "customer";
  s = execute(s, {
    type: "change",
    id,
    selection: selection(s, { roomId: "b102" }),
  });
  s.sessionId = "host";
  s = execute(s, { type: "approve_change", id });
  assert.equal(last(s).deposit, dep);
  assert.equal(last(s).refund.amount, dep - 100000);
  assert.equal(last(s).refund.reason, "excess_deposit");
});
test("late check-in preserves end; checkout completes with outstanding debt", () => {
  let s = confirmed();
  const id = last(s).id,
    end = last(s).end;
  s = execute(s, {
    type: "advance",
    minutes: (last(s).start - s.now + 30 * MIN) / MIN,
  });
  s = execute(s, { type: "checkin", id });
  assert.equal(last(s).end, end);
  s = execute(s, { type: "advance", minutes: 30 });
  s = execute(s, { type: "checkout", id });
  assert.equal(last(s).status, "completed");
  assert.ok(balance(last(s)) > 0);
});
test("confirmed booking becomes no-show at end without new strike or refund", () => {
  let s = confirmed();
  s = execute(s, { type: "advance", minutes: (last(s).end - s.now) / MIN });
  assert.equal(last(s).status, "no_show");
  assert.equal(s.users[0].strikes.length, 0);
  assert.equal(last(s).refund.status, "not_required");
});
test("31 minutes overtime rounds to two blocks and upcoming conflict is audited without moving booking", () => {
  let s = confirmed();
  const id = last(s).id,
    start = last(s).start,
    end = last(s).end;
  s.bookings.push({
    ...structuredClone(last(s)),
    id: "NEXT",
    start: end + 30 * MIN,
    end: end + 2 * HOUR,
  });
  s = execute(s, { type: "advance", minutes: (start - s.now) / MIN });
  s = execute(s, { type: "checkin", id });
  s = execute(s, { type: "advance", minutes: (end + 31 * MIN - s.now) / MIN });
  s = execute(s, { type: "checkout", id });
  assert.equal(s.bookings[0].overtime, 300000);
  assert.ok(s.audit.some((e) => e.action === "overtime.conflict"));
  assert.equal(s.bookings[1].start, end + 30 * MIN);
});
test("partial collections cannot overpay or record a duplicate transaction", () => {
  let s = confirmed();
  const id = last(s).id;
  s = execute(s, { type: "advance", minutes: (last(s).start - s.now) / MIN });
  s = execute(s, { type: "checkin", id });
  const command = {
    type: "collect" as const,
    id,
    amount: 100000,
    method: "cash" as const,
    collectionId: "receipt-1",
  };
  const old = balance(last(s));
  s = execute(s, command);
  assert.equal(balance(last(s)), old - 100000);
  assert.throws(() => execute(s, command));
  assert.throws(() =>
    execute(s, { ...command, collectionId: "receipt-2", amount: old }),
  );
});
test("Admin exception requires reason and cannot cancel after start or edit Host rates", () => {
  let s = confirmed();
  const id = last(s).id;
  s.sessionId = "admin";
  assert.throws(() => execute(s, { type: "admin_cancel", id }));
  assert.throws(() =>
    execute(s, {
      type: "rate",
      id: "daylight",
      hourlyRate: 1,
      plans: ["hourly"],
    }),
  );
  const cancelled = execute(s, {
    type: "admin_cancel",
    id,
    reason: "Sự cố không thuộc khách",
  });
  assert.equal(last(cancelled).refund.amount, last(s).deposit);
  s = execute(s, { type: "advance", minutes: (last(s).start - s.now) / MIN });
  assert.throws(() =>
    execute(s, { type: "admin_cancel", id, reason: "Ngoại lệ" }),
  );
});
test("all critical mutations are audited and failed commands do not mutate input", () => {
  const s = create(),
    before = JSON.stringify(s);
  assert.throws(() =>
    execute(s, {
      type: "collect",
      id: last(s).id,
      amount: 1,
      method: "cash",
      collectionId: "x",
    }),
  );
  assert.equal(JSON.stringify(s), before);
  assert.ok(s.audit.some((e) => e.action === "booking.created"));
});
test("policy validation rejects invalid bounds and refund thresholds", () => {
  const p = setup().studios[0].policy;
  assert.throws(() => validatePolicy({ ...p, paymentMinutes: 14 }));
  assert.throws(() => validatePolicy({ ...p, cancelHours: 48 }));
  assert.throws(() =>
    validatePolicy({ ...p, refundTiers: [{ hours: 24, percent: 101 }] }),
  );
});
test("Host approval updates applicant role and notifies applicant", () => {
  let s = setup();
  s.sessionId = "admin";
  s = execute(s, {
    type: "review_application",
    id: "APP-001",
    approved: true,
    reason: "Thông tin hợp lệ",
  });
  assert.equal(s.users.find((u) => u.id === "applicant")!.role, "host");
  assert.ok(s.notifications.some((n) => n.userId === "applicant"));
});
test("customer registration validates unique email and creates own empty account", () => {
  const s = execute(setup(), {
    type: "register",
    name: "Khách mới",
    email: "new@example.test",
    phone: "0901111111",
  });
  assert.equal(s.users.at(-1)!.role, "customer");
  assert.equal(s.sessionId, s.users.at(-1)!.id);
  assert.throws(() =>
    execute(s, {
      type: "register",
      name: "Trùng",
      email: "new@example.test",
      phone: "0901111111",
    }),
  );
});
test("refund retries automatically recover after a verified failure", () => {
  let s = paid();
  s.sessionId = "host";
  s = execute(s, { type: "reject", id: last(s).id, reason: "Sự cố" });
  s = execute(s, {
    type: "refund",
    id: last(s).id,
    outcome: "failed",
    retryOutcomes: ["refunded"],
  });
  assert.equal(last(s).refund.status, "refunded");
  assert.equal(last(s).refund.attempts.length, 2);
});
test("equipment edits cannot reduce stock below buffered reservation peak", () => {
  let s = setup();
  s = create(s, selection(s, { equipment: { light: 3 } }));
  s.sessionId = "host";
  assert.throws(() =>
    execute(s, {
      type: "equipment_save",
      equipment: { ...s.equipment[0], quantity: 2 },
    }),
  );
});
test("restoration request is recorded, duplicate blocked and resolved by Admin", () => {
  let s = setup();
  s.users[0].restricted = true;
  s = execute(s, { type: "request_restore", reason: "Xin xét duyệt lại" });
  assert.equal(s.supportRequests?.length, 1);
  assert.throws(() =>
    execute(s, { type: "request_restore", reason: "Yêu cầu trùng" }),
  );
  s.sessionId = "admin";
  s = execute(s, {
    type: "restore",
    userId: "customer",
    reason: "Đã xét duyệt",
  });
  assert.equal(s.supportRequests![0].status, "resolved");
});
test("sample bookings use consistent room rates and deposit amounts", () => {
  const s = initialState();
  for (const b of s.bookings) {
    assert.equal(b.total, price(s, b));
    assert.equal(
      b.deposit,
      Math.round((b.total * b.policy.depositPercent) / 100),
    );
  }
});
