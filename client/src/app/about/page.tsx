import type { Metadata } from "next";
import Application from "@/components/application";

export const metadata: Metadata = {
  title: "Về chúng tôi | StudioHub",
  description: "Tìm hiểu về StudioHub và nhóm 5 sinh viên cùng phát triển dự án tìm kiếm, đặt thuê không gian sáng tạo.",
};

export default function Page() { return <Application/>; }
