import { BookingWizard } from "@/features/booking/booking-wizard";
import { BackendBookingWizard } from "@/features/booking/backend-booking";
import { backendEnabled } from "@/services/api/client";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return backendEnabled ? <BackendBookingWizard id={id} /> : <BookingWizard slug={id} />;
}
