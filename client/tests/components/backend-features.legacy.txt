import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuantitySelector, BackendBookingWizard } from "@/features/booking/backend-booking";
import { BackendHostOverview } from "@/features/host/backend-host";
import * as apiClient from "@/services/api/client";

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/rooms/1/book",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/providers/app-provider", () => ({
  useApp: () => ({
    user: {
      id: "4",
      name: "Trần Thị Thu Thảo",
      email: "customer@studio.local",
      phone: "0987654321",
      role: "customer",
    },
  }),
  useToast: () => vi.fn(),
}));

describe("Backend Booking Wizard & Host Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders QuantitySelector and triggers increment/decrement correctly", () => {
    const handleChange = vi.fn();
    render(
      <QuantitySelector
        name="Đèn Godox"
        quantity={2}
        maximum={5}
        onChange={handleChange}
      />
    );

    const minusBtn = screen.getByRole("button", { name: /giảm đèn godox/i });
    const plusBtn = screen.getByRole("button", { name: /tăng đèn godox/i });

    expect(screen.getByText("2")).toBeInTheDocument();

    fireEvent.click(minusBtn);
    expect(handleChange).toHaveBeenCalledWith(1);

    fireEvent.click(plusBtn);
    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it("renders BackendBookingWizard with loaded room data and availability preview", async () => {
    const mockRoom = {
      room_id: 1,
      studio_id: 1,
      name: "Artemis Cyclorama",
      description: "Phòng phông vô cực trắng",
      area: 80,
      capacity: 15,
      rules: "Không mang giày bẩn",
      studio: { name: "Artemis Studio", address: "142 NTMK", district: "Q3", city: "TP.HCM" },
      thumbnail_url: null,
      images: [],
      rates: [
        { rate_id: 1, rate_unit: "hour", unit_minutes: 60, unit_price: 350000, minimum_units: 2, maximum_units: 8 },
      ],
    };

    const mockAvail = {
      available: true,
      room: { room_id: 1, name: "Artemis Cyclorama", capacity: 15 },
      start_time: "2026-10-25 09:00:00",
      end_time: "2026-10-25 11:00:00",
      busy_start: "2026-10-25 09:00:00",
      busy_end: "2026-10-25 11:30:00",
      pricing: {
        booking_type: "short_term",
        rate_unit: "hour",
        rental_units: 2,
        room_unit_price: 350000,
        room_amount: 700000,
        equipment_amount: 0,
        total_amount: 700000,
        deposit_amount: 210000,
        equipments: [],
      },
    };

    vi.spyOn(apiClient, "apiRequest").mockImplementation(async (path: string) => {
      if (path.includes("/api/rooms/1/calendar")) {
        return { room_id: 1, from: "2026-10-01", to: "2026-11-01", busy_slots: [] } as unknown as never;
      }
      if (path.includes("/api/equipments")) {
        return [] as unknown as never;
      }
      if (path === "/api/rooms/1") {
        return mockRoom as unknown as never;
      }
      if (path === "/api/bookings/check-availability") {
        return mockAvail as unknown as never;
      }
      return {} as unknown as never;
    });

    render(<BackendBookingWizard id="1" />);

    expect(screen.getByText("Đang tải thông tin đặt phòng…")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("1. Chọn thời gian & Gói giá")).toBeInTheDocument();
    });

    expect(screen.getByText("Artemis Cyclorama — Artemis Studio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tiếp tục: chọn thiết bị/i })).toBeInTheDocument();
  });

  it("renders BackendHostOverview with host studios", async () => {
    const mockStudios = [
      {
        studio_id: 1,
        host_id: 2,
        name: "Artemis Hub",
        description: "Studio vô cực",
        address: "142 NTMK",
        district: "Quận 3",
        city: "TP. Hồ Chí Minh",
        phone: "0901234567",
        status: "active" as const,
        created_at: "2026-10-19 12:00:00",
        updated_at: "2026-10-19 12:00:00",
        total_rooms: 4,
        total_equipments: 5,
      },
    ];

    vi.spyOn(apiClient, "apiRequest").mockImplementation(async (path: string) => {
      if (path === "/api/studios/mine") return mockStudios as unknown as never;
      return [] as unknown as never;
    });

    render(<BackendHostOverview />);

    await waitFor(() => {
      expect(screen.getByText("Artemis Hub")).toBeInTheDocument();
    });

    expect(screen.getByText("Đang hoạt động")).toBeInTheDocument();
    expect(screen.getByText("142 NTMK, Quận 3, TP. Hồ Chí Minh")).toBeInTheDocument();
  });
});

