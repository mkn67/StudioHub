'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { SAMPLE_ROOMS, Room } from '@/lib/mock-data';
import {
  MapPin,
  Calendar,
  Maximize2,
  Users,
  Volume2,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Filter,
  Clock,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react';

export default function HomePage() {
  // Pill Dropdown States
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Filter States
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [selectedPurpose, setSelectedPurpose] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-06');

  // Toggle dropdown
  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return SAMPLE_ROOMS.filter((room) => {
      // Location
      if (selectedLocation !== 'all') {
        if (selectedLocation === 'q1' && !room.district.includes('Quận 1')) return false;
        if (selectedLocation === 'q3' && !room.district.includes('Quận 3')) return false;
        if (selectedLocation === 'thuduc' && !room.district.includes('Thủ Đức')) return false;
        if (selectedLocation === 'hn' && !room.city.includes('Hà Nội')) return false;
      }
      // Purpose / Category
      if (selectedPurpose !== 'all' && room.category !== selectedPurpose) {
        return false;
      }
      // Price
      if (selectedPriceRange === 'low' && room.pricePerHour > 300000) return false;
      if (selectedPriceRange === 'mid' && (room.pricePerHour <= 300000 || room.pricePerHour > 500000)) return false;
      if (selectedPriceRange === 'high' && room.pricePerHour <= 500000) return false;

      return true;
    });
  }, [selectedLocation, selectedPurpose, selectedPriceRange]);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Label helpers
  const getLocationLabel = () => {
    switch (selectedLocation) {
      case 'q1': return 'Quận 1, HCM';
      case 'q3': return 'Quận 3, HCM';
      case 'thuduc': return 'TP. Thủ Đức';
      case 'hn': return 'Ba Đình, Hà Nội';
      default: return 'Khu vực';
    }
  };

  const getPriceLabel = () => {
    switch (selectedPriceRange) {
      case 'low': return '< 300k/giờ';
      case 'mid': return '300k - 500k/giờ';
      case 'high': return '> 500k/giờ';
      default: return 'Mức giá';
    }
  };

  const getPurposeLabel = () => {
    switch (selectedPurpose) {
      case 'photo': return 'Chụp Lookbook';
      case 'video': return 'Quay phim MV';
      case 'concept': return 'Concept Nội thất';
      case 'livestream': return 'Podcast / Live';
      default: return 'Mục đích thuê';
    }
  };

  const hasActiveFilters = selectedLocation !== 'all' || selectedPriceRange !== 'all' || selectedPurpose !== 'all';

  return (
    <div className="min-h-screen bg-[#F4F4F4] text-[#222222] pb-16">
      {/* ================= THANH TÌM KIẾM & LỌC DẠNG "PILL / CHIPS" (NGANG) ================= */}
      <section className="bg-[#FFFFFF] border-b border-[#E8E8E8] sticky top-28 z-30 shadow-xs py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-visible">
          {/* Group of Pill Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full dropdown-container">
            {/* Pill 1: Khu vực */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('location')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  selectedLocation !== 'all'
                    ? 'bg-[#FFF4E6] text-[#F89C1E] border-[#F89C1E]'
                    : 'bg-[#F4F4F4] text-[#4A4A4A] border-[#E8E8E8] hover:border-[#D1D5DB]'
                }`}
              >
                <span>{getLocationLabel()}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#8C8C8C]" />
              </button>

              {openDropdown === 'location' && (
                <div className="absolute top-full mt-1.5 left-0 w-48 bg-[#FFFFFF] rounded-xl shadow-xl border border-[#E8E8E8] py-1.5 z-50 text-xs">
                  <button
                    onClick={() => { setSelectedLocation('all'); setOpenDropdown(null); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-[#F4F4F4] ${selectedLocation === 'all' ? 'text-[#F89C1E] font-bold' : 'text-[#4A4A4A]'}`}
                  >
                    Tất cả khu vực
                  </button>
                  <button
                    onClick={() => { setSelectedLocation('q1'); setOpenDropdown(null); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-[#F4F4F4] ${selectedLocation === 'q1' ? 'text-[#F89C1E] font-bold' : 'text-[#4A4A4A]'}`}
                  >
                    Quận 1, TP. HCM
                  </button>
                  <button
                    onClick={() => { setSelectedLocation('q3'); setOpenDropdown(null); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-[#F4F4F4] ${selectedLocation === 'q3' ? 'text-[#F89C1E] font-bold' : 'text-[#4A4A4A]'}`}
                  >
                    Quận 3, TP. HCM
                  </button>
                  <button
                    onClick={() => { setSelectedLocation('thuduc'); setOpenDropdown(null); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-[#F4F4F4] ${selectedLocation === 'thuduc' ? 'text-[#F89C1E] font-bold' : 'text-[#4A4A4A]'}`}
                  >
                    TP. Thủ Đức, TP. HCM
                  </button>
                  <button
                    onClick={() => { setSelectedLocation('hn'); setOpenDropdown(null); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-[#F4F4F4] ${selectedLocation === 'hn' ? 'text-[#F89C1E] font-bold' : 'text-[#4A4A4A]'}`}
                  >
                    Ba Đình, Hà Nội
                  </button>
                </div>
              )}
            </div>

            {/* Pill 2: Mức giá */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('price')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  selectedPriceRange !== 'all'
                    ? 'bg-[#FFF4E6] text-[#F89C1E] border-[#F89C1E]'
                    : 'bg-[#F4F4F4] text-[#4A4A4A] border-[#E8E8E8] hover:border-[#D1D5DB]'
                }`}
              >
                <span>{getPriceLabel()}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#8C8C8C]" />
              </button>

              {openDropdown === 'price' && (
                <div className="absolute top-full mt-1.5 left-0 w-48 bg-[#FFFFFF] rounded-xl shadow-xl border border-[#E8E8E8] py-1.5 z-50 text-xs">
                  <button
                    onClick={() => { setSelectedPriceRange('all'); setOpenDropdown(null); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-[#F4F4F4] ${selectedPriceRange === 'all' ? 'text-[#F89C1E] font-bold' : 'text-[#4A4A4A]'}`}
                  >
                    Tất cả mức giá
                  </button>
                  <button
                    onClick={() => { setSelectedPriceRange('low'); setOpenDropdown(null); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-[#F4F4F4] ${selectedPriceRange === 'low' ? 'text-[#F89C1E] font-bold' : 'text-[#4A4A4A]'}`}
                  >
                    Dưới 300.000 đ/giờ
                  </button>
                  <button
                    onClick={() => { setSelectedPriceRange('mid'); setOpenDropdown(null); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-[#F4F4F4] ${selectedPriceRange === 'mid' ? 'text-[#F89C1E] font-bold' : 'text-[#4A4A4A]'}`}
                  >
                    300.000 đ - 500.000 đ/giờ
                  </button>
                  <button
                    onClick={() => { setSelectedPriceRange('high'); setOpenDropdown(null); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-[#F4F4F4] ${selectedPriceRange === 'high' ? 'text-[#F89C1E] font-bold' : 'text-[#4A4A4A]'}`}
                  >
                    Trên 500.000 đ/giờ
                  </button>
                </div>
              )}
            </div>

            {/* Pill 3: Mục đích: Quay phim / Chụp ảnh */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown('purpose')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  selectedPurpose !== 'all'
                    ? 'bg-[#FFF4E6] text-[#F89C1E] border-[#F89C1E]'
                    : 'bg-[#F4F4F4] text-[#4A4A4A] border-[#E8E8E8] hover:border-[#D1D5DB]'
                }`}
              >
                <span>{getPurposeLabel()}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#8C8C8C]" />
              </button>

              {openDropdown === 'purpose' && (
                <div className="absolute top-full mt-1.5 left-0 w-56 bg-[#FFFFFF] rounded-xl shadow-xl border border-[#E8E8E8] py-1.5 z-50 text-xs">
                  <button
                    onClick={() => { setSelectedPurpose('all'); setOpenDropdown(null); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-[#F4F4F4] ${selectedPurpose === 'all' ? 'text-[#F89C1E] font-bold' : 'text-[#4A4A4A]'}`}
                  >
                    Tất cả mục đích
                  </button>
                  <button
                    onClick={() => { setSelectedPurpose('photo'); setOpenDropdown(null); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-[#F4F4F4] ${selectedPurpose === 'photo' ? 'text-[#F89C1E] font-bold' : 'text-[#4A4A4A]'}`}
                  >
                    Chụp ảnh Lookbook / Phông vô cực
                  </button>
                  <button
                    onClick={() => { setSelectedPurpose('video'); setOpenDropdown(null); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-[#F4F4F4] ${selectedPurpose === 'video' ? 'text-[#F89C1E] font-bold' : 'text-[#4A4A4A]'}`}
                  >
                    Quay phim MV / Soundstage cách âm
                  </button>
                  <button
                    onClick={() => { setSelectedPurpose('concept'); setOpenDropdown(null); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-[#F4F4F4] ${selectedPurpose === 'concept' ? 'text-[#F89C1E] font-bold' : 'text-[#4A4A4A]'}`}
                  >
                    Concept Nội thất / Vintage
                  </button>
                  <button
                    onClick={() => { setSelectedPurpose('livestream'); setOpenDropdown(null); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-[#F4F4F4] ${selectedPurpose === 'livestream' ? 'text-[#F89C1E] font-bold' : 'text-[#4A4A4A]'}`}
                  >
                    Podcast / Livestream
                  </button>
                </div>
              )}
            </div>

            {/* Pill 4: Ngày thuê */}
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3.5 py-1 rounded-full text-xs font-semibold bg-[#F4F4F4] text-[#4A4A4A] border border-[#E8E8E8] hover:border-[#D1D5DB] cursor-pointer focus:outline-none focus:border-[#F89C1E]"
              />
            </div>

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSelectedLocation('all');
                  setSelectedPriceRange('all');
                  setSelectedPurpose('all');
                }}
                className="text-xs text-[#8C8C8C] hover:text-[#D0021B] flex items-center gap-1 font-medium ml-2 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>

          {/* Result counter */}
          <span className="text-xs text-[#8C8C8C] shrink-0 hidden md:inline">
            Tìm thấy <strong className="text-[#222222]">{filteredRooms.length}</strong> studio
          </span>
        </div>
      </section>

      {/* ================= MARKETPLACE LISTING CONTAINER ================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Banner tiêu đề chuẩn phân loại */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#222222]">
              Phòng Studio cho thuê theo ca tại TP.HCM &amp; Hà Nội
            </h1>
            <p className="text-xs text-[#8C8C8C] mt-0.5">
              Đầy đủ đèn Godox, phông nền, tiêu âm Rockwool. Đặt theo ca 2 giờ kèm 30 phút đệm vệ sinh.
            </p>
          </div>
        </div>

        {/* ================= THẺ PHÒNG STUDIO (ROOM CARD) CHUẨN LISTING NHÀ TỐT ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="bg-[#FFFFFF] border border-[#E8E8E8] rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between group"
            >
              <div>
                {/* 1. Hình ảnh lớn (Tỷ lệ chuẩn 4:3) */}
                <div className="relative aspect-[4/3] w-full bg-[#E8E8E8] overflow-hidden">
                  <img
                    src={room.images[0]}
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Badge nhỏ góc trái: Khu vực */}
                  <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-0.5 rounded-md">
                    {room.district}
                  </div>

                  {/* Badge nhỏ góc phải: "Còn lịch hôm nay" */}
                  <div className="absolute top-2.5 right-2.5 bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
                    <span>Còn lịch hôm nay</span>
                  </div>
                </div>

                {/* 2. Phần thông tin (Body) */}
                <div className="p-3.5 space-y-2">
                  {/* Tiêu đề: Tối đa 2 dòng, font 15px, chữ đen đậm #222222 */}
                  <Link href={`/rooms/${room.id}`}>
                    <h3
                      className="text-[15px] font-bold text-[#222222] leading-snug line-clamp-2 hover:text-[#F89C1E] transition-colors"
                      title={room.name}
                    >
                      {room.name}
                    </h3>
                  </Link>

                  {/* Thông số thực tế (Icon xám nhỏ) */}
                  <div className="flex items-center gap-2 text-xs text-[#8C8C8C] flex-wrap pt-0.5">
                    <span className="flex items-center gap-1">
                      <Maximize2 className="w-3.5 h-3.5 text-[#8C8C8C]" />
                      {room.area}m²
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#8C8C8C]" />
                      {room.capacity} người
                    </span>
                    <span>•</span>
                    <span>Trần {room.ceilingHeight}m</span>
                  </div>

                  {/* Chuẩn tiêu âm / tiện ích */}
                  <div className="text-[11px] text-[#4A4A4A] flex items-center gap-1 bg-[#F4F4F4] px-2 py-1 rounded-md w-fit">
                    <Volume2 className="w-3.5 h-3.5 text-[#F89C1E] shrink-0" />
                    <span className="truncate">{room.soundproof}</span>
                  </div>
                </div>
              </div>

              {/* 3. Dòng giá tiền & Nút Xem lịch (Dưới cùng) */}
              <div className="p-3.5 pt-2 border-t border-[#E8E8E8] flex items-center justify-between">
                <div>
                  {/* Giá tiền: Màu đỏ #D0021B, font to đậm 18px */}
                  <div className="text-[18px] font-extrabold text-[#D0021B] leading-none">
                    {formatVND(room.pricePerHour)}
                    <span className="text-[11px] font-normal text-[#8C8C8C]">/giờ</span>
                  </div>
                  <span className="text-[10px] text-[#8C8C8C] block mt-0.5">
                    {formatVND(room.pricePerSlot)} / ca 2h
                  </span>
                </div>

                {/* Nút Xem lịch nhỏ gọn viền cam #F89C1E */}
                <Link
                  href={`/rooms/${room.id}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#F89C1E] text-[#F89C1E] hover:bg-[#F89C1E] hover:text-white transition-all shadow-xs"
                >
                  Xem lịch
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
