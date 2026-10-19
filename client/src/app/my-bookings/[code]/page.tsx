import { CustomerBookings } from "@/features/customer-bookings/bookings";
export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <CustomerBookings code={code} />;
}
