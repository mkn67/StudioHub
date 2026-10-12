'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileCode,
  Search,
  CalendarCheck,
  PackagePlus,
  CreditCard,
  LayoutDashboard,
  Sparkles,
  X,
} from 'lucide-react';

export default function ReportFlowNavigator() {
  const pathname = usePathname();
  const [minimized, setMinimized] = useState(false);

  const flows = [
    {
      num: '1',
      title: 'Màn hình 1: Tìm kiếm & Lọc dạng Pill',
      req: 'FR-11, FR-12',
      href: '/',
      icon: Search,
    },
    {
      num: '2',
      title: 'Màn hình 2: Chi tiết & Lịch Time-slot',
      req: 'Slot Grid',
      href: '/rooms/room-artemis-01',
      icon: CalendarCheck,
    },
    {
      num: '3',
      title: 'Màn hình 3: Thêm thiết bị dùng chung',
      req: 'Add-ons',
      href: '/rooms/room-artemis-01#equipment-section',
      icon: PackagePlus,
    },
    {
      num: '4',
      title: 'Màn hình 4: Xác nhận & Thanh toán Sandbox',
      req: 'VietQR',
      href: '/checkout',
      icon: CreditCard,
    },
    {
      num: '5',
      title: 'Màn hình 5: Host Portal (Timeline & Cọc)',
      req: 'Quản lý',
      href: '/host',
      icon: LayoutDashboard,
    },
  ];

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 bg-[#F89C1E] hover:bg-[#e08914] text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg border border-white/20 transition-all hover:scale-105"
        >
          <FileCode className="w-4 h-4 text-white" />
          <span>Mở 5 Màn hình Báo cáo (Chương 3.4)</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] border-b border-[#E8E8E8] text-[#222222] text-xs py-2 px-4 sticky top-16 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1 rounded bg-[#FFF4E6] text-[#F89C1E]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-[#222222]">5 Màn hình Core Flows (Chương 3.4):</span>
            <span className="text-[#8C8C8C] ml-1.5 hidden sm:inline">Chuẩn UI Nhà Tốt</span>
          </div>
        </div>

        {/* 5 Flow Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none">
          {flows.map((f) => {
            const Icon = f.icon;
            const isActive = pathname === f.href || (f.href !== '/' && pathname.startsWith(f.href) && !f.href.includes('#'));
            return (
              <Link
                key={f.num}
                href={f.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 text-xs font-semibold transition-all border ${
                  isActive
                    ? 'bg-[#FFF4E6] text-[#F89C1E] border-[#F89C1E] shadow-xs'
                    : 'bg-[#F4F4F4] text-[#4A4A4A] border-[#E8E8E8] hover:bg-[#EBEBEB] hover:text-[#222222]'
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-[#E8E8E8] text-[9px] font-bold flex items-center justify-center text-[#4A4A4A]">
                  {f.num}
                </span>
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate">{f.title}</span>
              </Link>
            );
          })}
        </div>

        {/* Close Button */}
        <button
          onClick={() => setMinimized(true)}
          className="text-[#8C8C8C] hover:text-[#222222] p-1 rounded hover:bg-[#F4F4F4] text-xs hidden lg:flex items-center gap-1"
          title="Thu gọn thanh này"
        >
          <span>Thu gọn</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
