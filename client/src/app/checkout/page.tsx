import { BookingCheckout } from "@/features/booking/booking-wizard";

export const metadata = { robots: { index: false, follow: false } };

export default function Page() {
  return <BookingCheckout />;
}
