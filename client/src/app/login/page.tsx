import { AuthPage } from "@/features/auth/auth-page";
export const metadata = {
  title: "Đăng nhập",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <AuthPage mode="login" />;
}
