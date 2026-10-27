import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "@fontsource/ibm-plex-mono/vietnamese-400.css";
import "./globals.css";
import "./editorial.css";
import "./motion.css";
import { motionTokenCSS } from "@/components/motion/tokens";
import { Provider } from "@/components/store";
import { HelpdeskWidget } from "@/features/helpdesk";
export const metadata: Metadata = {
  title: "StudioHub — Không gian cho ý tưởng của bạn",
  description:
    "Khám phá và đặt thuê phòng Studio. Bản frontend minh họa với thanh toán mô phỏng.",
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
        <Provider>{children}</Provider>
        <HelpdeskWidget />
      </body>
    </html>
  );
}
