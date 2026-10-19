'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  getRoomDetail,
  getRoomCalendar,
  getEquipments,
  RoomDetail,
  Equipment,
  BusySlot,
} from '@/lib/api';
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
  AlertCircle,
  Calendar as CalendarIcon,
  Phone,
  Building2,
  Info,
  Tag,
} from 'lucide-react';

export default function RoomDetailPage() {
  const params = useParams();
  const router = useRouter();

  const rawId = (params?.id as string) || '1';
  const roomId = parseInt(rawId, 10) || 1;

  // Data states
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Gallery
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Equipment add-on selections (equipment_id -> qty)
  const [selectedEquipments, setSelectedEquipments] = useState<Record<number, number>>({});

  // Calendar dates
  const today = new Date().toISOString().split('T')[0];
  const [calendarFrom, setCalendarFrom] = useState<string>(today);
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const [calendarTo, setCalendarTo] = useState<string>(futureDate.toISOString().split('T')[0]);

  // Load room details
  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setError(null);

    getRoomDetail(roomId)
      .then((data) => {
        setRoom(data);
        // Load studio equipments
        if (data.studio?.studio_id) {
          getEquipments(data.studio.studio_id)
            .then(setEquipments)
            .catch(() => {});
        }
      })
      .catch((err: any) => {
        if (err.code === 404) {
          setNotFound(true);
        } else {
          setError(err.message || 'Lỗi tải chi tiết phòng');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [roomId]);

  // Load calendar busy slots
  const loadCalendar = useCallback(() => {
    if (!roomId) return;
    getRoomCalendar(roomId, calendarFrom, calendarTo)
      .then((data) => {
        setBusySlots(data.busy_slots || []);
      })
      .catch(() => {});
  }, [roomId, calendarFrom, calendarTo]);

  useEffect(() => {
    if (room) {
      loadCalendar();
    }
  }, [room, loadCalendar]);

  const formatPriceVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
  };

  const handleEquipmentChange = (eqId: number, delta: number, maxQty: number) => {
    setSelectedEquipments((prev) => {
      const current = prev[eqId] || 0;
      const next = Math.max(0, Math.min(maxQty, current + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[eqId];
        return copy;
      }
      return { ...prev, [eqId]: next };
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-gray-500 space-y-3">
        <div className="w-8 h-8 border-2 border-[#F89C1E] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold">Đang tải chi tiết phòng studio...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-lg mx-auto my-16 p-8 bg-white rounded-2xl shadow-sm border border-gray-200 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center font-bold">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Phòng không khả dụng</h2>
        <p className="text-sm text-gray-600">
          Phòng #{roomId} không tồn tại hoặc hiện đang trong trạng thái <strong>Bảo trì (Maintenance) / Ngưng hoạt động</strong>.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="px-5 py-2.5 bg-[#F89C1E] hover:bg-[#e08914] text-white rounded-xl text-sm font-bold shadow-xs transition-all"
          >
            Về Danh mục phòng
          </Link>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="max-w-lg mx-auto my-16 p-8 bg-white rounded-2xl border border-red-200 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">{error || 'Có lỗi xảy ra'}</h2>
        <Link href="/" className="inline-block text-xs font-bold text-[#F89C1E] underline">
          Quay lại danh mục
        </Link>
      </div>
    );
  }

  const images = room.images && room.images.length > 0 ? room.images : [
    { image_id: 1, image_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04', is_primary: true, sort_order: 1 },
  ];
  const activeImage = images[activeImageIndex] || images[0];

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* Breadcrumb Bar */}
      <div className="bg-white border-b border-gray-200 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <Link href="/" className="hover:text-gray-900 flex items-center gap-1 shrink-0 font-medium">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Danh mục phòng</span>
            </Link>
            <span>/</span>
            <span className="truncate">{room.studio.name}</span>
            <span>/</span>
            <span className="font-bold text-gray-900 truncate">{room.name}</span>
          </div>

          <span className="shrink-0 font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
            {room.status}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{room.name}</h1>
              {room.space_types?.map((st) => (
                <span
                  key={st.space_type_id}
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    st.is_primary ? 'bg-[#FFF4E6] text-[#F89C1E] border border-[#F89C1E]/30' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {st.name}
                </span>
              ))}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#F89C1E]" />
              <span>{room.studio.address}, {room.studio.district ? `${room.studio.district}, ` : ''}{room.studio.city}</span>
            </p>
          </div>
        </div>

        {/* Gallery & Quick Info Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Photo Gallery */}
          <div className="lg:col-span-8 space-y-3">
            <div className="relative aspect-[16/10] bg-gray-900 rounded-2xl overflow-hidden shadow-sm">
              <img
                src={activeImage.image_url}
                alt={room.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-lg backdrop-blur-xs font-medium">
                Ảnh {activeImageIndex + 1} / {images.length}
              </div>
            </div>

            {/* Thumbnail Row */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={img.image_id}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 aspect-[4/3] rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      idx === activeImageIndex ? 'border-[#F89C1E] scale-95' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Specifications Sidebar Card */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                Thông số kỹ thuật phòng
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <div className="text-gray-400 flex items-center gap-1 font-medium">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Diện tích</span>
                  </div>
                  <div className="font-bold text-gray-900 text-sm">{room.area} m²</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <div className="text-gray-400 flex items-center gap-1 font-medium">
                    <Users className="w-3.5 h-3.5" />
                    <span>Sức chứa</span>
                  </div>
                  <div className="font-bold text-gray-900 text-sm">{room.capacity} người</div>
                </div>

                {room.ceiling_height && (
                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <div className="text-gray-400 font-medium">Chiều cao trần</div>
                    <div className="font-bold text-gray-900 text-sm">{room.ceiling_height} m</div>
                  </div>
                )}

                {room.soundproof_level && (
                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <div className="text-gray-400 flex items-center gap-1 font-medium">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Cách âm</span>
                    </div>
                    <div className="font-bold text-gray-900 text-xs truncate" title={room.soundproof_level}>
                      {room.soundproof_level}
                    </div>
                  </div>
                )}
              </div>

              {room.power_specs && (
                <div className="text-xs p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl space-y-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>Nguồn điện kỹ thuật:</span>
                  </div>
                  <p className="text-amber-800">{room.power_specs}</p>
                </div>
              )}

              {room.rules && (
                <div className="text-xs p-3 bg-gray-50 rounded-xl space-y-1">
                  <div className="font-bold text-gray-800 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-gray-500" />
                    <span>Nội quy phòng:</span>
                  </div>
                  <p className="text-gray-600">{room.rules}</p>
                </div>
              )}

              {/* Studio Info Box */}
              <div className="pt-3 border-t border-gray-100 text-xs space-y-2">
                <div className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#F89C1E]" />
                  <span>{room.studio.name}</span>
                </div>
                {room.studio.description && (
                  <p className="text-gray-500 text-[11px]">{room.studio.description}</p>
                )}
                {room.studio.phone && (
                  <div className="flex items-center gap-1 text-[11px] text-gray-600">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span>Hotline: {room.studio.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Rates Table */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#F89C1E]" />
              <h2 className="text-base font-extrabold text-gray-900">Bảng giá niêm yết đang hiệu lực</h2>
            </div>
            <span className="text-xs text-gray-500">{room.rates?.length || 0} mức giá khả dụng</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">Đơn vị thuê</th>
                  <th className="py-2.5 px-3">Thời lượng chuẩn</th>
                  <th className="py-2.5 px-3">Đơn giá (VND)</th>
                  <th className="py-2.5 px-3">Số đơn vị tối thiểu</th>
                  <th className="py-2.5 px-3">Số đơn vị tối đa</th>
                  <th className="py-2.5 px-3 rounded-r-lg">Hiệu lực</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {room.rates?.map((rate) => (
                  <tr key={rate.rate_id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-3 font-bold text-gray-900 uppercase">
                      {rate.rate_unit}
                    </td>
                    <td className="py-3 px-3">
                      {rate.unit_minutes} phút ({Math.round(rate.unit_minutes / 60 * 10) / 10} giờ)
                    </td>
                    <td className="py-3 px-3 font-extrabold text-[#F89C1E] text-sm">
                      {formatPriceVND(rate.unit_price)}
                    </td>
                    <td className="py-3 px-3">{rate.minimum_units}</td>
                    <td className="py-3 px-3">{rate.maximum_units ?? 'Không giới hạn'}</td>
                    <td className="py-3 px-3 text-gray-400 text-[11px]">
                      Từ {rate.effective_from}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Availability Calendar & Busy Slots */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#F89C1E]" />
              <h2 className="text-base font-extrabold text-gray-900">Lịch bận phòng trực tiếp (Live Calendar)</h2>
            </div>

            {/* Date filter range */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 font-medium">Từ:</span>
              <input
                type="date"
                value={calendarFrom}
                onChange={(e) => setCalendarFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 outline-none text-xs"
              />
              <span className="text-gray-500 font-medium">Đến:</span>
              <input
                type="date"
                value={calendarTo}
                onChange={(e) => setCalendarTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1 outline-none text-xs"
              />
            </div>
          </div>

          <div className="text-xs text-gray-500 flex items-center gap-1.5 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 text-blue-800">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Lịch bận được đồng bộ trực tiếp từ Database engine (Trigger chống trùng lịch). Tuyệt đối bảo mật thông tin khách hàng.</span>
          </div>

          {busySlots.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-gray-800">Phòng hoàn toàn trống trong khoảng thời gian này</p>
              <p className="text-[11px] text-gray-400">Bạn có thể thoải mái chọn bất kỳ khung giờ nào.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-700">Các khung giờ đang có đơn đặt chiếm chỗ:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {busySlots.map((slot, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-50/60 border border-red-200/70 rounded-xl text-xs space-y-1"
                  >
                    <div className="text-red-700 font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-red-500" />
                      <span>Khung giờ bận #{idx + 1}</span>
                    </div>
                    <div className="text-[11px] text-red-800 font-mono">
                      {slot.busy_start} ➔ {slot.busy_end}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Studio Equipments Add-ons Section */}
        {equipments.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#F89C1E]" />
                <h2 className="text-base font-extrabold text-gray-900">Thiết bị &amp; Đạo cụ thuê kèm tại Studio</h2>
              </div>
              <span className="text-xs text-gray-500">{equipments.length} thiết bị sẵn sàng</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipments.map((eq) => {
                const qty = selectedEquipments[eq.equipment_id] || 0;
                return (
                  <div
                    key={eq.equipment_id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      qty > 0 ? 'border-[#F89C1E] bg-[#FFFBF6]' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            {eq.category_name}
                          </span>
                          <h4 className="font-extrabold text-sm text-gray-900 line-clamp-1">{eq.name}</h4>
                          {eq.brand && <p className="text-[11px] text-gray-500">Hãng: {eq.brand}</p>}
                        </div>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold shrink-0">
                          Kho: {eq.total_quantity}
                        </span>
                      </div>

                      {eq.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">{eq.description}</p>
                      )}
                    </div>

                    <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-extrabold text-[#F89C1E]">
                          {formatPriceVND(eq.unit_price)}
                        </div>
                        <div className="text-[10px] text-gray-400">/ {eq.pricing_unit === 'session' ? 'buổi' : 'giờ'}</div>
                      </div>

                      {/* Quantity Selector */}
                      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => handleEquipmentChange(eq.equipment_id, -1, eq.total_quantity)}
                          disabled={qty <= 0}
                          className="w-6 h-6 rounded bg-white text-gray-600 hover:text-black flex items-center justify-center disabled:opacity-30 shadow-2xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-gray-800">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleEquipmentChange(eq.equipment_id, 1, eq.total_quantity)}
                          disabled={qty >= eq.total_quantity}
                          className="w-6 h-6 rounded bg-[#F89C1E] text-white flex items-center justify-center disabled:opacity-30 shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
