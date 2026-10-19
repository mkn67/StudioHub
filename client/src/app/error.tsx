"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main id="main-content" tabIndex={-1} className="container recovery">
      <h1>Không thể mở trang này</h1>
      <p>Có lỗi khi hiển thị nội dung. Dữ liệu demo đã lưu vẫn được giữ.</p>
      <Button onClick={reset}>Thử lại</Button>
    </main>
  );
}
