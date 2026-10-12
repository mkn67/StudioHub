'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Camera, ShieldCheck, Clock, MapPin } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  if (pathname.startsWith('/host')) {
    return null;
  }

  return (
    <footer className="bg-[#FFFFFF] border-t border-[#E8E8E8] text-[#4A4A4A] text-xs sm:text-sm mt-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1 */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#F89C1E] flex items-center justify-center text-white font-bold">
                <Camera className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-[#222222] text-base">
                Studio<span className="text-[#F89C1E]">Tốt</span>
              </span>
            </div>
            <p className="text-[#8C8C8C] text-xs leading-relaxed">
              Thương mại điện tử cho thuê Studio &amp; Thiết bị theo ca. Chuẩn thiết kế Marketplace Nhà Tốt / Chợ Tốt.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#2E7D32] bg-[#E8F5E9] border border-[#C8E6C9] px-2.5 py-1.5 rounded-lg w-fit">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Chính sách cọc &amp; hoàn cọc 30% minh bạch</span>
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="font-bold text-[#222222] text-sm mb-3">5 Màn hình Core Flow (Chương 3.4)</h4>
            <ul className="space-y-2 text-xs text-[#4A4A4A]">
              <li>
                <Link href="/" className="hover:text-[#F89C1E] transition-colors">
                  1. Trang chủ &amp; Bộ lọc Pill / Chips (FR-11, FR-12)
                </Link>
              </li>
              <li>
                <Link href="/rooms/room-artemis-01" className="hover:text-[#F89C1E] transition-colors">
                  2. Chi tiết phòng &amp; Lịch Time-slot (Đệm 30p)
                </Link>
              </li>
              <li>
                <Link href="/rooms/room-artemis-01#equipment-section" className="hover:text-[#F89C1E] transition-colors">
                  3. Danh mục thiết bị dùng chung (Add-ons)
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="hover:text-[#F89C1E] transition-colors">
                  4. Xác nhận đơn &amp; Cổng thanh toán Sandbox QR
                </Link>
              </li>
              <li>
                <Link href="/host" className="hover:text-[#F89C1E] transition-colors">
                  5. Bảng điều khiển Chủ Studio (Host Timeline &amp; Cọc)
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="font-bold text-[#222222] text-sm mb-3">Bảng màu chuẩn Marketplace</h4>
            <div className="space-y-2 text-xs text-[#4A4A4A]">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#F89C1E] border border-black/10"></span>
                <span>Thương hiệu: <strong className="text-[#222222]">#F89C1E</strong> (Cam Nhà Tốt)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#D0021B] border border-black/10"></span>
                <span>Giá tiền: <strong className="text-[#D0021B]">#D0021B</strong> (Đỏ tươi 18px)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#F4F4F4] border border-[#E8E8E8]"></span>
                <span>Nền web: <strong className="text-[#222222]">#F4F4F4</strong> &amp; Card <strong className="text-[#222222]">#FFFFFF</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#E8F5E9] border border-[#81C784]"></span>
                <span>Khung giờ: Trống (<strong className="text-[#2E7D32]">#E8F5E9</strong>) / Kín (<strong className="text-[#8C8C8C]">#EEEEEE</strong>)</span>
              </div>
            </div>
          </div>

          {/* Col 4 */}
          <div>
            <h4 className="font-bold text-[#222222] text-sm mb-3">Thông tin Đồ án</h4>
            <p className="text-xs text-[#8C8C8C] mb-2">Đồ án môn học: Phân tích &amp; Thiết kế Hệ thống Thông tin</p>
            <div className="space-y-1.5 text-xs text-[#4A4A4A]">
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#F89C1E]" />
                <span>TP. Hồ Chí Minh &amp; Hà Nội</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#F89C1E]" />
                <span>Hoạt động: 08:00 - 23:00 (Khóa theo ca 2h)</span>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E8E8E8] mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8C8C8C] gap-4">
          <p>© 2026 StudioTốt • Chuẩn Thiết kế Marketplace Bất Động Sản &amp; Studio</p>
          <p>
            Tuân thủ chuẩn <span className="text-[#222222] font-semibold">Chương 3.4 Báo cáo Hệ thống Thông tin</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
