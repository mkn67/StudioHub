import { HostBookings } from "@/features/host/operations";
export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <HostBookings code={code} />;
}
