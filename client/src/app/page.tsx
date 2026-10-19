'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getRooms,
  getSpaceTypes,
  RoomItem,
  SpaceType,
  Pagination,
} from '@/lib/api';
import {
  Search,
  MapPin,
  Maximize2,
  Users,
  Volume2,
  Sparkles,
  ArrowRight,
  Filter,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Tag,
  DollarSign,
} from 'lucide-react';

const RATE_UNIT_LABELS: Record<string, string> = {
  hour: 'Theo Giờ',
  session: 'Theo Buổi (Ca)',
  half_day: 'Nửa Ngày (4h)',
  day: 'Cả Ngày (24h)',
  week: 'Theo Tuần',
  month: 'Theo Tháng',
};

export default function HomePage() {
  // State
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [spaceTypes, setSpaceTypes] = useState<SpaceType[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 12,
    total_items: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [keyword, setKeyword] = useState<string>('');
  const [selectedSpaceTypeId, setSelectedSpaceTypeId] = useState<number | undefined>(undefined);
  const [rateUnit, setRateUnit] = useState<string>('hour');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minArea, setMinArea] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Load space types on mount
  useEffect(() => {
    getSpaceTypes()
      .then((types) => setSpaceTypes(types))
      .catch((e) => console.error('Failed to load space types', e));
  }, []);

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRooms({
        keyword: keyword.trim() || undefined,
        space_type_id: selectedSpaceTypeId,
        rate_unit: rateUnit,
        min_price: minPrice ? parseFloat(minPrice) : undefined,
        max_price: maxPrice ? parseFloat(maxPrice) : undefined,
        min_area: minArea ? parseFloat(minArea) : undefined,
        page,
        limit: 8,
      });

      setRooms(res.items || []);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách phòng');
    } finally {
      setLoading(false);
    }
  }, [keyword, selectedSpaceTypeId, rateUnit, minPrice, maxPrice, minArea, page]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRooms();
  };

  const handleResetFilters = () => {
    setKeyword('');
    setSelectedSpaceTypeId(undefined);
    setRateUnit('hour');
    setMinPrice('');
    setMaxPrice('');
    setMinArea('');
    setPage(1);
  };

  const formatPriceVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-16">
      {/* Hero Search Section */}
      <div className="bg-white border-b border-gray-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center sm:text-left space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFF4E6] text-[#F89C1E] border border-[#F89C1E]/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phase 4 Catalog Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Tìm phòng Studio &amp; Không gian Sáng tạo
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Tra cứu phòng chụp, quay podcast, vô cực với giá niêm yết theo ca và lịch khả dụng thực tế.
            </p>
          </div>

          {/* Search Bar & Primary Filters */}
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-grow">
                <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm theo tên phòng, tên studio (ví dụ: Artemis, Cyclorama, Zenith...)"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#F89C1E] focus:border-transparent outline-none transition-all"
                />
                {keyword && (
                  <button
                    type="button"
                    onClick={() => {
                      setKeyword('');
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-[#F89C1E] hover:bg-[#e08914] text-white text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>Tìm kiếm</span>
              </button>
            </div>

            {/* Space Type Selector Pills */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Loại hình không gian:
              </div>
              <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSpaceTypeId(undefined);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedSpaceTypeId === undefined
                      ? 'bg-gray-900 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Tất cả ({pagination.total_items})
                </button>
                {spaceTypes.map((st) => {
                  const isSelected = selectedSpaceTypeId === st.space_type_id;
                  return (
                    <button
                      key={st.space_type_id}
                      type="button"
                      onClick={() => {
                        setSelectedSpaceTypeId(isSelected ? undefined : st.space_type_id);
                        setPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                        isSelected
                          ? 'bg-[#F89C1E] text-white shadow-xs'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {st.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter Bar Row: Rate Unit, Price Range, Area */}
            <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-200/80 flex flex-wrap items-center gap-3 text-xs">
              {/* Rate Unit */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-600">Bảng giá:</span>
                <select
                  value={rateUnit}
                  onChange={(e) => {
                    setRateUnit(e.target.value);
                    setPage(1);
                  }}
                  className="bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 outline-none focus:ring-1 focus:ring-[#F89C1E]"
                >
                  {Object.entries(RATE_UNIT_LABELS).map(([unit, label]) => (
                    <option key={unit} value={unit}>
                      {label} ({unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-600">Giá từ:</span>
                <input
                  type="number"
                  placeholder="Min (VND)"
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setPage(1);
                  }}
                  className="w-28 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#F89C1E]"
                />
                <span>-</span>
                <input
                  type="number"
                  placeholder="Max (VND)"
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setPage(1);
                  }}
                  className="w-28 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#F89C1E]"
                />
              </div>

              {/* Area */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-600">Diện tích tối thiểu:</span>
                <input
                  type="number"
                  placeholder="m²"
                  value={minArea}
                  onChange={(e) => {
                    setMinArea(e.target.value);
                    setPage(1);
                  }}
                  className="w-20 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#F89C1E]"
                />
                <span className="text-gray-400">m²</span>
              </div>

              <div className="ml-auto">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-gray-500 hover:text-gray-800 underline text-xs font-semibold"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Main Content: Room Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-gray-500">
            Hiển thị <span className="font-bold text-gray-800">{rooms.length}</span> / {pagination.total_items} phòng khả dụng
          </div>
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-[#F89C1E]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Đang tải danh mục...</span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchRooms}
              className="text-xs font-bold underline text-red-800 hover:text-red-950"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && rooms.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-800">Không tìm thấy phòng phù hợp</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Không có phòng nào thỏa mãn các tiêu chí lọc hiện tại (hoặc phòng không có bảng giá cho đơn vị {RATE_UNIT_LABELS[rateUnit]}).
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-2 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-all"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}

        {/* Room Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {rooms.map((room) => {
            const hasRate = Boolean(room.display_rate);
            return (
              <div
                key={room.room_id}
                className="bg-white rounded-2xl border border-gray-200/90 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col group"
              >
                {/* Thumbnail Image */}
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  <img
                    src={room.thumbnail_url || 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04'}
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {room.primary_space_type && (
                    <span className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {room.primary_space_type.name}
                    </span>
                  )}
                  <span className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Sẵn sàng</span>
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 flex-grow flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-gray-500 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#F89C1E] shrink-0" />
                      <span>{room.studio.name}</span>
                      {room.studio.district && <span>• {room.studio.district}</span>}
                    </div>

                    <h3 className="font-extrabold text-sm text-gray-900 line-clamp-1 group-hover:text-[#F89C1E] transition-colors">
                      {room.name}
                    </h3>

                    {/* Room Attributes */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 pt-1">
                      <div className="flex items-center gap-1">
                        <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
                        <span>{room.area} m²</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span>{room.capacity} người</span>
                      </div>
                      {room.soundproof_level && (
                        <div className="flex items-center gap-1" title={room.soundproof_level}>
                          <Volume2 className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate max-w-[80px]">Cách âm</span>
                        </div>
                      )}
                    </div>

                    {/* Amenities Badges */}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1.5">
                        {room.amenities.slice(0, 3).map((a) => (
                          <span
                            key={a.amenity_id}
                            className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]"
                          >
                            {a.name}
                          </span>
                        ))}
                        {room.amenities.length > 3 && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">
                            +{room.amenities.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pricing & CTA */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                        Giá {RATE_UNIT_LABELS[rateUnit] || rateUnit}
                      </div>
                      <div className="text-base font-extrabold text-[#F89C1E]">
                        {hasRate
                          ? formatPriceVND(room.display_rate!.unit_price)
                          : <span className="text-xs text-gray-400 font-medium">Chưa có bảng giá</span>}
                      </div>
                    </div>

                    <Link
                      href={`/rooms/${room.room_id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 hover:bg-[#F89C1E] text-white text-xs font-bold rounded-lg transition-colors group-hover:bg-[#F89C1E]"
                    >
                      <span>Xem phòng</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination Bar */}
        {pagination.total_pages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg">
              Trang {pagination.page} / {pagination.total_pages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
              disabled={page >= pagination.total_pages}
              className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
