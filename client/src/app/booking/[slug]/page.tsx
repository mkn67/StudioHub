import { BookingWizard } from "@/features/booking/booking-wizard";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <BookingWizard slug={slug} />;
}
