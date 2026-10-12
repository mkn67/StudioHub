'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  SAMPLE_ROOMS,
  SAMPLE_TIME_SLOTS,
  SAMPLE_EQUIPMENTS,
  Room,
  TimeSlot,
  Equipment,
} from '@/lib/mock-data';
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Package,
  Building2,
  ArrowRight,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();

  // Booking state from previous screen or defaults
  const [room, setRoom] = useState<Room>(SAMPLE_ROOMS[0]);
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-06');
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([SAMPLE_TIME_SLOTS[0]]);
  const [selectedEquipments, setSelectedEquipments] = useState<
    { equipment: Equipment; quantity: number }[]
  >([
    { equipment: SAMPLE_EQUIPMENTS[0], quantity: 1 },
  ]);

  // Customer form inputs
  const [customerName, setCustomerName] = useState<string>('Nguyễn Văn Tuấn (Photographer)');
  const [customerPhone, setCustomerPhone] = useState<string>('0908 776 543');
  const [customerEmail, setCustomerEmail] = useState<string>('tuan.visuals@gmail.com');
  const [customerNote, setCustomerNote] = useState<string>('Cần setup sẵn phông giấy trước 15 phút');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'sandbox_qr' | 'hold_slot'>('sandbox_qr');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [generatedBookingCode, setGeneratedBookingCode] = useState<string>('STD-2026-9901');

  // Load state from sessionStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('STUDIO_CHECKOUT_DATA');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const foundRoom = SAMPLE_ROOMS.find((r) => r.id === parsed.roomId) || SAMPLE_ROOMS[0];
          setRoom(foundRoom);
          setSelectedDate(parsed.selectedDate || '2026-10-06');

          const foundSlots = SAMPLE_TIME_SLOTS.filter((s) =>
            parsed.selectedSlotIds?.includes(s.id)
          );
          if (foundSlots.length > 0) setSelectedSlots(foundSlots);

          const eqList: { equipment: Equipment; quantity: number }[] = [];
          Object.entries(parsed.selectedEquipments || {}).forEach(([id, qty]) => {
            const num = qty as number;
            const eqObj = SAMPLE_EQUIPMENTS.find((e) => e.id === id);
            if (eqObj && num > 0) {
              eqList.push({ equipment: eqObj, quantity: num });
            }
          });
          setSelectedEquipments(eqList);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Cost calculations
  const slotCount = selectedSlots.length;
  const roomCost = slotCount * room.pricePerSlot;
  const equipmentCost = selectedEquipments.reduce(
    (sum, item) => sum + item.equipment.pricePerSlot * item.quantity * Math.max(1, slotCount),
    0
  );
  const subtotal = roomCost + equipmentCost;
  const depositAmount = Math.round(subtotal * 0.3); // 30% cọc
  const remainingAmount = subtotal - depositAmount;

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // Simulate payment completion
  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      const code = `STD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      setGeneratedBookingCode(code);

      // Save into created bookings for Host Portal to reflect dynamically
      if (typeof window !== 'undefined') {
        const newBooking = {
          id: `bk-${Date.now()}`,
          bookingCode: code,
          room,
          selectedDate,
          selectedSlots,
          selectedEquipments,
          customerName,
          customerPhone,
          customerEmail,
          note: customerNote,
          roomCost,
          equipmentCost,
          cleaningFee: 0,
          subtotal,
          depositAmount,
          remainingAmount,
          paymentMethod,
          paymentStatus: 'paid',
          bookingStatus: 'pending', // Trạng thái: Tiếp nhận
          createdAt: new Date().toLocaleString('vi-VN'),
        };

        const existing = JSON.parse(localStorage.getItem('HOST_PORTAL_CUSTOM_BOOKINGS') || '[]');
        localStorage.setItem('HOST_PORTAL_CUSTOM_BOOKINGS', JSON.stringify([newBooking, ...existing]));
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F4F4F4] text-[#222222] pb-24">
      {/* Breadcrumb Header */}
      <div className="bg-[#FFFFFF] border-b border-[#E8E8E8] py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-[#8C8C8C]">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 hover:text-[#F89C1E] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại chi tiết phòng</span>
          </button>
          <span className="font-semibold text-[#222222]">Bước 4: Xác nhận đơn thuê &amp; Thanh toán cọc</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[#222222]">
            Xác Nhận Đơn Thuê Studio &amp; Thanh Toán Cọc Giữ Chỗ
          </h1>
          <p className="text-xs text-[#8C8C8C] mt-0.5">
            Mô phỏng thanh toán chuyển khoản qua cổng VietQR Sandbox (Thực nghiệm đồ án).
          </p>
        </div>

        {/* Success Modal / Banner */}
        {isSuccess && (
          <div className="bg-[#E8F5E9] border-2 border-[#2E7D32] rounded-2xl p-6 sm:p-7 mb-6 shadow-sm animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#2E7D32] text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2E7D32]">
                  THANH TOÁN CỌC SANDBOX THÀNH CÔNG
                </span>
                <h2 className="text-xl font-bold text-[#222222]">
                  Đặt Lịch Studio Thành Công!
                </h2>
                <p className="text-xs text-[#4A4A4A]">
                  Mã đặt lịch của bạn là: <strong className="font-mono text-[#2E7D32] text-sm">{generatedBookingCode}</strong>.
                  Đơn đã được tự động thêm vào <strong>Host Portal (Màn hình 5)</strong> với trạng thái <span className="text-[#F89C1E] font-bold">"Tiếp nhận"</span>.
                </p>
                <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <Link
                    href="/host"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F89C1E] hover:bg-[#e08914] text-white font-bold text-xs shadow-sm"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Xem đơn vừa đặt tại Host Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFFFFF] hover:bg-[#F4F4F4] text-[#4A4A4A] text-xs border border-[#E8E8E8]"
                  >
                    Về Trang chủ
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= CỘT TRÁI (7 cols): Thông tin khách & Cổng VietQR Sandbox ================= */}
          <div className="lg:col-span-7 space-y-5">
            {/* Box 1: Thông tin khách thuê */}
            <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-2xl p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-[#222222] uppercase tracking-wide flex items-center gap-2 border-b border-[#E8E8E8] pb-2.5">
                <ShieldCheck className="w-4 h-4 text-[#F89C1E]" />
                1. Thông tin người đại diện đặt phòng
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[#8C8C8C] block mb-1 font-medium">Họ và tên:</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-[#F4F4F4] border border-[#E8E8E8] rounded-lg p-2.5 text-[#222222] font-semibold focus:border-[#F89C1E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#8C8C8C] block mb-1 font-medium">Số điện thoại liên hệ:</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-[#F4F4F4] border border-[#E8E8E8] rounded-lg p-2.5 text-[#222222] font-semibold focus:border-[#F89C1E] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[#8C8C8C] block mb-1 font-medium">Email nhận xác nhận đơn:</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-[#F4F4F4] border border-[#E8E8E8] rounded-lg p-2.5 text-[#222222] font-semibold focus:border-[#F89C1E] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[#8C8C8C] block mb-1 font-medium">Ghi chú (yêu cầu màu phông, setup đèn):</label>
                  <textarea
                    rows={2}
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="w-full bg-[#F4F4F4] border border-[#E8E8E8] rounded-lg p-2.5 text-[#222222] font-medium focus:border-[#F89C1E] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Box 2: Cổng thanh toán Sandbox VietQR */}
            <div className="bg-[#FFFFFF] border-2 border-[#F89C1E] rounded-2xl p-5 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-[#222222] uppercase tracking-wide flex items-center gap-2 border-b border-[#E8E8E8] pb-2.5">
                <QrCode className="w-4 h-4 text-[#F89C1E]" />
                2. Cổng Thanh Toán Cọc Giữ Chỗ (VietQR Sandbox)
              </h2>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('sandbox_qr')}
                  className={`flex-1 p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                    paymentMethod === 'sandbox_qr'
                      ? 'bg-[#FFF4E6] border-[#F89C1E] text-[#F89C1E]'
                      : 'bg-[#F4F4F4] border-[#E8E8E8] text-[#4A4A4A]'
                  }`}
                >
                  <span className="block">Mã VietQR Sandbox</span>
                  <span className="text-[10px] font-normal text-[#8C8C8C]">Tự động đối soát trong 3s</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('hold_slot')}
                  className={`flex-1 p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                    paymentMethod === 'hold_slot'
                      ? 'bg-[#FFF4E6] border-[#F89C1E] text-[#F89C1E]'
                      : 'bg-[#F4F4F4] border-[#E8E8E8] text-[#4A4A4A]'
                  }`}
                >
                  <span className="block">Giữ chỗ trước</span>
                  <span className="text-[10px] font-normal text-[#8C8C8C]">Thanh toán tại studio</span>
                </button>
              </div>

              {/* VietQR Box */}
              {paymentMethod === 'sandbox_qr' && (
                <div className="bg-[#F4F4F4] border border-[#E8E8E8] rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="p-2.5 bg-[#FFFFFF] rounded-xl shadow-xs border border-[#E8E8E8] flex flex-col items-center shrink-0">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=STUDIOTOT_SANDBOX_${depositAmount}_PAYMENT`}
                      alt="VietQR Sandbox"
                      className="w-28 h-28"
                    />
                    <span className="text-[9px] font-bold text-[#8C8C8C] mt-1 uppercase">VietQR Sandbox</span>
                  </div>

                  <div className="space-y-1.5 text-xs w-full text-[#4A4A4A]">
                    <div className="flex justify-between border-b border-[#E8E8E8] pb-1">
                      <span className="text-[#8C8C8C]">Ngân hàng thụ hưởng:</span>
                      <strong className="text-[#222222]">Techcombank (Sandbox)</strong>
                    </div>
                    <div className="flex justify-between border-b border-[#E8E8E8] pb-1">
                      <span className="text-[#8C8C8C]">Số tài khoản:</span>
                      <strong className="font-mono text-[#F89C1E]">1903 8888 6666 99</strong>
                    </div>
                    <div className="flex justify-between border-b border-[#E8E8E8] pb-1">
                      <span className="text-[#8C8C8C]">Chủ tài khoản:</span>
                      <strong className="text-[#222222]">STUDIO TOT VIETNAM</strong>
                    </div>
                    <div className="flex justify-between border-b border-[#E8E8E8] pb-1">
                      <span className="text-[#8C8C8C]">Số tiền cọc (30%):</span>
                      <strong className="text-[#D0021B] text-sm">{formatVND(depositAmount)}</strong>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span className="text-[#8C8C8C]">Nội dung:</span>
                      <span className="font-mono font-semibold text-[#222222]">STUDIO {customerPhone.slice(-4)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Simulation CTA Button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isProcessing || isSuccess}
                  onClick={handleSimulatePayment}
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-bold bg-[#F89C1E] hover:bg-[#e08914] disabled:bg-[#E8E8E8] disabled:text-[#8C8C8C] text-white shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang xử lý đối soát Sandbox...
                    </span>
                  ) : isSuccess ? (
                    <span>✓ Đã thanh toán cọc thành công</span>
                  ) : (
                    <span>Mô Phỏng Thanh Toán Thành Công (Sandbox)</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ================= CỘT PHẢI (5 cols): Tóm tắt chi tiết & Bảng kê chi phí ================= */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-2xl p-5 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-[#222222] uppercase tracking-wide border-b border-[#E8E8E8] pb-2.5">
                Tóm tắt chi tiết đặt phòng
              </h2>

              {/* Room Card Mini */}
              <div className="flex items-start gap-3">
                <img
                  src={room.images[0]}
                  alt={room.name}
                  className="w-16 h-14 rounded-lg object-cover bg-[#E8E8E8] shrink-0 border border-[#E8E8E8]"
                />
                <div className="min-w-0">
                  <span className="text-[10px] text-[#F89C1E] font-bold uppercase">{room.studioName}</span>
                  <h3 className="text-xs font-bold text-[#222222] truncate">{room.name}</h3>
                  <p className="text-[11px] text-[#8C8C8C] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-[#8C8C8C] shrink-0" />
                    <span className="truncate">{room.district}, {room.city}</span>
                  </p>
                </div>
              </div>

              {/* Slot & Date */}
              <div className="bg-[#F4F4F4] p-3 rounded-xl border border-[#E8E8E8] space-y-1.5 text-xs text-[#4A4A4A]">
                <div className="flex justify-between">
                  <span className="text-[#8C8C8C]">Ngày thuê:</span>
                  <strong className="text-[#222222]">{selectedDate}</strong>
                </div>
                <div className="border-t border-[#E8E8E8] pt-1.5 space-y-1">
                  <span className="text-[11px] text-[#8C8C8C] block font-semibold">Khung giờ ({slotCount} ca):</span>
                  {selectedSlots.map((s) => (
                    <div key={s.id} className="flex justify-between font-mono text-xs">
                      <span className="text-[#222222]">Ca {s.slotNumber} ({s.timeRange})</span>
                      <strong className="text-[#D0021B]">{formatVND(room.pricePerSlot)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipments */}
              {selectedEquipments.length > 0 && (
                <div className="bg-[#F4F4F4] p-3 rounded-xl border border-[#E8E8E8] space-y-1 text-xs text-[#4A4A4A]">
                  <span className="text-[11px] text-[#8C8C8C] block font-semibold">Thiết bị bổ trợ:</span>
                  {selectedEquipments.map(({ equipment, quantity }) => (
                    <div key={equipment.id} className="flex justify-between">
                      <span>{quantity}x {equipment.name.split(' ')[0]} {equipment.name.split(' ')[1]}</span>
                      <strong>{formatVND(equipment.pricePerSlot * quantity * Math.max(1, slotCount))}</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Bảng kê chi phí */}
              <div className="border-t border-[#E8E8E8] pt-3 space-y-1.5 text-xs text-[#4A4A4A]">
                <div className="flex justify-between">
                  <span>Tiền thuê phòng:</span>
                  <strong className="text-[#222222]">{formatVND(roomCost)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Phụ thu thiết bị:</span>
                  <strong className="text-[#222222]">+{formatVND(equipmentCost)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Phí vệ sinh &amp; Reset phòng:</span>
                  <strong className="text-[#2E7D32]">Miễn phí (30p đệm)</strong>
                </div>

                <div className="flex justify-between text-[#222222] font-bold pt-2 border-t border-[#E8E8E8]">
                  <span>Tổng tiền thuê:</span>
                  <span className="text-base text-[#D0021B] font-extrabold">{formatVND(subtotal)}</span>
                </div>

                {/* Tiền cọc 30% */}
                <div className="bg-[#FFF4E6] p-2.5 rounded-xl border border-[#F89C1E]/30 space-y-1 mt-2">
                  <div className="flex justify-between text-[#F89C1E] font-bold text-xs">
                    <span>Tiền đặt cọc giữ chỗ (30%):</span>
                    <span className="text-sm font-extrabold">{formatVND(depositAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[#8C8C8C] text-[11px]">
                    <span>Số tiền còn lại (Thanh toán tại Studio):</span>
                    <span>{formatVND(remainingAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
