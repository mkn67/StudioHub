"use client";
import Link from "next/link";
import { useId, type ReactElement } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/providers/app-provider";
import { useStudio, HostScope } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { ChartContainer } from "@/components/ui/chart";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  EmptyState,
  PageHeading,
  StatusBadge,
} from "@/components/shared/common";
import { DataTable } from "@/components/data-table/table";
import {
  BookingList,
  BookingDetail,
} from "@/features/customer-bookings/bookings";
import { displayStatus, occupies, statusLabels } from "@/domain/booking";
import { statistics, utilization } from "@/domain/statistics";
import { overlaps } from "@/domain/availability";
import {
  addDays,
  dateTime,
  localDate,
  money,
  shortDate,
  time,
  vietnamInstant,
  vietnamWeekday,
} from "@/lib/format";
import { useUrlState } from "@/hooks/use-url-state";
import type { Booking } from "@/domain/schema";
export function HostOverview() {
  const { db, user, now } = useApp(),
    { studioId } = useStudio();
  if (!db || !user) return null;
  const ownStudios = db.studios.filter((s) => s.ownerId === user.id);
  if (!ownStudios.length)
    return (
      <>
        <PageHeading title="Tổng quan Studio" />
        <EmptyState
          title="Studio đầu tiên của bạn"
          description="Tài khoản đã được duyệt. Tạo địa điểm trước khi thêm phòng và bảng giá."
          href="/host/studio/settings?new=1"
          action="Tạo Studio đầu tiên"
        />
      </>
    );
  const bookings = db.bookings.filter(
      (b) =>
        b.ownerId === user.id &&
        (studioId === "all" || b.studioId === studioId),
    ),
    pending = bookings.filter(
      (b) => displayStatus(b, now) === "pending-confirmation",
    ),
    today = localDate(now),
    monthStart = vietnamInstant(today.slice(0, 7) + "-01"),
    value = statistics(
      bookings,
      monthStart,
      vietnamInstant(addDays(today, 1)),
    ).completed,
    queue = bookings
      .filter(
        (b) =>
          displayStatus(b, now) === "pending-confirmation" ||
          (b.orderStatus === "confirmed" && b.end < now),
      )
      .sort((a, b) => a.start - b.start)
      .slice(0, 5),
    upcoming = bookings
      .filter(
        (b) =>
          occupies(b, now) &&
          b.start >= vietnamInstant(today) &&
          b.start < vietnamInstant(addDays(today, 7)),
      )
      .sort((a, b) => a.start - b.start);
  return (
    <>
      <PageHeading
        eyebrow="KHÔNG GIAN & CÔNG VIỆC"
        title="Tổng quan Studio"
        description="Những việc cần xử lý và lịch thuê sắp tới."
      />
      <div className="kpi-grid">
        {[
          { label: "Chờ xác nhận", value: pending.length },
          {
            label: "Buổi thuê hôm nay",
            value: bookings.filter(
              (b) =>
                ["confirmed", "completed"].includes(b.orderStatus) &&
                overlaps(
                  vietnamInstant(today),
                  vietnamInstant(addDays(today, 1)),
                  b.start,
                  b.end,
                ),
            ).length,
          },
          {
            label: "Đã xác nhận sắp tới",
            value: bookings.filter(
              (b) => b.orderStatus === "confirmed" && b.start > now,
            ).length,
          },
          { label: "Giá trị đơn hoàn thành tháng này", value: money(value) },
        ].map((k) => (
          <div key={k.label}>
            <span>{k.label}</span>
            <strong>{k.value}</strong>
          </div>
        ))}
      </div>
      <section className="dashboard-section">
        <div className="section-heading">
          <h2>Cần bạn xử lý</h2>
          <Link className="text-link" href="/host/bookings">
            Xem đơn thuê
          </Link>
        </div>
        {queue.length ? (
          <div className="action-queue">
            {queue.map((b) => (
              <Link href={`/host/bookings/${b.code}`} key={b.id}>
                <div>
                  <strong>{b.snapshot.roomName}</strong>
                  <small>
                    {b.code} · {dateTime(b.start)}
                  </small>
                </div>
                <StatusBadge booking={b} now={now} />
                <span>
                  {b.orderStatus === "confirmed"
                    ? "Chờ hoàn thành"
                    : "Xem yêu cầu"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Không có đơn cần xử lý"
            description="Các yêu cầu mới sẽ xuất hiện tại đây."
          />
        )}
      </section>
      <section className="dashboard-section">
        <div className="section-heading">
          <h2>
            {studioId === "all"
              ? "Buổi thuê trong 7 ngày tới"
              : "Lịch thuê tuần này"}
          </h2>
          <Link className="text-link" href="/host/calendar">
            Mở lịch đặt
          </Link>
        </div>
        {upcoming.length ? (
          <div className="agenda-list">
            {upcoming.map((b) => (
              <Link key={b.id} href={`/host/bookings/${b.code}`}>
                <span className="agenda-date">
                  {shortDate(b.start)}
                  <small>
                    {time(b.start)}–{time(b.end)}
                  </small>
                </span>
                <div>
                  <strong>{b.snapshot.roomName}</strong>
                  <small>
                    {b.snapshot.studioName} · {b.contact.name}
                  </small>
                </div>
                <StatusBadge booking={b} now={now} />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có buổi thuê trong 7 ngày tới" />
        )}
      </section>
      <p className="demo-note">
        Giá trị đơn hoàn thành được tính từ giá đã lưu, theo ngày bắt đầu thuê.
        Không phải tiền đã thu.
      </p>
    </>
  );
}
export function HostBookings({ code }: { code?: string }) {
  const { studioId } = useStudio();
  return code ? (
    <BookingDetail code={code} scope="host" />
  ) : (
    <BookingList scope="host" studioId={studioId} />
  );
}
function monday(date: string) {
  const day = vietnamWeekday(vietnamInstant(date));
  return addDays(date, -((day + 6) % 7));
}
function CalendarBooking({
  booking,
  now,
  children,
}: {
  booking: Booking;
  now: number;
  children: ReactElement;
}) {
  const title = useId();
  return (
    <Popover modal>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent aria-labelledby={title}>
        <h2 id={title}>{booking.code}</h2>
        <p className="muted">{booking.snapshot.roomName}</p>
        <StatusBadge booking={booking} now={now} />
        <p className="mt-4">
          {booking.contact.name}
          <br />
          {dateTime(booking.start)} → {dateTime(booking.end)}
        </p>
        <p>
          {booking.snapshot.price.equipment
            .map((e) => `${e.name} × ${e.quantity}`)
            .join(", ") || "Không có thiết bị thuê thêm"}
        </p>
        <Button asChild>
          <Link href={`/host/bookings/${booking.code}`}>Xem chi tiết đơn</Link>
        </Button>
      </PopoverContent>
    </Popover>
  );
}
function CalendarContent() {
  const { db, now } = useApp(),
    { studioId } = useStudio(),
    { params, update } = useUrlState();
  if (!db) return null;
  const date = params.get("week"),
    week = monday(
      date && Number.isFinite(vietnamInstant(date)) ? date : localDate(now),
    ),
    start = vietnamInstant(week),
    end = start + 7 * 86400000,
    days = Array.from({ length: 7 }, (_, i) => addDays(week, i)),
    selected = days.includes(params.get("day") ?? "")
      ? params.get("day")!
      : days.includes(localDate(now))
        ? localDate(now)
        : week;
  const bookings = db.bookings.filter(
      (b) =>
        b.studioId === studioId &&
        [
          "awaiting-deposit",
          "pending-confirmation",
          "confirmed",
          "completed",
        ].includes(displayStatus(b, now)) &&
        overlaps(
          start,
          end,
          b.start,
          b.end + b.snapshot.cleaningMinutes * 60000,
        ),
    ),
    rooms = db.rooms.filter((r) => r.studioId === studioId);
  const dayBookings = bookings
    .filter((b) =>
      overlaps(
        vietnamInstant(selected),
        vietnamInstant(addDays(selected, 1)),
        b.start,
        b.end,
      ),
    )
    .sort((a, b) => a.start - b.start);
  return (
    <>
      <PageHeading
        title="Lịch đặt"
        description="Giờ Việt Nam · Dải sọc là khoảng dọn phòng sau buổi thuê."
      />
      <div className="calendar-toolbar">
        <div className="actions">
          <Button
            variant="outline"
            size="icon"
            aria-label="Tuần trước"
            onClick={() => update({ week: addDays(week, -7), day: null })}
          >
            <ChevronLeft size={18} />
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              update({ week: monday(localDate(now)), day: localDate(now) })
            }
          >
            Hôm nay
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Tuần sau"
            onClick={() => update({ week: addDays(week, 7), day: null })}
          >
            <ChevronRight size={18} />
          </Button>
          <strong>
            {shortDate(start)} – {shortDate(end - 1)}
          </strong>
        </div>
        <Field label="Chọn tuần" id="calendar-week">
          <Input
            type="date"
            value={week}
            onChange={(e) => update({ week: e.target.value, day: null })}
          />
        </Field>
      </div>
      <div className="calendar-legend">
        {[
          "awaiting-deposit",
          "pending-confirmation",
          "confirmed",
          "completed",
        ].map((s) => (
          <span key={s}>
            <i className={`calendar-swatch ${s}`} />
            {statusLabels[s as keyof typeof statusLabels]}
          </span>
        ))}
        <span>
          <i className="calendar-swatch buffer" />
          Dọn phòng
        </span>
      </div>
      <div
        className="weekly-calendar table-scroll"
        role="region"
        aria-label="Lịch đặt theo phòng trong tuần — cuộn ngang"
        tabIndex={0}
      >
        <div className="calendar-grid">
          <div className="calendar-header">
            <span>Phòng / Ngày</span>
            {days.map((day, i) => (
              <button
                key={day}
                onClick={() => update({ day })}
                aria-pressed={selected === day}
              >
                <span>
                  {
                    [
                      "Thứ hai",
                      "Thứ ba",
                      "Thứ tư",
                      "Thứ năm",
                      "Thứ sáu",
                      "Thứ bảy",
                      "Chủ nhật",
                    ][i]
                  }
                </span>
                <strong>{shortDate(vietnamInstant(day))}</strong>
                <small>00:00 – 24:00</small>
              </button>
            ))}
          </div>
          {rooms.map((room) => (
            <div className="calendar-row" key={room.id}>
              <div className="calendar-room-label">
                <strong>{room.name}</strong>
                <small>{room.code}</small>
              </div>
              <div className="calendar-lane">
                {days.map((day) => (
                  <div className="calendar-day-guide" key={day} />
                ))}
                {bookings
                  .filter((b) => b.roomId === room.id)
                  .map((b, index) => {
                    const a = Math.max(start, b.start),
                      z = Math.min(
                        end,
                        b.end + b.snapshot.cleaningMinutes * 60000,
                      ),
                      left = ((a - start) / (end - start)) * 100,
                      width = ((z - a) / (end - start)) * 100,
                      bufferFraction =
                        (Math.max(
                          0,
                          Math.min(
                            z,
                            b.end + b.snapshot.cleaningMinutes * 60000,
                          ) - Math.max(a, b.end),
                        ) /
                          (z - a)) *
                        100;
                    return (
                      <CalendarBooking key={b.id} booking={b} now={now}>
                        <button
                          className={`calendar-block ${displayStatus(b, now)}`}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            top: 12 + (index % 2) * 28,
                          }}
                          aria-label={`${b.code}, ${room.name}, ${dateTime(b.start)} đến ${dateTime(b.end)}, ${statusLabels[displayStatus(b, now)]}`}
                          title={`${b.code} · ${time(b.start)}–${time(b.end)}`}
                        >
                          <span
                            className="calendar-booking-fill"
                            style={{ width: `${100 - bufferFraction}%` }}
                          />
                          <span
                            className="calendar-buffer"
                            style={{ width: `${bufferFraction}%` }}
                          />
                        </button>
                      </CalendarBooking>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="calendar-day-selector" aria-label="Chọn ngày trong tuần">
        {days.map((day) => (
          <Button
            variant={selected === day ? "secondary" : "outline"}
            aria-pressed={selected === day}
            key={day}
            onClick={() => update({ day })}
          >
            {shortDate(vietnamInstant(day))}
          </Button>
        ))}
      </div>
      <section className="dashboard-section">
        <h2>Buổi thuê ngày {shortDate(vietnamInstant(selected))}</h2>
        {dayBookings.length ? (
          <div className="agenda-list">
            {rooms
              .filter((r) => dayBookings.some((b) => b.roomId === r.id))
              .map((room) => (
                <div key={room.id}>
                  <h3 className="agenda-room-heading">{room.name}</h3>
                  {dayBookings
                    .filter((b) => b.roomId === room.id)
                    .map((b) => (
                      <CalendarBooking key={b.id} booking={b} now={now}>
                        <button className="agenda-booking">
                          <span className="agenda-date">
                            {time(b.start)}–{time(b.end)}
                            <small>
                              {shortDate(b.start)}–{shortDate(b.end)}
                            </small>
                          </span>
                          <span>
                            <strong>{b.code}</strong>
                            <small>{b.contact.name}</small>
                          </span>
                          <StatusBadge booking={b} now={now} />
                        </button>
                      </CalendarBooking>
                    ))}
                </div>
              ))}
          </div>
        ) : (
          <EmptyState title="Không có buổi thuê trong ngày này" />
        )}
      </section>
    </>
  );
}
export function HostCalendar() {
  const { studioId } = useStudio();
  return (
    <HostScope>
      <CalendarContent key={studioId} />
    </HostScope>
  );
}
export function HostAnalytics() {
  const { db, user, now } = useApp(),
    { studioId } = useStudio(),
    { params, update } = useUrlState();
  if (!db || !user) return null;
  const today = localDate(now),
    period = params.get("period") ?? "month";
  const from =
      period === "7"
        ? addDays(today, -6)
        : period === "30"
          ? addDays(today, -29)
          : period === "custom"
            ? (params.get("from") ?? today)
            : today.slice(0, 7) + "-01",
    to = period === "custom" ? (params.get("to") ?? today) : today;
  const start = vietnamInstant(from),
    end = vietnamInstant(addDays(to, 1));
  const studios = db.studios.filter(
      (s) => s.ownerId === user.id && (studioId === "all" || s.id === studioId),
    ),
    rooms = db.rooms.filter((r) => studios.some((s) => s.id === r.studioId)),
    bookings = db.bookings.filter((b) =>
      studios.some((s) => s.id === b.studioId),
    ),
    stats = statistics(bookings, start, end);
  const roomData = rooms.map((room) => ({
    id: room.id,
    name: room.name,
    code: room.code,
    usage: utilization(room, bookings, start, end),
  }));
  const valid = roomData.filter((r) => r.usage !== null);
  const average = valid.length
    ? Math.round(
        (valid.reduce((s, r) => s + r.usage!, 0) / valid.length) * 10,
      ) / 10
    : null;
  const completed = bookings.filter(
    (b) => b.orderStatus === "completed" && b.start >= start && b.start < end,
  );
  const days = Array.from(new Set(completed.map((b) => localDate(b.start))))
    .sort()
    .map((day) => ({
      day,
      label: shortDate(vietnamInstant(day)),
      value: completed
        .filter((b) => localDate(b.start) === day)
        .reduce((s, b) => s + b.snapshot.price.total, 0),
    }));
  return (
    <>
      <PageHeading
        title="Thống kê"
        description="Giá trị đơn thuê và sử dụng phòng từ các đơn đã ghi nhận."
      />
      <div className="list-filters">
        <Field label="Khoảng thời gian" id="analytics-period">
          <Select
            value={period}
            onChange={(e) => update({ period: e.target.value })}
          >
            <option value="7">7 ngày gần nhất</option>
            <option value="30">30 ngày gần nhất</option>
            <option value="month">Tháng hiện tại</option>
            <option value="custom">Tùy chọn</option>
          </Select>
        </Field>
        {period === "custom" && (
          <>
            <Field label="Từ ngày" id="analytics-from">
              <Input
                type="date"
                value={from}
                onChange={(e) => update({ from: e.target.value })}
              />
            </Field>
            <Field label="Đến ngày" id="analytics-to">
              <Input
                type="date"
                min={from}
                value={to}
                onChange={(e) => update({ to: e.target.value })}
              />
            </Field>
          </>
        )}
      </div>
      {end <= start ? (
        <div className="notice notice-error" role="alert">
          Ngày kết thúc cần sau ngày bắt đầu.
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            {[
              { label: "Số đơn thuê", value: stats.count },
              {
                label: "Giá trị đơn hoàn thành",
                value: money(stats.completed),
              },
              {
                label: "Đã xác nhận, chưa hoàn thành",
                value: money(stats.confirmed),
              },
              {
                label: "Trung bình sử dụng phòng",
                value: average === null ? "Chưa đủ dữ liệu" : `${average}%`,
              },
            ].map((k) => (
              <div key={k.label}>
                <span>{k.label}</span>
                <strong>{k.value}</strong>
              </div>
            ))}
          </div>
          <div className="analytics-grid">
            <section className="surface">
              <h2>Giá trị đơn hoàn thành</h2>
              <p className="field-hint">
                Theo ngày bắt đầu thuê. Không phải tiền đã thu.
              </p>
              {days.length ? (
                <>
                  <ChartContainer
                    config={{ value: { label: "Giá trị", color: "#c2410c" } }}
                  >
                    <LineChart data={days} accessibilityLayer={false}>
                      <CartesianGrid vertical={false} stroke="#e5e5e0" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) => `${v / 1000}k`}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip formatter={(value) => money(Number(value))} />
                      <Line
                        type="linear"
                        dataKey="value"
                        stroke="var(--color-value)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Giá trị đơn hoàn thành"
                      />
                    </LineChart>
                  </ChartContainer>
                  <details className="chart-table">
                    <summary>Xem dữ liệu dạng bảng</summary>
                    <DataTable
                      rows={days}
                      id={(r) => r.day}
                      label="Giá trị đơn hoàn thành theo ngày"
                      columns={[
                        {
                          key: "day",
                          label: "Ngày thuê",
                          render: (r) => r.day,
                        },
                        {
                          key: "value",
                          label: "Giá trị",
                          render: (r) => money(r.value),
                        },
                      ]}
                    />
                  </details>
                </>
              ) : (
                <EmptyState title="Chưa có đơn hoàn thành trong kỳ" />
              )}
            </section>
            <section className="surface">
              <h2>Mức sử dụng theo phòng</h2>
              <p className="field-hint">
                Giờ thuê đã xác nhận / giờ mở cửa, không gồm dọn phòng.
              </p>
              {valid.length ? (
                <>
                  <ChartContainer
                    config={{
                      usage: { label: "Sử dụng (%)", color: "#6a7770" },
                    }}
                  >
                    <BarChart
                      data={valid}
                      layout="vertical"
                      accessibilityLayer={false}
                      margin={{ left: 0, right: 16 }}
                    >
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="code"
                        width={50}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Bar
                        dataKey="usage"
                        fill="var(--color-usage)"
                        radius={[0, 3, 3, 0]}
                        name="Sử dụng phòng"
                      />
                    </BarChart>
                  </ChartContainer>
                  <details className="chart-table">
                    <summary>Xem dữ liệu dạng bảng</summary>
                    <DataTable
                      rows={roomData}
                      id={(r) => r.id}
                      label="Mức sử dụng phòng"
                      columns={[
                        { key: "name", label: "Phòng", render: (r) => r.name },
                        {
                          key: "usage",
                          label: "Mức sử dụng",
                          render: (r) =>
                            r.usage === null
                              ? "Chưa đủ dữ liệu"
                              : `${r.usage}%`,
                        },
                      ]}
                    />
                  </details>
                </>
              ) : (
                <EmptyState title="Chưa đủ dữ liệu giờ hoạt động" />
              )}
            </section>
          </div>
          <section className="dashboard-section">
            <h2>Đơn theo trạng thái</h2>
            <div className="status-counts">
              {Object.entries(stats.statuses).map(([status, count]) => (
                <div key={status}>
                  <span>
                    {statusLabels[status as keyof typeof statusLabels]}
                  </span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
