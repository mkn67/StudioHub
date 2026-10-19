"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, ArrowUp, ArrowDown } from "lucide-react";
import { useApp, useMutation } from "@/providers/app-provider";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { EntityDialog, type FormField } from "@/components/forms/entity-dialog";
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  PageHeading,
  StatusBadge,
  StudioImage,
} from "@/components/shared/common";
import {
  DataTable,
  Pagination,
  type Column,
} from "@/components/data-table/table";
import {
  BookingDetail,
  BookingList,
} from "@/features/customer-bookings/bookings";
import { getEffectiveRoomStatus } from "@/domain/access";
import { requiresAttention } from "@/domain/statistics";
import { occupies } from "@/domain/booking";
import { addDays, dateTime, normalize, vietnamInstant } from "@/lib/format";
import { useUrlState } from "@/hooks/use-url-state";
import type { Catalog, DomainEvent, Room, Studio, User } from "@/domain/schema";
const roleLabels = {
  customer: "Khách hàng",
  host: "Chủ Studio",
  admin: "Quản trị viên",
  system: "Hệ thống",
};
function AccountBadge({ user }: { user: User }) {
  return (
    <Badge
      tone={
        user.locked
          ? "danger"
          : user.approval === "approved"
            ? "success"
            : "warning"
      }
    >
      {user.locked
        ? "Bị khóa"
        : user.approval === "pending"
          ? "Chờ duyệt"
          : user.approval === "rejected"
            ? "Từ chối"
            : "Hoạt động"}
    </Badge>
  );
}
export function AdminOverview() {
  const { db, now } = useApp();
  if (!db) return null;
  const pending = db.users
    .filter((u) => u.role === "host" && u.approval === "pending")
    .sort(
      (a, b) =>
        (db.applications.find((x) => x.userId === a.id)?.submittedAt ?? 0) -
        (db.applications.find((x) => x.userId === b.id)?.submittedAt ?? 0),
    );
  const attention = db.bookings
      .filter((b) => requiresAttention(db, b, now))
      .sort((a, b) => a.createdAt - b.createdAt),
    activeStudios = db.studios.filter((s) =>
      db.rooms.some(
        (r) =>
          r.studioId === s.id &&
          getEffectiveRoomStatus(db, r, now) === "bookable",
      ),
    );
  return (
    <>
      <PageHeading
        eyebrow="QUẢN TRỊ STUDIOHUB"
        title="Tổng quan"
        description="Hồ sơ đang chờ duyệt và những đơn cần theo dõi."
      />
      <div className="kpi-grid">
        {[
          { label: "Chủ Studio chờ duyệt", value: pending.length },
          { label: "Đơn cần theo dõi", value: attention.length },
          { label: "Studio đang nhận đơn", value: activeStudios.length },
          { label: "Tổng tài khoản", value: db.users.length },
        ].map((k) => (
          <div key={k.label}>
            <span>{k.label}</span>
            <strong>{k.value}</strong>
            {k.label === "Tổng tài khoản" && (
              <small>
                {["customer", "host", "admin"]
                  .map(
                    (role) =>
                      `${db.users.filter((u) => u.role === role).length} ${roleLabels[role as keyof typeof roleLabels]}`,
                  )
                  .join(" · ")}
              </small>
            )}
          </div>
        ))}
      </div>
      <section className="dashboard-section">
        <div className="section-heading">
          <h2>Hồ sơ Chủ Studio chờ duyệt</h2>
          <Link href="/admin/approvals" className="text-link">
            Xem tất cả
          </Link>
        </div>
        {pending.length ? (
          <div className="action-queue">
            {pending.slice(0, 5).map((user) => {
              const app = db.applications.find((a) => a.userId === user.id);
              return (
                <Link key={user.id} href={`/admin/users/${user.id}`}>
                  <div>
                    <strong>{user.name}</strong>
                    <small>
                      {app?.studioName} · {user.email}
                    </small>
                  </div>
                  <span>{app && dateTime(app.submittedAt)}</span>
                  <AccountBadge user={user} />
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState title="Không có hồ sơ đang chờ" />
        )}
      </section>
      <section className="dashboard-section">
        <div className="section-heading">
          <h2>Đơn cần Admin theo dõi</h2>
          <Link href="/admin/bookings?attention=true" className="text-link">
            Xem tất cả
          </Link>
        </div>
        <p className="field-hint">
          Đơn chờ xác nhận hoặc đã xác nhận tại Studio bị Admin ẩn hoặc có Chủ
          Studio bị khóa.
        </p>
        {attention.length ? (
          <div className="action-queue">
            {attention.slice(0, 5).map((b) => (
              <Link key={b.id} href={`/admin/bookings/${b.code}`}>
                <div>
                  <strong>
                    {b.code} · {b.snapshot.roomName}
                  </strong>
                  <small>
                    {b.snapshot.studioName} · {dateTime(b.start)}
                  </small>
                </div>
                <StatusBadge booking={b} now={now} />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Không có đơn cần theo dõi" />
        )}
      </section>
    </>
  );
}
export function AdminApprovals() {
  const { db } = useApp(),
    { params, update } = useUrlState();
  if (!db) return null;
  const status = params.get("status") ?? "pending",
    q = normalize(params.get("q") ?? "");
  const users = db.users
    .filter(
      (u) =>
        u.role === "host" &&
        db.applications.some((a) => a.userId === u.id) &&
        (!status || u.approval === status) &&
        normalize(
          `${u.name} ${u.email} ${db.applications.find((a) => a.userId === u.id)?.studioName}`,
        ).includes(q),
    )
    .sort(
      (a, b) =>
        db.applications.find((x) => x.userId === a.id)!.submittedAt -
        db.applications.find((x) => x.userId === b.id)!.submittedAt,
    );
  const page = Math.max(1, Number(params.get("page")) || 1);
  const columns: Column<User>[] = [
    {
      key: "applicant",
      label: "Người đăng ký",
      render: (u) => (
        <>
          <strong>{u.name}</strong>
          <small>{u.email}</small>
          <small>{u.phone}</small>
        </>
      ),
    },
    {
      key: "studio",
      label: "Studio đề xuất",
      render: (u) => db.applications.find((a) => a.userId === u.id)?.studioName,
    },
    {
      key: "date",
      label: "Gửi ngày",
      render: (u) =>
        dateTime(db.applications.find((a) => a.userId === u.id)!.submittedAt),
      sort: (u) => db.applications.find((a) => a.userId === u.id)!.submittedAt,
    },
    {
      key: "status",
      label: "Trạng thái",
      render: (u) => <AccountBadge user={u} />,
    },
    {
      key: "action",
      label: "Thao tác",
      render: (u) => (
        <Link href={`/admin/users/${u.id}`} className="text-link">
          Xem hồ sơ
        </Link>
      ),
    },
  ];
  return (
    <>
      <PageHeading
        title="Duyệt Chủ Studio"
        description="Duyệt tài khoản trong trang hồ sơ. Studio được tạo riêng sau khi tài khoản được duyệt."
      />
      <div className="list-filters">
        <Field label="Tìm hồ sơ" id="approvals-q">
          <Input
            value={params.get("q") ?? ""}
            onChange={(e) => update({ q: e.target.value }, true)}
            placeholder="Tên, email hoặc Studio đề xuất"
          />
        </Field>
        <Field label="Trạng thái duyệt" id="approvals-status">
          <Select
            value={status}
            onChange={(e) => update({ status: e.target.value }, true)}
          >
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
            <option value="">Tất cả</option>
          </Select>
        </Field>
      </div>
      <DataTable
        rows={users.slice((page - 1) * 20, page * 20)}
        columns={columns}
        id={(u) => u.id}
        label="Hồ sơ Chủ Studio"
      />
      <Pagination
        page={page}
        total={users.length}
        pageSize={20}
        onChange={(page) => update({ page })}
      />
    </>
  );
}
export function AdminUsers() {
  const { db } = useApp(),
    { params, update } = useUrlState();
  if (!db) return null;
  const q = normalize(params.get("q") ?? ""),
    role = params.get("role"),
    status = params.get("status");
  const rows = db.users.filter(
    (u) =>
      normalize(`${u.name} ${u.email} ${u.phone}`).includes(q) &&
      (!role || u.role === role) &&
      (!status ||
        (status === "locked" ? u.locked : !u.locked && u.approval === status)),
  );
  const page = Math.max(1, Number(params.get("page")) || 1);
  const columns: Column<User>[] = [
    {
      key: "name",
      label: "Tài khoản",
      render: (u) => (
        <Link href={`/admin/users/${u.id}`}>
          <strong>{u.name}</strong>
          <small>{u.email}</small>
        </Link>
      ),
      sort: (u) => u.name,
    },
    { key: "role", label: "Vai trò", render: (u) => roleLabels[u.role] },
    {
      key: "status",
      label: "Trạng thái",
      render: (u) => <AccountBadge user={u} />,
    },
    {
      key: "date",
      label: "Ngày tạo",
      render: (u) => dateTime(u.createdAt),
      sort: (u) => u.createdAt,
    },
    {
      key: "activity",
      label: "Dữ liệu liên quan",
      render: (u) =>
        u.role === "host"
          ? `${db.studios.filter((s) => s.ownerId === u.id).length} Studio`
          : u.role === "customer"
            ? `${db.bookings.filter((b) => b.customerId === u.id).length} đơn thuê`
            : "Quản trị viên",
    },
    {
      key: "action",
      label: "Thao tác",
      render: (u) => (
        <Link className="text-link" href={`/admin/users/${u.id}`}>
          Xem tài khoản
        </Link>
      ),
    },
  ];
  return (
    <>
      <PageHeading
        title="Tài khoản"
        description="Tra cứu thông tin và trạng thái truy cập. Vai trò tài khoản được giữ cố định."
      />
      <div className="list-filters">
        <Field label="Tìm tài khoản" id="users-q">
          <Input
            value={params.get("q") ?? ""}
            onChange={(e) => update({ q: e.target.value }, true)}
            placeholder="Tên, email, số điện thoại"
          />
        </Field>
        <Field label="Vai trò" id="users-role">
          <Select
            value={role ?? ""}
            onChange={(e) => update({ role: e.target.value }, true)}
          >
            <option value="">Tất cả vai trò</option>
            {["customer", "host", "admin"].map((r) => (
              <option key={r} value={r}>
                {roleLabels[r as keyof typeof roleLabels]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Trạng thái" id="users-status">
          <Select
            value={status ?? ""}
            onChange={(e) => update({ status: e.target.value }, true)}
          >
            <option value="">Tất cả</option>
            <option value="approved">Hoạt động / đã duyệt</option>
            <option value="pending">Chờ duyệt</option>
            <option value="rejected">Từ chối</option>
            <option value="locked">Bị khóa</option>
          </Select>
        </Field>
      </div>
      <DataTable
        rows={rows.slice((page - 1) * 20, page * 20)}
        columns={columns}
        id={(u) => u.id}
        label="Tài khoản StudioHub"
      />
      <Pagination
        page={page}
        total={rows.length}
        pageSize={20}
        onChange={(page) => update({ page })}
      />
    </>
  );
}
export function AdminUserDetail({ id }: { id: string }) {
  const { db, service, now } = useApp();
  const [action, setAction] = useState<
    "approve" | "reject" | "lock" | "unlock" | null
  >(null);
  if (!db) return null;
  const user = db.users.find((u) => u.id === id);
  if (!user) return <EmptyState title="Không tìm thấy tài khoản" />;
  const app = db.applications.find((a) => a.userId === id),
    bookings = db.bookings.filter(
      (b) => b.customerId === id || b.ownerId === id,
    ),
    active = bookings.filter((b) => occupies(b, now)),
    studios = db.studios.filter((s) => s.ownerId === id),
    events = db.audit.filter((e) => e.entityId === id);
  const labels = {
    approve: "Duyệt Chủ Studio",
    reject: "Từ chối hồ sơ",
    lock: "Khóa tài khoản",
    unlock: "Mở khóa tài khoản",
  };
  return (
    <>
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link href="/admin/users">Tài khoản</Link>
        <span>/</span>
        <span>{user.name}</span>
      </nav>
      <PageHeading
        title={user.name}
        description={user.email}
        action={<AccountBadge user={user} />}
      />
      <div className="admin-detail-grid">
        <div>
          <section className="surface">
            <h2>Thông tin tài khoản</h2>
            <dl className="definition-list">
              <div>
                <dt>Vai trò</dt>
                <dd>{roleLabels[user.role]}</dd>
              </div>
              <div>
                <dt>Số điện thoại</dt>
                <dd>{user.phone}</dd>
              </div>
              <div>
                <dt>Ngày tạo</dt>
                <dd>{dateTime(user.createdAt)}</dd>
              </div>
              <div>
                <dt>Trạng thái duyệt</dt>
                <dd>
                  {user.approval === "approved"
                    ? "Đã duyệt"
                    : user.approval === "pending"
                      ? "Chờ duyệt"
                      : "Từ chối"}
                </dd>
              </div>
            </dl>
            {user.locked && (
              <div className="notice notice-error">
                Lý do khóa: {user.lockReason}
              </div>
            )}
          </section>
          {app && (
            <section className="surface">
              <h2>Hồ sơ Studio đề xuất</h2>
              <h3>{app.studioName}</h3>
              <p>{app.description}</p>
              <p className="muted">Gửi ngày {dateTime(app.submittedAt)}</p>
              {app.reason && (
                <p className="notice notice-error">{app.reason}</p>
              )}
              <ol className="timeline">
                {app.history.map((event, i) => (
                  <li key={i}>
                    <strong>{event.action}</strong>
                    <small>{dateTime(event.at)}</small>
                    {event.reason && <p>{event.reason}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}
          {studios.length > 0 && (
            <section className="surface">
              <h2>Studio sở hữu</h2>
              {studios.map((s) => (
                <p key={s.id}>
                  <Link className="text-link" href={`/admin/studios/${s.id}`}>
                    {s.name}
                  </Link>
                </p>
              ))}
            </section>
          )}
          <section className="surface">
            <h2>Đơn thuê liên quan</h2>
            {bookings.length ? (
              <div className="related-bookings">
                {bookings.slice(-10).map((b) => (
                  <Link key={b.id} href={`/admin/bookings/${b.code}`}>
                    <strong>{b.code}</strong>
                    <span>{b.snapshot.roomName}</span>
                    <StatusBadge booking={b} now={now} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted">Chưa có đơn thuê liên quan.</p>
            )}
          </section>
          <section className="surface">
            <h2>Sự kiện quản trị</h2>
            {events.length ? (
              <ol className="timeline">
                {events.map((e) => (
                  <li key={e.id}>
                    <strong>{e.action}</strong>
                    <small>
                      {dateTime(e.at)} · {e.actorName}
                    </small>
                    {e.reason && <p>{e.reason}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">
                Chưa có sự kiện quản trị cho tài khoản này.
              </p>
            )}
          </section>
        </div>
        <aside className="surface admin-actions">
          <h2>Quản lý truy cập</h2>
          {user.role === "host" &&
            user.approval === "pending" &&
            !user.locked && (
              <>
                <Button
                  className="full-width"
                  onClick={() => setAction("approve")}
                >
                  Duyệt Chủ Studio
                </Button>
                <Button
                  className="full-width"
                  variant="destructive"
                  onClick={() => setAction("reject")}
                >
                  Từ chối hồ sơ
                </Button>
              </>
            )}
          {user.role !== "admin" ? (
            <Button
              className="full-width"
              variant={user.locked ? "outline" : "destructive"}
              onClick={() => setAction(user.locked ? "unlock" : "lock")}
            >
              {user.locked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
            </Button>
          ) : (
            <p className="muted">Không khóa tài khoản quản trị viên.</p>
          )}
          <p className="field-hint">
            Khóa tài khoản giữ nguyên trạng thái duyệt và các đơn đã tạo.
          </p>
        </aside>
      </div>
      <ConfirmDialog
        open={!!action}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
        title={action ? labels[action] : "Xác nhận"}
        description={
          action === "approve"
            ? "Cho phép tài khoản vào khu vực Chủ Studio. Không tự tạo Studio."
            : action === "unlock"
              ? "Khôi phục truy cập theo trạng thái duyệt trước đó."
              : action === "reject"
                ? "Lý do sẽ hiển thị cho Chủ Studio. Hồ sơ có thể cập nhật và gửi lại."
                : "Tài khoản vẫn giữ phiên đăng nhập, chỉ được xem trạng thái và đăng xuất. Không tự hủy các đơn liên quan."
        }
        destructive={action === "lock" || action === "reject"}
        requireReason={action === "lock" || action === "reject"}
        onConfirm={(reason) => {
          if (action === "approve" || action === "reject")
            service.approveHost(id, action === "approve", reason);
          else service.setLocked(id, action === "lock", reason);
        }}
      >
        {action === "lock" && (
          <>
            <p>{active.length} đơn đang hoạt động bị ảnh hưởng:</p>
            {active.map((b) => (
              <p key={b.id}>
                <Link className="text-link" href={`/admin/bookings/${b.code}`}>
                  {b.code}
                </Link>{" "}
                · {dateTime(b.start)}
              </p>
            ))}
          </>
        )}
      </ConfirmDialog>
    </>
  );
}
export function AdminStudios() {
  const { db, now } = useApp(),
    { params, update } = useUrlState();
  if (!db) return null;
  const q = normalize(params.get("q") ?? ""),
    hidden = params.get("hidden"),
    rows = db.studios.filter(
      (s) =>
        normalize(
          `${s.name} ${s.id} ${s.address} ${db.users.find((u) => u.id === s.ownerId)?.name}`,
        ).includes(q) &&
        (!hidden || (hidden === "true") === s.adminHidden),
    );
  const columns: Column<Studio>[] = [
    {
      key: "name",
      label: "Studio",
      render: (s) => (
        <>
          <strong>{s.name}</strong>
          <small>
            {s.district}, {s.city}
          </small>
        </>
      ),
      sort: (s) => s.name,
    },
    {
      key: "owner",
      label: "Chủ Studio",
      render: (s) => db.users.find((u) => u.id === s.ownerId)?.name,
    },
    {
      key: "rooms",
      label: "Số phòng",
      render: (s) => db.rooms.filter((r) => r.studioId === s.id).length,
    },
    {
      key: "visibility",
      label: "Nhận đơn",
      render: (s) => (
        <Badge
          tone={
            db.rooms.some(
              (r) =>
                r.studioId === s.id &&
                getEffectiveRoomStatus(db, r, now) === "bookable",
            )
              ? "success"
              : "neutral"
          }
        >
          {db.rooms.some(
            (r) =>
              r.studioId === s.id &&
              getEffectiveRoomStatus(db, r, now) === "bookable",
          )
            ? "Có phòng nhận đơn"
            : "Chưa nhận đơn"}
        </Badge>
      ),
    },
    {
      key: "admin",
      label: "Trạng thái Admin",
      render: (s) => (
        <>
          <Badge tone={s.adminHidden ? "danger" : "neutral"}>
            {s.adminHidden ? "Admin ẩn" : "Không ẩn"}
          </Badge>
          {s.adminReason && <small>{s.adminReason}</small>}
        </>
      ),
    },
    {
      key: "action",
      label: "Thao tác",
      render: (s) => (
        <Link href={`/admin/studios/${s.id}`} className="text-link">
          Xem Studio
        </Link>
      ),
    },
  ];
  return (
    <>
      <PageHeading
        title="Studio & Phòng"
        description="Theo dõi nội dung và quản lý trạng thái ẩn độc lập với Chủ Studio."
      />
      <div className="list-filters">
        <Field label="Tìm Studio" id="studios-q">
          <Input
            value={params.get("q") ?? ""}
            onChange={(e) => update({ q: e.target.value })}
          />
        </Field>
        <Field label="Trạng thái Admin" id="studios-hidden">
          <Select
            value={hidden ?? ""}
            onChange={(e) => update({ hidden: e.target.value })}
          >
            <option value="">Tất cả</option>
            <option value="true">Đang ẩn</option>
            <option value="false">Không ẩn</option>
          </Select>
        </Field>
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        id={(s) => s.id}
        label="Studio trên nền tảng"
      />
    </>
  );
}
export function AdminStudioDetail({ id }: { id: string }) {
  const { db, now, service } = useApp();
  const [visibility, setVisibility] = useState<{
    type: "studio" | "room";
    id: string;
    hidden: boolean;
    name: string;
  } | null>(null);
  if (!db) return null;
  const studio = db.studios.find((s) => s.id === id);
  if (!studio) return <EmptyState title="Không tìm thấy Studio" />;
  const owner = db.users.find((u) => u.id === studio.ownerId)!,
    rooms = db.rooms.filter((r) => r.studioId === id),
    bookings = db.bookings.filter((b) => b.studioId === id),
    affected = bookings.filter(
      (b) =>
        occupies(b, now) &&
        (!visibility ||
          visibility.type === "studio" ||
          b.roomId === visibility.id),
    );
  const columns: Column<Room>[] = [
    {
      key: "name",
      label: "Phòng",
      render: (r) => (
        <div className="table-room">
          <StudioImage src={r.images[0]} alt={r.name} />
          <span>
            <strong>{r.name}</strong>
            <small>{r.code}</small>
          </span>
        </div>
      ),
    },
    {
      key: "owner-status",
      label: "Chủ Studio",
      render: (r) =>
        r.status === "active"
          ? "Mở nhận đơn"
          : r.status === "paused"
            ? "Tạm ngừng"
            : "Ẩn",
    },
    {
      key: "effective",
      label: "Trạng thái tổng hợp",
      render: (r) => (
        <Badge
          tone={
            getEffectiveRoomStatus(db, r, now) === "bookable"
              ? "success"
              : "neutral"
          }
        >
          {
            {
              bookable: "Có thể đặt",
              paused: "Tạm ngừng",
              hidden: "Ẩn",
              incomplete: "Chưa đủ điều kiện",
            }[getEffectiveRoomStatus(db, r, now)]
          }
        </Badge>
      ),
    },
    {
      key: "admin",
      label: "Trạng thái Admin",
      render: (r) => (
        <>
          {r.adminHidden ? "Admin ẩn" : "Không ẩn"}
          {r.adminReason && <small>{r.adminReason}</small>}
        </>
      ),
    },
    {
      key: "actions",
      label: "Thao tác Admin",
      render: (r) => (
        <Button
          variant={r.adminHidden ? "outline" : "ghost"}
          onClick={() =>
            setVisibility({
              type: "room",
              id: r.id,
              hidden: !r.adminHidden,
              name: r.name,
            })
          }
        >
          {r.adminHidden ? "Hiện phòng" : "Ẩn phòng"}
        </Button>
      ),
    },
  ];
  return (
    <>
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link href="/admin/studios">Studio & Phòng</Link>
        <span>/</span>
        <span>{studio.name}</span>
      </nav>
      <PageHeading
        title={studio.name}
        description={studio.address}
        action={
          <Button
            variant={studio.adminHidden ? "outline" : "destructive"}
            onClick={() =>
              setVisibility({
                type: "studio",
                id,
                hidden: !studio.adminHidden,
                name: studio.name,
              })
            }
          >
            {studio.adminHidden ? "Hiện Studio" : "Ẩn Studio"}
          </Button>
        }
      />
      {studio.adminHidden && (
        <div className="notice notice-error">
          Lý do Admin ẩn: {studio.adminReason}
        </div>
      )}
      <section className="surface">
        <h2>Thông tin Studio</h2>
        <p>{studio.description}</p>
        <dl className="definition-list">
          <div>
            <dt>Chủ Studio</dt>
            <dd>
              <Link className="text-link" href={`/admin/users/${owner.id}`}>
                {owner.name}
              </Link>{" "}
              · <AccountBadge user={owner} />
            </dd>
          </div>
          <div>
            <dt>Điện thoại</dt>
            <dd>{studio.phone}</dd>
          </div>
          <div>
            <dt>Thời gian</dt>
            <dd>
              Bước {studio.stepMinutes} phút · Buổi {studio.sessionMinutes / 60}{" "}
              giờ
            </dd>
          </div>
          <div>
            <dt>Đặt cọc demo</dt>
            <dd>{studio.depositPercent}%</dd>
          </div>
          <div>
            <dt>Hủy trước giờ thuê</dt>
            <dd>{studio.cancellationHours} giờ (demo)</dd>
          </div>
        </dl>
        <h3>Quy định thuê</h3>
        <p>{studio.rules}</p>
      </section>
      <section className="dashboard-section">
        <h2>Các phòng</h2>
        <DataTable
          rows={rooms}
          columns={columns}
          id={(r) => r.id}
          label="Phòng thuộc Studio"
        />
      </section>
      <section className="surface">
        <h2>Đơn thuê liên quan</h2>
        {bookings.length ? (
          <div className="related-bookings">
            {bookings.map((b) => (
              <Link key={b.id} href={`/admin/bookings/${b.code}`}>
                <strong>{b.code}</strong>
                <span>{b.snapshot.roomName}</span>
                <StatusBadge booking={b} now={now} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">Chưa có đơn thuê.</p>
        )}
      </section>
      <ConfirmDialog
        open={!!visibility}
        onOpenChange={(open) => {
          if (!open) setVisibility(null);
        }}
        title={`${visibility?.hidden ? "Ẩn" : "Hiện"} ${visibility?.type === "studio" ? "Studio" : "phòng"}`}
        description={
          visibility?.hidden
            ? "Ngừng nhận đơn mới. Những đơn đã tạo vẫn được lưu và không bị hủy tự động."
            : "Gỡ trạng thái ẩn của Admin. Trạng thái do Chủ Studio thiết lập vẫn được giữ."
        }
        requireReason={visibility?.hidden}
        destructive={visibility?.hidden}
        onConfirm={(reason) => {
          if (visibility)
            service.setVisibility(
              visibility.type,
              visibility.id,
              visibility.hidden,
              reason,
            );
        }}
      >
        <p>
          <strong>{visibility?.name}</strong>
        </p>
        <p>{affected.length} đơn đang hoạt động:</p>
        {affected.map((b) => (
          <p key={b.id}>
            <Link className="text-link" href={`/admin/bookings/${b.code}`}>
              {b.code}
            </Link>{" "}
            · {dateTime(b.start)}
          </p>
        ))}
      </ConfirmDialog>
    </>
  );
}
export function AdminCategories() {
  const { db, service } = useApp(),
    mutation = useMutation(),
    { params, update } = useUrlState();
  const [editing, setEditing] = useState<Catalog | null>(null);
  if (!db) return null;
  const kind = params.get("tab") === "amenities" ? "amenities" : "types",
    rows = [...db[kind]].sort((a, b) => a.order - b.order);
  const fields: FormField[] = [
    { key: "name", label: "Tên danh mục", required: true },
    { key: "hidden", label: "Ẩn danh mục khỏi lựa chọn mới", type: "checkbox" },
    ...(kind === "types"
      ? [{ key: "image", label: "Ảnh đại diện", type: "image" as const }]
      : []),
  ];
  const columns: Column<Catalog>[] = [
    {
      key: "name",
      label: "Danh mục",
      render: (c) => (
        <div className="table-room">
          {kind === "types" && <StudioImage src={c.image} alt={c.name} />}
          <strong>{c.name}</strong>
        </div>
      ),
    },
    {
      key: "used",
      label: "Phòng sử dụng",
      render: (c) =>
        db.rooms.filter((r) =>
          (kind === "types" ? r.typeIds : r.amenityIds).includes(c.id),
        ).length,
    },
    {
      key: "status",
      label: "Trạng thái",
      render: (c) => <Badge>{c.hidden ? "Ẩn" : "Đang hiển thị"}</Badge>,
    },
    {
      key: "order",
      label: "Thứ tự",
      render: (c) => (
        <div className="actions">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Đưa ${c.name} lên`}
            disabled={rows[0]?.id === c.id}
            onClick={() =>
              mutation(
                () => service.moveCatalog(kind, c.id, -1),
                "Đã sắp xếp danh mục.",
              )
            }
          >
            <ArrowUp size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Đưa ${c.name} xuống`}
            disabled={rows[rows.length - 1]?.id === c.id}
            onClick={() =>
              mutation(
                () => service.moveCatalog(kind, c.id, 1),
                "Đã sắp xếp danh mục.",
              )
            }
          >
            <ArrowDown size={16} />
          </Button>
        </div>
      ),
    },
    {
      key: "actions",
      label: "Thao tác",
      render: (c) => (
        <div className="actions">
          <Button variant="ghost" onClick={() => setEditing(c)}>
            Chỉnh sửa
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              mutation(
                () => service.saveCatalog(kind, { ...c, hidden: !c.hidden }),
                c.hidden ? "Đã hiện danh mục." : "Đã ẩn danh mục.",
              )
            }
          >
            {c.hidden ? "Hiện" : "Ẩn"}
          </Button>
        </div>
      ),
    },
  ];
  return (
    <>
      <PageHeading
        title="Danh mục dùng chung"
        description="Danh mục ẩn vẫn gắn với các phòng đang sử dụng. Tên và đường dẫn có định danh ổn định."
        action={
          <Button
            onClick={() =>
              setEditing({
                id: crypto.randomUUID(),
                name: "",
                slug: "",
                hidden: false,
                order: Math.max(-1, ...rows.map((r) => r.order)) + 1,
                image: kind === "types" ? "/images/daylight.jpg" : "",
              })
            }
          >
            <Plus size={16} /> Thêm danh mục
          </Button>
        }
      />
      <div className="tabs" role="tablist" aria-label="Loại danh mục">
        <button
          role="tab"
          aria-selected={kind === "types"}
          onClick={() => update({ tab: "types" })}
        >
          Loại Studio
        </button>
        <button
          role="tab"
          aria-selected={kind === "amenities"}
          onClick={() => update({ tab: "amenities" })}
        >
          Tiện ích
        </button>
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        id={(c) => c.id}
        label="Danh mục dùng chung"
      />
      {editing && (
        <EntityDialog
          key={`${kind}-${editing.id}`}
          title="Chỉnh sửa danh mục"
          initial={editing}
          fields={fields}
          onClose={() => setEditing(null)}
          onSave={(values) =>
            service.saveCatalog(kind, { ...editing, ...values } as Catalog)
          }
        />
      )}
    </>
  );
}
const entityLabels: Record<string, string> = {
  user: "Tài khoản",
  booking: "Đơn thuê",
  studio: "Studio",
  room: "Phòng",
  equipment: "Thiết bị",
  rate: "Bảng giá",
  types: "Loại Studio",
  amenities: "Tiện ích",
};
const stateLabel = (value: string) =>
  (
    ({
      active: "Hoạt động",
      locked: "Bị khóa",
      pending: "Chờ xử lý",
      approved: "Đã duyệt",
      rejected: "Từ chối",
      cancelled: "Đã hủy",
      confirmed: "Đã xác nhận",
      completed: "Hoàn thành",
      visible: "Hiển thị",
      hidden: "Ẩn",
      new: "Mới",
      paused: "Tạm ngừng",
      "pending-confirmation": "Chờ xác nhận",
      "awaiting-deposit": "Chờ đặt cọc",
    }) as Record<string, string>
  )[value] ?? value;
export function AdminAudit() {
  const { db } = useApp(),
    { params, update } = useUrlState();
  if (!db) return null;
  const rows = db.audit
    .filter(
      (e) =>
        (!params.get("actor") || e.actorId === params.get("actor")) &&
        (!params.get("type") || e.entityType === params.get("type")) &&
        (!params.get("q") ||
          normalize(`${e.entityId} ${e.summary}`).includes(
            normalize(params.get("q")!),
          )) &&
        (!params.get("from") || e.at >= vietnamInstant(params.get("from")!)) &&
        (!params.get("to") ||
          e.at < vietnamInstant(addDays(params.get("to")!, 1))) &&
        (!params.get("action") || e.action === params.get("action")),
    )
    .sort((a, b) => b.at - a.at);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const columns: Column<DomainEvent>[] = [
    {
      key: "time",
      label: "Thời gian Việt Nam",
      render: (e) => dateTime(e.at),
      sort: (e) => e.at,
    },
    {
      key: "actor",
      label: "Người thực hiện",
      render: (e) => (
        <>
          <strong>{e.actorName}</strong>
          <small>{roleLabels[e.role]}</small>
        </>
      ),
    },
    { key: "action", label: "Hành động", render: (e) => e.action },
    {
      key: "entity",
      label: "Đối tượng",
      render: (e) => (
        <>
          {entityLabels[e.entityType] ?? e.entityType}
          <small>{e.entityId}</small>
        </>
      ),
    },
    {
      key: "detail",
      label: "Nội dung",
      render: (e) => (
        <details className="audit-details">
          <summary>{e.summary}</summary>
          <dl>
            {e.previous && (
              <>
                <dt>Trước</dt>
                <dd>{stateLabel(e.previous)}</dd>
              </>
            )}
            {e.next && (
              <>
                <dt>Sau</dt>
                <dd>{stateLabel(e.next)}</dd>
              </>
            )}
            {e.reason && (
              <>
                <dt>Lý do</dt>
                <dd>{e.reason}</dd>
              </>
            )}
          </dl>
        </details>
      ),
    },
  ];
  return (
    <>
      <PageHeading
        title="Nhật ký hoạt động"
        description="Lịch sử thao tác quản lý được ghi thêm, không chỉnh sửa hoặc xóa qua giao diện."
      />
      <div className="list-filters audit-filters">
        <Field label="Mã hoặc nội dung" id="audit-q">
          <Input
            value={params.get("q") ?? ""}
            onChange={(e) => update({ q: e.target.value }, true)}
          />
        </Field>
        <Field label="Người thực hiện" id="audit-actor">
          <Select
            value={params.get("actor") ?? ""}
            onChange={(e) => update({ actor: e.target.value }, true)}
          >
            <option value="">Tất cả</option>
            {db.users
              .filter((u) => db.audit.some((e) => e.actorId === u.id))
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Đối tượng" id="audit-type">
          <Select
            value={params.get("type") ?? ""}
            onChange={(e) => update({ type: e.target.value }, true)}
          >
            <option value="">Tất cả</option>
            {Object.entries(entityLabels).map(([v, label]) => (
              <option value={v} key={v}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Hành động" id="audit-action">
          <Select
            value={params.get("action") ?? ""}
            onChange={(e) => update({ action: e.target.value }, true)}
          >
            <option value="">Tất cả</option>
            {[...new Set(db.audit.map((e) => e.action))].map((action) => (
              <option key={action}>{action}</option>
            ))}
          </Select>
        </Field>
        <Field label="Từ ngày" id="audit-from">
          <Input
            type="date"
            value={params.get("from") ?? ""}
            onChange={(e) => update({ from: e.target.value }, true)}
          />
        </Field>
        <Field label="Đến ngày" id="audit-to">
          <Input
            type="date"
            value={params.get("to") ?? ""}
            onChange={(e) => update({ to: e.target.value }, true)}
          />
        </Field>
      </div>
      <DataTable
        rows={rows.slice((page - 1) * 20, page * 20)}
        columns={columns}
        id={(e) => e.id}
        label="Nhật ký quản trị"
      />
      <Pagination
        page={page}
        pageSize={20}
        total={rows.length}
        onChange={(page) => update({ page })}
      />
    </>
  );
}
export function AdminBookings({ code }: { code?: string }) {
  return code ? (
    <BookingDetail code={code} scope="admin" />
  ) : (
    <BookingList scope="admin" />
  );
}
