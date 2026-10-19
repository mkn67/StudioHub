import fs from "node:fs";
import path from "node:path";
const entries = [
  [
    "booking/[slug]",
    "@/features/booking/booking-wizard",
    "BookingWizard",
    "slug",
  ],
  ["payment/[code]", "@/features/payment/payment-page", "PaymentPage", "code"],
  [
    "payment/[code]/result",
    "@/features/payment/payment-page",
    "PaymentPage",
    "code",
    "result",
  ],
  ["my-bookings", "@/features/customer-bookings/bookings", "CustomerBookings"],
  [
    "my-bookings/[code]",
    "@/features/customer-bookings/bookings",
    "CustomerBookings",
    "code",
  ],
  ["host", "@/features/host/operations", "HostOverview"],
  ["host/bookings", "@/features/host/operations", "HostBookings"],
  [
    "host/bookings/[code]",
    "@/features/host/operations",
    "HostBookings",
    "code",
  ],
  ["host/calendar", "@/features/host/operations", "HostCalendar"],
  ["host/rooms", "@/features/host/management", "HostRooms"],
  ["host/rooms/new", "@/features/host/management", "HostRoomForm"],
  ["host/rooms/[id]/edit", "@/features/host/management", "HostRoomForm", "id"],
  ["host/equipment", "@/features/host/management", "HostEquipment"],
  ["host/pricing", "@/features/host/management", "HostPricing"],
  ["host/analytics", "@/features/host/operations", "HostAnalytics"],
  ["host/studio/settings", "@/features/host/management", "HostSettings"],
  ["admin", "@/features/admin/admin-pages", "AdminOverview"],
  ["admin/approvals", "@/features/admin/admin-pages", "AdminApprovals"],
  ["admin/users", "@/features/admin/admin-pages", "AdminUsers"],
  ["admin/users/[id]", "@/features/admin/admin-pages", "AdminUserDetail", "id"],
  ["admin/studios", "@/features/admin/admin-pages", "AdminStudios"],
  [
    "admin/studios/[id]",
    "@/features/admin/admin-pages",
    "AdminStudioDetail",
    "id",
  ],
  ["admin/categories", "@/features/admin/admin-pages", "AdminCategories"],
  ["admin/bookings", "@/features/admin/admin-pages", "AdminBookings"],
  [
    "admin/bookings/[code]",
    "@/features/admin/admin-pages",
    "AdminBookings",
    "code",
  ],
  ["admin/audit", "@/features/admin/admin-pages", "AdminAudit"],
];
for (const [route, module, component, param, flag] of entries) {
  const dir = path.join("src/app", route);
  fs.mkdirSync(dir, { recursive: true });
  const filename = path.join(dir, "page.tsx");
  if (fs.existsSync(filename)) continue;
  const body = param
    ? `export default async function Page({params}:{params:Promise<{${param}:string}>}){const{${param}}=await params;return <${component} ${param}={${param}}${flag ? " " + flag : ""}/>;}\n`
    : `export default function Page(){return <${component}/>;}\n`;
  fs.writeFileSync(
    filename,
    `import {${component}} from "${module}";\n${body}`,
  );
}
for (const role of ["host", "admin"]) {
  fs.writeFileSync(
    `src/app/${role}/layout.tsx`,
    `import {DashboardShell} from "@/components/layout/dashboard-shell";\nexport const metadata={robots:{index:false,follow:false}};\nexport default function Layout({children}:{children:React.ReactNode}){return <DashboardShell role="${role}">{children}</DashboardShell>;}\n`,
  );
}
for (const route of ["booking", "payment", "my-bookings"]) {
  fs.mkdirSync(`src/app/${route}`, { recursive: true });
  fs.writeFileSync(
    `src/app/${route}/layout.tsx`,
    "export const metadata={robots:{index:false,follow:false}};\nexport default function Layout({children}:{children:React.ReactNode}){return children;}\n",
  );
}
console.log(`Created ${entries.length} route entries and private layouts.`);
