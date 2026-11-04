"use client";

import Link from "next/link";
import { useApp } from "@/providers/app-provider";
import { Badge, EmptyState, PageHeading } from "@/components/shared/common";
import { DataTable, type Column } from "@/components/data-table/table";
import { money, unitLabels } from "@/lib/format";
import type { Equipment } from "@/domain/schema";

const roleDescriptions = [
  { role: "customer", label: "Khách hàng", access: "Tìm Studio, đặt thuê và quản lý đơn của mình." },
  { role: "host", label: "Chủ Studio", access: "Quản lý Studio, phòng, thiết bị, giá và đơn thuê." },
  { role: "admin", label: "Quản trị viên", access: "Duyệt hồ sơ và giám sát tài khoản, tài nguyên, đơn thuê." },
] as const;

export function AdminRoles() {
  const { db } = useApp();
  if (!db) return null;
  return (
    <>
      <PageHeading
        eyebrow="QUẢN TRỊ STUDIOHUB"
        title="Vai trò truy cập"
        description="Ba vai trò cố định của bản demo. Vai trò được cấp qua đăng ký hoặc xét duyệt; không thể chuyển vai trò hay giả lập tài khoản khác."
      />
      <section className="surface">
        <div className="table-scroll" role="region" aria-label="Vai trò truy cập — cuộn ngang để xem đủ cột" tabIndex={0}>
          <table>
            <caption className="sr-only">Vai trò truy cập và số tài khoản</caption>
            <thead><tr><th scope="col">Vai trò</th><th scope="col">Tài khoản</th><th scope="col">Quyền hạn</th></tr></thead>
            <tbody>
              {roleDescriptions.map((item) => (
                <tr key={item.role}>
                  <th scope="row">{item.label}</th>
                  <td>{db.users.filter((user) => user.role === item.role).length}</td>
                  <td>{item.access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function AdminEquipments() {
  const { db } = useApp();
  if (!db) return null;
  const studios = new Map(
    db.studios.map((studio) => [studio.id, studio] as const),
  );
  const rows = db.equipment;
  const columns: Column<Equipment>[] = [
    { key: "name", label: "Thiết bị / nội thất", render: (item) => <strong>{item.name}</strong>, sort: (item) => item.name },
    { key: "studio", label: "Studio", render: (item) => {
      const studio = studios.get(item.studioId);
      return studio ? <Link className="text-link" href={`/admin/studios/${studio.id}`}>{studio.name}</Link> : "Studio không tồn tại";
    }, sort: (item) => studios.get(item.studioId)?.name ?? "" },
    { key: "category", label: "Nhóm", render: (item) => item.category === "equipment" ? "Thiết bị" : "Nội thất" },
    { key: "stock", label: "Tồn kho", render: (item) => item.quantity, sort: (item) => item.quantity },
    { key: "price", label: "Giá thuê", render: (item) => <>{money(item.price)} / {unitLabels[item.unit]}</>, sort: (item) => item.price },
    { key: "status", label: "Trạng thái", render: (item) => <Badge tone={item.status === "available" ? "success" : item.status === "maintenance" ? "warning" : "neutral"}>{item.status === "available" ? "Đang cho thuê" : item.status === "maintenance" ? "Bảo trì" : "Đã ẩn"}</Badge> },
  ];
  return (
    <>
      <PageHeading
        eyebrow="QUẢN TRỊ STUDIOHUB"
        title="Thiết bị & nội thất"
        description="Danh mục thiết bị được khai báo tại các Studio. Mở Studio để kiểm tra thông tin phòng và tài nguyên liên quan."
      />
      <section className="surface">
        {!rows.length ? <EmptyState title="Chưa có thiết bị hoặc nội thất" description="Tài nguyên sẽ xuất hiện ở đây khi Chủ Studio khai báo." /> : <DataTable rows={rows} columns={columns} id={(item) => item.id} label="Thiết bị và nội thất trên hệ thống" />}
      </section>
    </>
  );
}
