import { EmptyState } from "@/components/shared/common";
export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="container">
      <EmptyState
        title="Không tìm thấy trang"
        description="Đường dẫn có thể đã thay đổi."
        href="/studios"
        action="Khám phá Studio"
      />
    </main>
  );
}
