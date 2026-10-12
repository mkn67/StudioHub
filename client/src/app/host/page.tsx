'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  INITIAL_HOST_BOOKINGS,
  SAMPLE_ROOMS,
  SAMPLE_TIME_SLOTS,
  BookingOrder,
} from '@/lib/mock-data';
import {
  FileText,
  Calendar,
  Layers,
  Package,
  TrendingUp,
  Clock,
  CheckCircle2,
  DollarSign,
  Building2,
  Home,
  ChevronRight,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function HostDashboardPage() {
  const [activeTab, setActiveTab] = useState<'bookings' | 'timeline' | 'overview'>('bookings');
  const [bookings, setBookings] = useState<BookingOrder[]>(INITIAL_HOST_BOOKINGS);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTimelineDate, setSelectedTimelineDate] = useState<string>('2026-10-06');

  // Load bookings created from Checkout
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const custom = localStorage.getItem('HOST_PORTAL_CUSTOM_BOOKINGS');
      if (custom) {
        try {
          const parsed = JSON.parse(custom) as BookingOrder[];
          const existingIds = new Set(INITIAL_HOST_BOOKINGS.map((b) => b.id));
          const toAdd = parsed.filter((b) => !existingIds.has(b.id));
          setBookings([...toAdd, ...INITIAL_HOST_BOOKINGS]);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // 4-step State Machine: Tiếp nhận -> Đã check-in -> Hoàn thành -> Đã hoàn cọc
  const advanceBookingStatus = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== bookingId) return b;

        let nextStatus: BookingOrder['bookingStatus'] = b.bookingStatus;
        if (b.bookingStatus === 'pending') {
          nextStatus = 'checked_in';
        } else if (b.bookingStatus === 'checked_in') {
          nextStatus = 'completed';
        } else if (b.bookingStatus === 'completed') {
          nextStatus = 'deposit_refunded';
        }

        return {
          ...b,
          bookingStatus: nextStatus,
        };
      })
    );
  };

  const resetBookingStatus = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, bookingStatus: 'pending' } : b))
    );
  };

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter === 'all') return true;
    return b.bookingStatus === statusFilter;
  });

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getStatusBadge = (status: BookingOrder['bookingStatus']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF4E6] text-[#F89C1E] border border-[#F89C1E]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F89C1E] animate-pulse" />
            1. Tiếp nhận
          </span>
        );
      case 'checked_in':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E3F2FD] text-[#1976D2] border border-[#90CAF9]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1976D2]" />
            2. Đã check-in
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EDE7F6] text-[#5E35B1] border border-[#D1C4E9]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5E35B1]" />
            3. Hoàn thành
          </span>
        );
      case 'deposit_refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
            4. Đã hoàn cọc
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F4] text-[#222222] flex flex-col md:flex-row">
      {/* ================= FIXED LEFT SIDEBAR (MASTER LAYOUT HOST CHUẨN LIGHT) ================= */}
      <aside className="w-full md:w-64 bg-[#FFFFFF] border-r border-[#E8E8E8] shrink-0 flex flex-col justify-between p-4 md:sticky md:top-0 md:h-screen">
        <div>
          {/* Host Portal Brand */}
          <div className="flex items-center gap-2.5 pb-5 border-b border-[#E8E8E8]">
            <div className="w-9 h-9 rounded-xl bg-[#F89C1E] flex items-center justify-center text-white font-bold shadow-xs">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-[#222222]">Host Portal</h2>
              <span className="text-[11px] text-[#F89C1E] font-bold">Artemis Creative Hub</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="mt-5 space-y-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                activeTab === 'bookings'
                  ? 'bg-[#FFF4E6] text-[#F89C1E] font-bold shadow-xs'
                  : 'text-[#4A4A4A] hover:bg-[#F4F4F4] hover:text-[#222222]'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Quản lý Đơn thuê &amp; Cọc</span>
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                activeTab === 'timeline'
                  ? 'bg-[#FFF4E6] text-[#F89C1E] font-bold shadow-xs'
                  : 'text-[#4A4A4A] hover:bg-[#F4F4F4] hover:text-[#222222]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Lịch biểu Time-slot (Timeline)</span>
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#FFF4E6] text-[#F89C1E] font-bold shadow-xs'
                  : 'text-[#4A4A4A] hover:bg-[#F4F4F4] hover:text-[#222222]'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Báo cáo Doanh thu &amp; Lấp đầy</span>
            </button>

            <div className="pt-4 pb-1 text-[10px] uppercase font-bold text-[#8C8C8C] px-3">
              Cấu hình cơ sở
            </div>

            <div className="px-3 py-2 rounded-xl text-[#8C8C8C] flex items-center gap-2.5 opacity-60">
              <Layers className="w-4 h-4" />
              <span>Quản lý phòng &amp; Bảng giá</span>
            </div>

            <div className="px-3 py-2 rounded-xl text-[#8C8C8C] flex items-center gap-2.5 opacity-60">
              <Package className="w-4 h-4" />
              <span>Kho thiết bị dùng chung</span>
            </div>
          </nav>
        </div>

        {/* Switch back to Customer Portal */}
        <div className="pt-4 border-t border-[#E8E8E8] space-y-2">
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold bg-[#F4F4F4] hover:bg-[#E8E8E8] text-[#222222] border border-[#E8E8E8] transition-all"
          >
            <Home className="w-3.5 h-3.5 text-[#F89C1E]" />
            <span>Về Giao diện Khách hàng</span>
          </Link>
          <p className="text-[10px] text-[#8C8C8C] text-center">
            Master Layout Host • Sidebar cố định
          </p>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA (CHUẨN LIGHT MARKETPLACE) ================= */}
      <main className="flex-1 min-w-0 flex flex-col bg-[#F4F4F4]">
        {/* Top Header */}
        <header className="h-14 bg-[#FFFFFF] border-b border-[#E8E8E8] px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8C8C8C]">Host Portal</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#8C8C8C]" />
            <span className="text-[#222222] font-bold">
              {activeTab === 'bookings'
                ? 'Mục 3.4.3.5 • Quản lý Đơn thuê & Chuyển trạng thái 4 bước'
                : activeTab === 'timeline'
                ? 'Mục 3.4.3.5 • Lịch biểu Timeline toàn cơ sở'
                : 'Tổng quan chỉ số hoạt động'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#E8F5E9] border border-[#C8E6C9] px-2.5 py-1 rounded-lg text-xs font-semibold text-[#2E7D32]">
              <span className="w-2 h-2 rounded-full bg-[#2E7D32]" />
              <span>Studio đang mở cửa</span>
            </div>
          </div>
        </header>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-6 max-w-7xl">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#FFFFFF] border border-[#E8E8E8] p-4 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-[#8C8C8C] mb-1">
                <span className="text-xs font-semibold">Doanh thu ca thuê</span>
                <DollarSign className="w-4 h-4 text-[#F89C1E]" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#D0021B]">
                {formatVND(bookings.reduce((sum, b) => sum + b.subtotal, 0))}
              </div>
              <span className="text-[11px] text-[#2E7D32] flex items-center gap-1 mt-1 font-semibold">
                <TrendingUp className="w-3 h-3" /> +18.4% tuần này
              </span>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E8E8E8] p-4 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-[#8C8C8C] mb-1">
                <span className="text-xs font-semibold">Tổng lượt đặt</span>
                <Calendar className="w-4 h-4 text-[#F89C1E]" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#222222]">{bookings.length} đơn</div>
              <span className="text-[11px] text-[#F89C1E] mt-1 block font-semibold">
                {bookings.filter((b) => b.bookingStatus === 'pending').length} đơn đang chờ tiếp nhận
              </span>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E8E8E8] p-4 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-[#8C8C8C] mb-1">
                <span className="text-xs font-semibold">Tỷ lệ lấp đầy</span>
                <Clock className="w-4 h-4 text-[#1976D2]" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#222222]">82.5%</div>
              <span className="text-[11px] text-[#8C8C8C] mt-1 block">Cao điểm ca chiều &amp; tối</span>
            </div>

            <div className="bg-[#FFFFFF] border border-[#E8E8E8] p-4 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-[#8C8C8C] mb-1">
                <span className="text-xs font-semibold">Cần duyệt hoàn cọc</span>
                <ShieldCheck className="w-4 h-4 text-[#F89C1E]" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#F89C1E]">
                {bookings.filter((b) => b.bookingStatus === 'completed').length} ca
              </div>
              <span className="text-[11px] text-[#8C8C8C] mt-1 block">Cần kiểm tra thiết bị bàn giao</span>
            </div>
          </div>

          {/* TAB 1: BẢNG QUẢN LÝ ĐƠN THUÊ & CHUYỂN TRẠNG THÁI 4 BƯỚC */}
          <section className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E8E8] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#222222] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#F89C1E]" />
                  Bảng Quản Lý Đơn Thuê &amp; Chuyển Trạng Thái (Quy trình 4 bước)
                </h3>
                <p className="text-xs text-[#8C8C8C] mt-0.5">
                  Nghiệp vụ: <strong className="text-[#F89C1E]">1. Tiếp nhận</strong> ➔{' '}
                  <strong className="text-[#1976D2]">2. Đã check-in</strong> ➔{' '}
                  <strong className="text-[#5E35B1]">3. Hoàn thành</strong> ➔{' '}
                  <strong className="text-[#2E7D32]">4. Đã hoàn cọc</strong>.
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 bg-[#F4F4F4] p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    statusFilter === 'all' ? 'bg-[#FFFFFF] text-[#222222] shadow-xs' : 'text-[#8C8C8C]'
                  }`}
                >
                  Tất cả ({bookings.length})
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    statusFilter === 'pending' ? 'bg-[#FFFFFF] text-[#F89C1E] shadow-xs' : 'text-[#8C8C8C]'
                  }`}
                >
                  Tiếp nhận
                </button>
                <button
                  onClick={() => setStatusFilter('checked_in')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    statusFilter === 'checked_in' ? 'bg-[#FFFFFF] text-[#1976D2] shadow-xs' : 'text-[#8C8C8C]'
                  }`}
                >
                  Đã check-in
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    statusFilter === 'completed' ? 'bg-[#FFFFFF] text-[#5E35B1] shadow-xs' : 'text-[#8C8C8C]'
                  }`}
                >
                  Hoàn thành
                </button>
                <button
                  onClick={() => setStatusFilter('deposit_refunded')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    statusFilter === 'deposit_refunded' ? 'bg-[#FFFFFF] text-[#2E7D32] shadow-xs' : 'text-[#8C8C8C]'
                  }`}
                >
                  Đã hoàn cọc
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#4A4A4A]">
                <thead className="bg-[#F4F4F4] text-[#8C8C8C] uppercase text-[10px] tracking-wider border-b border-[#E8E8E8]">
                  <tr>
                    <th className="py-2.5 px-3">Mã đơn / Ngày</th>
                    <th className="py-2.5 px-3">Khách thuê &amp; Phòng</th>
                    <th className="py-2.5 px-3">Ca thuê</th>
                    <th className="py-2.5 px-3">Thiết bị kèm</th>
                    <th className="py-2.5 px-3">Tổng tiền / Cọc 30%</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                    <th className="py-2.5 px-3 text-right">Thao tác chuyển bước</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E8] font-medium">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F9F9F9] transition-colors">
                      <td className="py-3 px-3 font-mono">
                        <strong className="text-[#222222] block">{b.bookingCode}</strong>
                        <span className="text-[10px] text-[#8C8C8C]">{b.selectedDate}</span>
                      </td>

                      <td className="py-3 px-3">
                        <strong className="text-[#222222] block">{b.customerName}</strong>
                        <span className="text-[11px] text-[#8C8C8C] block">{b.customerPhone}</span>
                        <span className="text-[11px] text-[#F89C1E] block truncate max-w-[150px]">{b.room.name}</span>
                      </td>

                      <td className="py-3 px-3">
                        {b.selectedSlots.map((s, idx) => (
                          <span key={idx} className="block font-mono text-[11px] text-[#222222]">
                            Ca {s.slotNumber}: {s.timeRange}
                          </span>
                        ))}
                      </td>

                      <td className="py-3 px-3">
                        {b.selectedEquipments && b.selectedEquipments.length > 0 ? (
                          <div className="space-y-0.5 text-[11px]">
                            {b.selectedEquipments.map((item, idx) => (
                              <div key={idx}>
                                • {item.quantity}x {item.equipment.name.split(' ')[0]} {item.equipment.name.split(' ')[1]}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#8C8C8C] italic text-[11px]">Không</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[#D0021B] font-bold block">{formatVND(b.subtotal)}</span>
                        <span className="text-[10px] text-[#8C8C8C] block">
                          Cọc: {formatVND(b.depositAmount)}
                        </span>
                      </td>

                      <td className="py-3 px-3">{getStatusBadge(b.bookingStatus)}</td>

                      <td className="py-3 px-3 text-right">
                        {b.bookingStatus === 'pending' && (
                          <button
                            type="button"
                            onClick={() => advanceBookingStatus(b.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1976D2] hover:bg-[#1565C0] text-white shadow-xs transition-all"
                          >
                            <span>Xác nhận Check-in</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {b.bookingStatus === 'checked_in' && (
                          <button
                            type="button"
                            onClick={() => advanceBookingStatus(b.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#5E35B1] hover:bg-[#512DA8] text-white shadow-xs transition-all"
                          >
                            <span>Hoàn thành ca</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {b.bookingStatus === 'completed' && (
                          <button
                            type="button"
                            onClick={() => advanceBookingStatus(b.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2E7D32] hover:bg-[#1B5E20] text-white shadow-xs transition-all"
                          >
                            <span>Hoàn cọc</span>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {b.bookingStatus === 'deposit_refunded' && (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-[#2E7D32] text-xs font-semibold">✓ Đã đóng đơn</span>
                            <button
                              onClick={() => resetBookingStatus(b.id)}
                              title="Reset để test lại"
                              className="text-[#8C8C8C] hover:text-[#222222] p-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* TAB 2: TIMELINE CALENDAR VIEW */}
          <section className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E8E8] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#222222] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#F89C1E]" />
                  Lịch Biểu Timeline Theo Ngày (Toàn cơ sở)
                </h3>
                <p className="text-xs text-[#8C8C8C] mt-0.5">
                  Trực quan hóa tình trạng từng ca và khoảng đệm 30 phút dọn vệ sinh.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8C8C8C]">Chọn ngày:</span>
                <input
                  type="date"
                  value={selectedTimelineDate}
                  onChange={(e) => setSelectedTimelineDate(e.target.value)}
                  className="bg-[#F4F4F4] border border-[#E8E8E8] rounded-lg px-2.5 py-1 text-xs text-[#222222] font-bold cursor-pointer"
                />
              </div>
            </div>

            {/* Matrix */}
            <div className="space-y-3">
              {SAMPLE_ROOMS.slice(0, 3).map((r, rIdx) => (
                <div key={r.id} className="p-3.5 rounded-xl border border-[#E8E8E8] bg-[#F9F9F9]">
                  <div className="flex items-center justify-between mb-2">
                    <strong className="text-xs text-[#222222]">{r.name}</strong>
                    <span className="text-[11px] text-[#8C8C8C]">{r.area}m² • {r.soundproof}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {SAMPLE_TIME_SLOTS.map((slot, sIdx) => {
                      const isOccupied = (rIdx === 0 && sIdx === 1) || (rIdx === 1 && (sIdx === 0 || sIdx === 1)) || (rIdx === 2 && sIdx === 3);

                      return (
                        <div
                          key={slot.id}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            isOccupied
                              ? 'bg-[#EEEEEE] border-[#D1D5DB] text-[#8C8C8C]'
                              : 'bg-[#FFFFFF] border-[#C8E6C9] text-[#222222]'
                          }`}
                        >
                          <span className="text-[10px] text-[#8C8C8C] block">Ca {slot.slotNumber}</span>
                          <span className={`text-xs font-bold block ${isOccupied ? 'line-through text-[#8C8C8C]' : 'text-[#222222]'}`}>
                            {slot.timeRange}
                          </span>
                          <span
                            className={`text-[10px] font-semibold mt-1 inline-block px-1.5 py-0.2 rounded ${
                              isOccupied ? 'bg-[#E0E0E0] text-[#8C8C8C]' : 'bg-[#E8F5E9] text-[#2E7D32]'
                            }`}
                          >
                            {isOccupied ? 'Có khách' : 'Trống'}
                          </span>
                          <span className="text-[9px] text-[#F89C1E] block mt-0.5">Đệm 30p</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
