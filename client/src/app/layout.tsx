import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "@fontsource/ibm-plex-mono/vietnamese-400.css";
import "./globals.css";
import "./editorial.css";
import "./marketplace-soft.css";
import "./motion.css";
import "./explore.css";
import { motionTokenCSS } from "@/components/motion/tokens";
import { Provider } from "@/components/store";
import { ApiSessionProvider } from "@/components/api-session";
import { HelpdeskWidget } from "@/features/helpdesk";
export const metadata: Metadata = {
  title: "StudioHub — Không gian cho ý tưởng của bạn",
  description:
    "Khám phá, so sánh và gửi yêu cầu đặt thuê không gian sáng tạo tại StudioHub.",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head><style id="studiohub-motion-tokens">{motionTokenCSS}</style></head>
      <body>
        <ApiSessionProvider><Provider>{children}</Provider></ApiSessionProvider>
        <HelpdeskWidget />
      </body>
    </html>
  );
}
