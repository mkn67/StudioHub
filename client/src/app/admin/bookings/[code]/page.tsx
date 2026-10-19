import { AdminBookings } from "@/features/admin/admin-pages";
export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <AdminBookings code={code} />;
}
