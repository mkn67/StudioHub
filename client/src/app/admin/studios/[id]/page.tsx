import { AdminStudioDetail } from "@/features/admin/admin-pages";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminStudioDetail id={id} />;
}
