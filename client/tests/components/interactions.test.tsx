import React, { useState, useSyncExternalStore } from "react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NOW, serviceFixture, fixture } from "../fixtures/domain";
import type { StudioService } from "@/services/service";
import {
  RoomCard,
  SearchResults,
  AvailabilityCard,
  RoomDetail,
} from "@/features/marketplace/marketplace";
import {
  QuantitySelector,
  BookingWizard,
} from "@/features/booking/booking-wizard";
import { AuthPage } from "@/features/auth/auth-page";
import { AdminUserDetail } from "@/features/admin/admin-pages";
import { ConfirmDialog, StudioImage } from "@/components/shared/common";
import { DashboardShell } from "@/components/layout/dashboard-shell";
let instance: StudioService;
let query = "",
  route = "/studios";
const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => route,
  useSearchParams: () => new URLSearchParams(query),
}));
vi.mock("@/providers/app-provider", () => ({
  useApp: () => {
    const s = useSyncExternalStore(instance.subscribe, instance.getSnapshot);
    return {
      ...s,
      service: instance,
      user: s.db?.users.find((u) => u.id === s.userId) ?? null,
    };
  },
  useToast: () => vi.fn(),
  useMutation: () => async (fn: () => unknown) => {
    try {
      return { ok: true, value: await fn() };
    } catch {
      return { ok: false };
    }
  },
}));
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
  instance = serviceFixture().service;
  query = "";
  route = "/studios";
  router.push.mockReset();
  router.replace.mockReset();
});
describe("marketplace controls", () => {
  it("shows real metadata and rental units without fabricated ratings", () => {
    render(<RoomCard room={fixture().rooms[0]} />);
    expect(screen.getByText("250.000đ")).toBeVisible();
    expect(screen.getByText("/ giờ")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Phòng Nắng · Ánh sáng tự nhiên" }),
    ).toHaveAttribute("href", expect.stringContaining("/rooms/phong-nang"));
    expect(screen.queryByText(/đánh giá|lượt thuê/)).not.toBeInTheDocument();
  });
  it("applies URL filters, updates results and supports clearing", () => {
    const view = render(<SearchResults />);
    expect(document.querySelectorAll(".room-card")).toHaveLength(5);
    fireEvent.change(screen.getByLabelText("Số người", { exact: true }), {
      target: { value: "15" },
    });
    expect(router.replace).toHaveBeenCalledWith("/studios?capacity=15", {
      scroll: false,
    });
    query = "capacity=15";
    view.rerender(<SearchResults />);
    expect(document.querySelectorAll(".room-card")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Xóa tất cả" }));
    expect(router.replace).toHaveBeenLastCalledWith("/studios", {
      scroll: false,
    });
  });
  it("renders a meaningful empty result", () => {
    query = "location=Ha+Noi";
    render(<SearchResults />);
    expect(
      screen.getByRole("heading", { name: "Chưa tìm thấy không gian phù hợp" }),
    ).toBeVisible();
  });
  it("provides an image fallback", () => {
    render(<StudioImage src="/broken.jpg" alt="Phòng mẫu" />);
    fireEvent.error(screen.getByRole("img", { name: "Phòng mẫu" }));
    expect(screen.getByText("Chưa có ảnh")).toBeVisible();
  });
});
describe("booking form behavior", () => {
  it("mobile room pricing follows the actual starting rental unit", async () => {
    await instance.login("chu@studiohub.demo", "StudioHub123");
    const hourly = instance
      .getSnapshot()
      .db!.rates.find((rate) => rate.id === "rate-room-1-hour")!;
    instance.saveRate({ ...hourly, active: false });
    render(<RoomDetail slug="phong-nang" />);
    expect(document.querySelector(".mobile-booking-bar")).toHaveTextContent(
      "900.000đ/ buổi",
    );
  });
  it("incompatible rate periods explain their disabled choice", () => {
    const db = fixture();
    db.rates[0].effectiveTo = Date.parse("2026-10-12T00:00:00+07:00");
    render(<AvailabilityCard room={db.rooms[0]} db={db} />);
    fireEvent.change(screen.getByLabelText("Ngày bắt đầu"), {
      target: { value: "2026-10-19" },
    });
    fireEvent.change(screen.getByLabelText("Ngày kết thúc"), {
      target: { value: "2026-10-19" },
    });
    expect(
      screen.getByRole("option", { name: /Thuê theo giờ.*Ngoài kỳ áp dụng/ }),
    ).toBeDisabled();
  });
  it("availability requires an explicit check and invalidates the result after input changes", async () => {
    const db = instance.getSnapshot().db!;
    render(<AvailabilityCard room={db.rooms[0]} db={db} />);
    expect(
      screen.queryByRole("button", { name: "Đặt thuê Studio" }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ngày bắt đầu"), {
      target: { value: "2026-10-19" },
    });
    fireEvent.change(screen.getByLabelText("Ngày kết thúc"), {
      target: { value: "2026-10-19" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Kiểm tra lịch trống" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Thời gian này có thể đặt",
    );
    expect(
      screen.getByRole("button", { name: "Đặt thuê Studio" }),
    ).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Giờ bắt đầu"), {
      target: { value: "10:00" },
    });
    expect(
      screen.queryByRole("button", { name: "Đặt thuê Studio" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("limits equipment selectors and exposes descriptive names", async () => {
    const change = vi.fn();
    const view = render(
      <QuantitySelector
        name="Đèn"
        quantity={0}
        maximum={2}
        onChange={change}
      />,
    );
    expect(screen.getByRole("button", { name: "Giảm Đèn" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Tăng Đèn" }));
    expect(change).toHaveBeenCalledWith(1);
    view.rerender(
      <QuantitySelector
        name="Đèn"
        quantity={2}
        maximum={2}
        onChange={change}
      />,
    );
    expect(screen.getByRole("button", { name: "Tăng Đèn" })).toBeDisabled();
  });
  it("checks availability, disables future steps, restores focus and preserves login drafts", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    route = "/booking/phong-nang";
    render(<BookingWizard slug="phong-nang" />);
    expect(screen.getByRole("button", { name: "2 Thiết bị" })).toBeDisabled();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Tiếp tục" })[0],
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Thêm thiết bị & nội thất" }),
      ).toHaveFocus(),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Tăng Đèn LED Aputure 300d" }),
    );
    await userEvent.click(
      screen.getAllByRole("button", { name: "Tiếp tục" })[0],
    );
    expect(router.push).toHaveBeenCalledWith(
      "/login?returnTo=%2Fcheckout",
    );
    expect(instance.readDraft("phong-nang")).toMatchObject({
      step: 3,
      equipment: [{ id: "equipment-1", quantity: 1 }],
    });
  });
  it("uses inline validation and error associations on authentication", async () => {
    route = "/login";
    render(<AuthPage mode="login" />);
    await userEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Email", { exact: true })).toHaveAttribute(
        "aria-invalid",
        "true",
      ),
    );
    expect(screen.getByLabelText("Email", { exact: true })).toHaveAttribute(
      "aria-describedby",
      "auth-email-error",
    );
    expect(screen.getByRole("alert")).toBeVisible();
  });
  it("cancellation dialogs require a reason and preserve focus", async () => {
    const confirm = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Hủy đơn</button>
          <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            title="Hủy đơn thuê"
            description="Giải phóng phòng và thiết bị."
            requireReason
            onConfirm={confirm}
          />
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole("button", {
      name: "Hủy đơn",
    });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Vui lòng nhập lý do");
    await userEvent.type(
      screen.getByLabelText("Lý do", { exact: true }),
      "Kiểm tra lịch",
    );
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    await waitFor(() => expect(confirm).toHaveBeenCalledWith("Kiểm tra lịch"));
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
describe("administrator approval and role navigation", () => {
  it("approves the actual shared account after confirmation", async () => {
    route = "/admin/users/host-pending";
    await instance.login("admin@studiohub.demo", "StudioHub123");
    render(<AdminUserDetail id="host-pending" />);
    await userEvent.click(
      screen.getByRole("button", { name: "Duyệt Chủ Studio" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    await waitFor(() =>
      expect(
        instance.getSnapshot().db!.users.find((u) => u.id === "host-pending")
          ?.approval,
      ).toBe("approved"),
    );
    expect(instance.getSnapshot().db!.studios).toHaveLength(3);
  });
  it("shows host navigation with real pending counts and studio context", async () => {
    route = "/host";
    await instance.login("chu@studiohub.demo", "StudioHub123");
    render(
      <DashboardShell role="host">
        <h1>Nội dung mẫu</h1>
      </DashboardShell>,
    );
    expect(screen.getByRole("link", { name: "Đơn thuê 1" })).toHaveAttribute(
      "href",
      "/host/bookings",
    );
    expect(screen.getByLabelText("Studio đang xem")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /Duyệt Chủ Studio/ }),
    ).not.toBeInTheDocument();
  });
  it("uses separate admin navigation and no host studio switcher", async () => {
    route = "/admin";
    await instance.login("admin@studiohub.demo", "StudioHub123");
    render(
      <DashboardShell role="admin">
        <h1>Nội dung mẫu</h1>
      </DashboardShell>,
    );
    expect(
      screen.getByRole("link", { name: "Duyệt Chủ Studio 1" }),
    ).toHaveAttribute("href", "/admin/host-requests");
    expect(screen.queryByLabelText("Studio đang xem")).not.toBeInTheDocument();
  });
});
