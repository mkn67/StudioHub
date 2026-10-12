'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  SAMPLE_ROOMS,
  SAMPLE_TIME_SLOTS,
  SAMPLE_EQUIPMENTS,
  Room,
  TimeSlot,
  Equipment,
} from '@/lib/mock-data';
import {
  Maximize2,
  Users,
  Volume2,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronLeft,
  Package,
  Plus,
  Minus,
  MapPin,
  ShieldCheck,
  Check,
} from 'lucide-react';

export default function RoomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = (params?.id as string) || 'room-artemis-01';

  // Room lookup
  const room = SAMPLE_ROOMS.find((r) => r.id === roomId) || SAMPLE_ROOMS[0];

  // Gallery
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Selected Date
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-06');

  // Selected Slots
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>(['slot-1']);

  // Selected Equipment Add-ons (Equipment ID -> quantity)
  const [selectedEquipments, setSelectedEquipments] = useState<Record<string, number>>({
    'eq-godox-sl200': 1,
  });

  // Toggle Slot Selection
  const handleToggleSlot = (slot: TimeSlot) => {
    if (slot.status === 'booked') return;

    if (selectedSlotIds.includes(slot.id)) {
      setSelectedSlotIds(selectedSlotIds.filter((id) => id !== slot.id));
    } else {
      setSelectedSlotIds([...selectedSlotIds, slot.id]);
    }
  };

  // Toggle Equipment Checkbox / Quantity
  const handleToggleEquipment = (eqId: string) => {
    if ((selectedEquipments[eqId] || 0) > 0) {
      const copy = { ...selectedEquipments };
      delete copy[eqId];
      setSelectedEquipments(copy);
    } else {
      setSelectedEquipments({
        ...selectedEquipments,
        [eqId]: 1,
      });
    }
  };

  const handleQuantityChange = (equipmentId: string, delta: number, maxStock: number) => {
    const currentQty = selectedEquipments[equipmentId] || 0;
    const newQty = Math.max(0, Math.min(maxStock, currentQty + delta));
    if (newQty === 0) {
      const copy = { ...selectedEquipments };
      delete copy[equipmentId];
      setSelectedEquipments(copy);
    } else {
      setSelectedEquipments({
        ...selectedEquipments,
        [equipmentId]: newQty,
      });
    }
  };

  // Cost calculation
  const calculation = useMemo(() => {
    const slotCount = selectedSlotIds.length;
    const roomCost = slotCount * room.pricePerSlot;

    let equipmentCost = 0;
    SAMPLE_EQUIPMENTS.forEach((eq) => {
      const qty = selectedEquipments[eq.id] || 0;
      if (qty > 0) {
        equipmentCost += eq.pricePerSlot * qty * Math.max(1, slotCount);
      }
    });

    const subtotal = roomCost + equipmentCost;
    const deposit = Math.round(subtotal * 0.3);

    return {
      slotCount,
      roomCost,
      equipmentCost,
      subtotal,
      deposit,
    };
  }, [selectedSlotIds, selectedEquipments, room]);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleProceedToCheckout = () => {
    if (selectedSlotIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 ca giờ trống để tiếp tục!');
      return;
    }

    if (typeof window !== 'undefined') {
      const checkoutPayload = {
        roomId: room.id,
        selectedDate,
        selectedSlotIds,
        selectedEquipments,
        roomCost: calculation.roomCost,
        equipmentCost: calculation.equipmentCost,
        subtotal: calculation.subtotal,
        deposit: calculation.deposit,
      };
      sessionStorage.setItem('STUDIO_CHECKOUT_DATA', JSON.stringify(checkoutPayload));
    }

    router.push('/checkout');
  };

  return (
    <div className="min-h-screen bg-[#F4F4F4] text-[#222222] pb-20">
      {/* Top Breadcrumb */}
      <div className="bg-[#FFFFFF] border-b border-[#E8E8E8] py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-[#8C8C8C]">
          <Link href="/" className="flex items-center gap-1 hover:text-[#F89C1E] transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại Danh sách Studio</span>
          </Link>
          <span className="text-[#4A4A4A] hidden sm:inline">
            {room.studioName} &gt; {room.name}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= CỘT TRÁI (Lg: 7 cols): BÀI ĐĂNG BẤT ĐỘNG SẢN CHUẨN NHÀ TỐT ================= */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Gallery ảnh lớn */}
            <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-2xl overflow-hidden p-3 shadow-xs">
              <div className="relative aspect-[16/10] w-full bg-[#E8E8E8] rounded-xl overflow-hidden">
                <img
                  src={room.images[activeImageIndex]}
                  alt={room.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[11px] font-medium px-2.5 py-1 rounded-md">
                  Ảnh {activeImageIndex + 1} / {room.images.length}
                </div>
              </div>

              {/* Thumbnails */}
              <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                {room.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                      activeImageIndex === idx ? 'border-[#F89C1E]' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Tiêu đề, Vị trí & Giá thuê nổi bật */}
            <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-2xl p-5 shadow-xs space-y-3">
              <div>
                <span className="text-xs font-bold text-[#F89C1E] uppercase tracking-wide">
                  {room.studioName}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-[#222222] mt-0.5 leading-snug">
                  {room.name}
                </h1>
                <p className="text-xs text-[#8C8C8C] flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#8C8C8C]" />
                  <span>{room.location}, {room.district}, {room.city}</span>
                </p>
              </div>

              {/* Giá thuê: Đỏ tươi #D0021B font to đậm */}
              <div className="pt-2 border-t border-[#E8E8E8] flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#D0021B]">
                  {formatVND(room.pricePerHour)}
                </span>
                <span className="text-xs text-[#8C8C8C]">/ giờ (Đơn giá theo ca 2h: <strong>{formatVND(room.pricePerSlot)}</strong>)</span>
              </div>
            </div>

            {/* 3. Danh sách tiện ích & thông số kỹ thuật (Icon xám kèm chữ) */}
            <div className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-2xl p-5 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-[#222222] uppercase tracking-wide border-b border-[#E8E8E8] pb-2.5">
                Đặc điểm &amp; Thông số phòng
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F4F4F4]">
                  <Maximize2 className="w-4 h-4 text-[#8C8C8C] shrink-0" />
                  <div>
                    <span className="text-[#8C8C8C] block text-[10px]">Diện tích</span>
                    <strong className="text-[#222222]">{room.area} m²</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F4F4F4]">
                  <Volume2 className="w-4 h-4 text-[#8C8C8C] shrink-0" />
                  <div>
                    <span className="text-[#8C8C8C] block text-[10px]">Chiều cao trần</span>
                    <strong className="text-[#222222]">{room.ceilingHeight} mét</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F4F4F4]">
                  <Users className="w-4 h-4 text-[#8C8C8C] shrink-0" />
                  <div>
                    <span className="text-[#8C8C8C] block text-[10px]">Sức chứa</span>
                    <strong className="text-[#222222]">{room.capacity} người</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F4F4F4] col-span-2 sm:col-span-3">
                  <Volume2 className="w-4 h-4 text-[#2E7D32] shrink-0" />
                  <div>
                    <span className="text-[#8C8C8C] block text-[10px]">Hệ thống tiêu âm &amp; Cách âm</span>
                    <strong className="text-[#222222]">{room.soundproof}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F4F4F4] col-span-2 sm:col-span-3">
                  <Zap className="w-4 h-4 text-[#F89C1E] shrink-0" />
                  <div>
                    <span className="text-[#8C8C8C] block text-[10px]">Nguồn điện trường quay</span>
                    <strong className="text-[#222222]">{room.powerCapacity}</strong>
                  </div>
                </div>
              </div>

              {/* Mô tả chi tiết */}
              <div className="pt-2 text-xs text-[#4A4A4A] leading-relaxed">
                <p>{room.description}</p>
              </div>

              {/* Tiện ích có sẵn */}
              <div className="pt-2">
                <span className="text-xs font-bold text-[#222222] block mb-2">Trang bị sẵn có miễn phí:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#4A4A4A]">
                  {room.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#2E7D32] shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Checkbox thêm thiết bị dùng chung (Đèn, softbox, phông nền) */}
            <div id="equipment-section" className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-2.5">
                <h2 className="text-sm font-bold text-[#222222] uppercase tracking-wide flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#F89C1E]" />
                  Thuê thêm thiết bị &amp; Đạo cụ dùng chung
                </h2>
                <span className="text-[11px] text-[#8C8C8C]">Tính theo ca thuê</span>
              </div>

              <div className="space-y-2.5">
                {SAMPLE_EQUIPMENTS.map((eq) => {
                  const isChecked = (selectedEquipments[eq.id] || 0) > 0;
                  const qty = selectedEquipments[eq.id] || 0;

                  return (
                    <div
                      key={eq.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-[#FFF4E6] border-[#F89C1E]/50'
                          : 'bg-[#FFFFFF] border-[#E8E8E8] hover:border-[#D1D5DB]'
                      }`}
                    >
                      {/* Checkbox & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEquipment(eq.id)}
                          className="w-4 h-4 text-[#F89C1E] rounded border-[#D1D5DB] focus:ring-[#F89C1E] cursor-pointer"
                        />
                        <img
                          src={eq.image}
                          alt={eq.name}
                          className="w-11 h-11 rounded-lg object-cover bg-[#F4F4F4] shrink-0 border border-[#E8E8E8]"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[#222222] truncate">{eq.name}</h4>
                          <span className="text-xs font-extrabold text-[#D0021B]">
                            +{formatVND(eq.pricePerSlot)}
                            <span className="text-[10px] font-normal text-[#8C8C8C]">/{eq.unit}</span>
                          </span>
                          <span className="text-[10px] text-[#8C8C8C] block">Có sẵn: {eq.availableStock}</span>
                        </div>
                      </div>

                      {/* Stepper Quantity (+ / -) */}
                      {isChecked && (
                        <div className="flex items-center gap-2 bg-[#FFFFFF] px-2 py-1 rounded-lg border border-[#E8E8E8] shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(eq.id, -1, eq.availableStock)}
                            className="w-5 h-5 rounded bg-[#F4F4F4] hover:bg-[#E8E8E8] text-[#4A4A4A] flex items-center justify-center text-xs font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-[#222222] w-4 text-center">{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(eq.id, 1, eq.availableStock)}
                            className="w-5 h-5 rounded bg-[#F4F4F4] hover:bg-[#E8E8E8] text-[#4A4A4A] flex items-center justify-center text-xs font-bold disabled:opacity-30"
                            disabled={qty >= eq.availableStock}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ================= CỘT PHẢI (Lg: 5 cols): BẢNG CHỌN CA GIỜ THUÊ (TIME-SLOT GRID) ================= */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
            <div className="bg-[#FFFFFF] border-2 border-[#F89C1E] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#222222] uppercase tracking-wide">
                    Chọn Khung Giờ Thuê (Time-slot)
                  </h3>
                  <span className="text-[11px] text-[#8C8C8C]">Mỗi ca 2 giờ • Đệm 30 phút dọn phòng</span>
                </div>
              </div>

              {/* Date Input */}
              <div className="bg-[#F4F4F4] p-3 rounded-xl border border-[#E8E8E8] flex items-center justify-between">
                <div>
                  <label className="text-[10px] font-bold text-[#8C8C8C] uppercase block">Ngày thuê:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-sm font-bold text-[#222222] focus:outline-none cursor-pointer"
                  />
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#8C8C8C] block">Thời lượng</span>
                  <span className="text-xs font-bold text-[#F89C1E]">2 tiếng / ca</span>
                </div>
              </div>

              {/* Status Legend (Chuẩn Nhà Tốt: Trống nền trắng viền xanh nhạt, Đã kín xám nhạt chữ gạch) */}
              <div className="grid grid-cols-2 gap-2 text-[11px] p-2 rounded-lg bg-[#F4F4F4] text-center">
                <div className="flex items-center justify-center gap-1.5 text-[#2E7D32]">
                  <span className="w-3 h-3 rounded bg-[#E8F5E9] border border-[#81C784]" />
                  <span>Trống (Có thể đặt)</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-[#8C8C8C]">
                  <span className="w-3 h-3 rounded bg-[#EEEEEE] border border-[#D1D5DB]" />
                  <span className="line-through">Đã kín ca</span>
                </div>
              </div>

              {/* BẢNG CHỌN CA GIỜ THUÊ (TIME-SLOT GRID CHUẨN MÀU SẮC) */}
              <div className="space-y-2">
                {SAMPLE_TIME_SLOTS.map((slot) => {
                  const isBooked = slot.status === 'booked';
                  const isSelected = selectedSlotIds.includes(slot.id);

                  return (
                    <div key={slot.id} className="space-y-1">
                      <button
                        type="button"
                        disabled={isBooked}
                        onClick={() => handleToggleSlot(slot)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border ${
                          isBooked
                            ? 'bg-[#EEEEEE] border-[#E0E0E0] text-[#8C8C8C] cursor-not-allowed opacity-75'
                            : isSelected
                            ? 'bg-[#FFF4E6] border-[#F89C1E] text-[#222222] shadow-xs'
                            : 'bg-[#FFFFFF] border-[#C8E6C9] hover:bg-[#F1F8E9] text-[#222222]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Checkbox marker */}
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected
                                ? 'bg-[#F89C1E] border-[#F89C1E] text-white'
                                : isBooked
                                ? 'bg-[#E0E0E0] border-[#BDBDBD]'
                                : 'bg-white border-[#81C784]'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>

                          <div>
                            <span className={`text-xs font-bold block ${isBooked ? 'line-through text-[#8C8C8C]' : 'text-[#222222]'}`}>
                              Ca {slot.slotNumber}: {slot.timeRange}
                            </span>
                            <span className="text-[10px] text-[#8C8C8C]">
                              {slot.bufferAfter}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-xs font-extrabold ${
                              isBooked ? 'line-through text-[#8C8C8C]' : 'text-[#D0021B]'
                            }`}
                          >
                            {formatVND(room.pricePerSlot)}
                          </span>
                          <span className="text-[10px] text-[#8C8C8C] block">
                            {isBooked ? 'Đã có khách' : isSelected ? 'Đang chọn' : 'Còn trống'}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* BẢNG TÍNH TIỀN THỜI GIAN THỰC (REAL-TIME SUMMARY) */}
              <div className="pt-3 border-t border-[#E8E8E8] space-y-1.5 text-xs text-[#4A4A4A]">
                <div className="flex justify-between">
                  <span>Tiền thuê phòng ({calculation.slotCount} ca):</span>
                  <span className="font-semibold text-[#222222]">{formatVND(calculation.roomCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phụ thu thiết bị ({Object.keys(selectedEquipments).length} món):</span>
                  <span className="font-semibold text-[#222222]">+{formatVND(calculation.equipmentCost)}</span>
                </div>
                <div className="flex justify-between text-[#222222] font-bold pt-1.5 border-t border-[#E8E8E8]">
                  <span>Tổng tiền thuê:</span>
                  <span className="text-base text-[#D0021B] font-extrabold">{formatVND(calculation.subtotal)}</span>
                </div>
                <div className="flex justify-between bg-[#FFF4E6] p-2.5 rounded-xl border border-[#F89C1E]/30 text-[#F89C1E] font-bold text-xs mt-1">
                  <span>Tiền cọc giữ chỗ (30%):</span>
                  <span className="text-sm font-extrabold">{formatVND(calculation.deposit)}</span>
                </div>
              </div>

              {/* Nút Đặt lịch ngay: Màu thương hiệu #F89C1E */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  disabled={calculation.slotCount === 0}
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-bold bg-[#F89C1E] hover:bg-[#e08914] disabled:bg-[#E8E8E8] disabled:text-[#8C8C8C] text-white shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Đặt Lịch Ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-[11px] text-center text-[#8C8C8C] mt-2">
                  * Chọn ít nhất 1 ca giờ trống để tiến hành thanh toán cọc.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
