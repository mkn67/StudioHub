'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Camera,
  Activity,
  Search,
  Building2,
  User as UserIcon,
  LogOut,
  LogIn,
  UserPlus,
  Shield,
  ChevronDown,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // If inside Host Portal, Host Portal has its own layout
  if (pathname.startsWith('/host')) {
    return null;
  }

  const navItems = [
    { href: '/', label: 'Danh mục Phòng', icon: Search },
    { href: '/health', label: 'Kiểm tra Hệ thống (Health)', icon: Activity },
  ];

  const handleLogout = async () => {
    await logout();
    setUserDropdownOpen(false);
    router.push('/');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">Admin</span>;
      case 'host':
        return <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">Host</span>;
      default:
        return <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">Khách</span>;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#FFFFFF] border-b border-[#E8E8E8] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#F89C1E] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-[#222222]">
                  Studio<span className="text-[#F89C1E]">Hub</span>
                </span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-[#FFF4E6] text-[#F89C1E] border border-[#F89C1E]/30">
                  MARKETPLACE
                </span>
              </div>
              <p className="text-[11px] text-[#8C8C8C] hidden sm:block">Thuê phòng studio &amp; thiết bị chuyên nghiệp</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
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

          {/* Auth & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                    {user.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <span>{user.full_name}</span>
                      {getRoleBadge(user.role)}
                    </div>
                    <div className="text-[10px] text-gray-500">{user.email}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                      <p className="text-xs font-bold text-gray-800">{user.full_name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                      <div className="mt-1">{getRoleBadge(user.role)}</div>
                    </div>

                    <Link
                      href="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <UserIcon className="w-4 h-4 text-gray-500" />
                      <span>Hồ sơ tài khoản</span>
                    </Link>

                    {user.role === 'host' && (
                      <Link
                        href="/host"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50"
                      >
                        <Building2 className="w-4 h-4 text-amber-600" />
                        <span>Kênh quản lý Host</span>
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 text-left border-t border-gray-100 mt-1"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 hover:text-black hover:bg-gray-100 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập</span>
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-[#F89C1E] hover:bg-[#e08914] text-white shadow-xs transition-all hover:scale-[1.02] active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Đăng ký</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
