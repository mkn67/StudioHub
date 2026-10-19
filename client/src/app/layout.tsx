import type { Metadata } from "next";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "./globals.css";
import "./dashboard.css";
import { Suspense } from "react";
import { AppProvider } from "@/providers/app-provider";
import { RouteFrame } from "@/components/layout/navigation";
export const metadata: Metadata = {
  title: {
    default: "StudioHub · Tìm studio, đặt theo giờ.",
    template: "%s | StudioHub",
  },
  description:
    "Tìm không gian chụp ảnh, quay phim và podcast. Trải nghiệm đặt studio theo giờ trong bản demo StudioHub.",
  metadataBase: new URL("http://localhost:3000"),
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body>
        <a href="#main-content" className="skip-link">
          Đi đến nội dung chính
        </a>
        <AppProvider>
          <Suspense
            fallback={<div className="container">Đang tải StudioHub…</div>}
          >
            <div>
              <RouteFrame>{children}</RouteFrame>
            </div>
          </Suspense>
        </AppProvider>
      </body>
    </html>
  );
}
