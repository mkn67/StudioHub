import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ReportFlowNavigator from '@/components/ReportFlowNavigator';

export const metadata: Metadata = {
  title: 'StudioSpace VN | Thuê Studio & Thiết bị Chuyên nghiệp (Chuẩn Nhà Tốt)',
  description: 'Nền tảng tìm kiếm và đặt lịch Studio chụp ảnh, quay phim theo khung giờ time-slot',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="antialiased min-h-screen bg-[#F4F4F4] text-[#222222] flex flex-col font-sans selection:bg-[#F89C1E] selection:text-white">
        <Navbar />
        <ReportFlowNavigator />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
