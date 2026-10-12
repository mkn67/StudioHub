'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Camera,
  Calendar,
  CreditCard,
  Building2,
  Search,
  Sparkles,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  // If inside Host Portal, Host Portal has its own Master Layout
  if (pathname.startsWith('/host')) {
    return null;
  }

  const navItems = [
    { href: '/', label: 'Tìm Studio & Phòng', icon: Search },
    { href: '/rooms/room-artemis-01', label: 'Xem chi tiết & Lịch ca', icon: Calendar },
    { href: '/checkout', label: 'Thanh toán Sandbox', icon: CreditCard },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#FFFFFF] border-b border-[#E8E8E8] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand (Chuẩn Nhà Tốt / Chợ Tốt) */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#F89C1E] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-[#222222]">
                  Studio<span className="text-[#F89C1E]">Tốt</span>
                </span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-[#FFF4E6] text-[#F89C1E] border border-[#F89C1E]/30">
                  MARKETPLACE
                </span>
              </div>
              <p className="text-[11px] text-[#8C8C8C] hidden sm:block">Thuê phòng studio &amp; thiết bị theo ca</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-[#FFF4E6] text-[#F89C1E]'
                      : 'text-[#4A4A4A] hover:text-[#222222] hover:bg-[#F4F4F4]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Action Button: Dành cho Chủ Studio (Host Portal) */}
          <div className="flex items-center gap-3">
            <Link
              href="/host"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#F89C1E] hover:bg-[#e08914] text-white shadow-sm transition-all hover:scale-[1.02] active:scale-95"
            >
              <Building2 className="w-4 h-4 text-white" />
              <span>Dành cho Chủ Studio</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
