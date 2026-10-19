import { PaymentPage } from "@/features/payment/payment-page";
export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <PaymentPage code={code} result />;
}
