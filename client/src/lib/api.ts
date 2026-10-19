export interface ApiEnvelope<T = any> {
  status: 'success' | 'error';
  code: number;
  message: string;
  data: T;
  errors?: Array<{ field?: string; code?: string; message: string }>;
}

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  role: 'customer' | 'host' | 'admin' | string;
  status?: string;
  avatar_url?: string | null;
}

export interface SpaceType {
  space_type_id: number;
  name: string;
  description: string | null;
  is_primary?: boolean;
}

export interface Amenity {
  amenity_id: number;
  name: string;
  icon: string | null;
}

export interface RoomRate {
  rate_id: number;
  room_id?: number;
  rate_unit: 'hour' | 'half_day' | 'day' | 'week' | 'month' | 'session' | string;
  unit_minutes: number;
  unit_price: number;
  minimum_units: number;
  maximum_units: number | null;
  effective_from: string;
  effective_to: string | null;
  status: string;
}

export interface RoomImage {
  image_id: number;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface RoomStudio {
  studio_id: number;
  name: string;
  description?: string;
  address: string;
  district?: string | null;
  city: string;
  phone?: string | null;
}

export interface RoomItem {
  room_id: number;
  studio_id: number;
  name: string;
  description: string | null;
  area: number;
  ceiling_height: number | null;
  capacity: number;
  soundproof_level: string | null;
  status: string;
  studio: RoomStudio;
  thumbnail_url: string | null;
  primary_space_type: SpaceType | null;
  display_rate: {
    rate_unit: string;
    unit_price: number;
  } | null;
  amenities: Amenity[];
}

export interface RoomDetail {
  room_id: number;
  studio_id: number;
  name: string;
  description: string | null;
  area: number;
  ceiling_height: number | null;
  capacity: number;
  soundproof_level: string | null;
  power_specs: string | null;
  rules: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  studio: RoomStudio;
  space_types: SpaceType[];
  amenities: Amenity[];
  images: RoomImage[];
  rates: RoomRate[];
}

export interface BusySlot {
  busy_start: string;
  busy_end: string;
}

export interface RoomCalendar {
  room_id: number;
  from: string;
  to: string;
  busy_slots: BusySlot[];
}

export interface Equipment {
  equipment_id: number;
  studio_id: number;
  category_id: number;
  category_name: string;
  name: string;
  brand: string | null;
  description: string | null;
  unit_price: number;
  pricing_unit: 'hour' | 'session' | string;
  total_quantity: number;
  image_url: string | null;
  status: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface HealthResponse {
  success: boolean;
  server: string;
  database: string;
  mysql_version?: string;
  timestamp?: string;
  message?: string;
  latencyMs?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Custom error class for API errors
 */
export class ApiException extends Error {
  code: number;
  errors: Array<{ field?: string; code?: string; message: string }>;

  constructor(message: string, code: number = 500, errors: Array<{ field?: string; code?: string; message: string }> = []) {
    super(message);
    this.name = 'ApiException';
    this.code = code;
    this.errors = errors;
  }
}

/**
 * Universal fetch wrapper for PHP backend API
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiEnvelope<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Attach token if stored in browser
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json: ApiEnvelope<T> = await response.json().catch(() => ({
    status: 'error',
    code: response.status,
    message: `Lỗi kết nối máy chủ (${response.status})`,
    data: null as any,
    errors: [],
  }));

  if (!response.ok || json.status === 'error') {
    throw new ApiException(json.message || 'Lỗi xử lý yêu cầu', json.code || response.status, json.errors || []);
  }

  return json;
}

// ==========================================
// Phase 0: Health Check
// ==========================================
export async function getHealth(): Promise<HealthResponse> {
  const startTime = performance.now();
  try {
    const res = await apiRequest<{
      server: string;
      database: string;
      mysql_version: string;
      timestamp: string;
    }>('/api/health');

    const latencyMs = Math.round(performance.now() - startTime);

    return {
      success: res.status === 'success',
      server: res.data?.server || 'ok',
      database: res.data?.database || 'ok',
      mysql_version: res.data?.mysql_version,
      timestamp: res.data?.timestamp,
      message: res.message,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      server: 'disconnected',
      database: 'disconnected',
      message: err.message || 'Không thể kết nối đến máy chủ backend',
      latencyMs,
    };
  }
}

// ==========================================
// Phase 3: Auth & Account
// ==========================================
export async function apiLogin(credentials: { email: string; password: string }) {
  const res = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  return res.data;
}

export async function apiRegister(data: { full_name: string; email: string; password: string; phone: string }) {
  const res = await apiRequest<{ token: string; user: User }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function apiLogout() {
  return await apiRequest('/api/auth/logout', { method: 'POST' });
}

export async function apiGetProfile() {
  const res = await apiRequest<User>('/api/auth/profile', { method: 'GET' });
  return res.data;
}

export async function apiUpdateProfile(data: {
  full_name?: string;
  phone?: string;
  current_password?: string;
  new_password?: string;
}) {
  const res = await apiRequest<User>('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.data;
}

// ==========================================
// Phase 4: Public Catalog
// ==========================================
export async function getSpaceTypes(): Promise<SpaceType[]> {
  const res = await apiRequest<SpaceType[]>('/api/space-types');
  return res.data || [];
}

export async function getAmenities(): Promise<Amenity[]> {
  const res = await apiRequest<Amenity[]>('/api/amenities');
  return res.data || [];
}

export interface RoomFilterParams {
  keyword?: string;
  space_type_id?: number;
  rate_unit?: string;
  min_price?: number;
  max_price?: number;
  min_area?: number;
  page?: number;
  limit?: number;
}

export async function getRooms(params: RoomFilterParams = {}): Promise<{
  items: RoomItem[];
  pagination: Pagination;
}> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.space_type_id) query.set('space_type_id', String(params.space_type_id));
  if (params.rate_unit) query.set('rate_unit', params.rate_unit);
  if (params.min_price !== undefined) query.set('min_price', String(params.min_price));
  if (params.max_price !== undefined) query.set('max_price', String(params.max_price));
  if (params.min_area !== undefined) query.set('min_area', String(params.min_area));
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  const endpoint = qs ? `/api/rooms?${qs}` : '/api/rooms';
  const res = await apiRequest<{ items: RoomItem[]; pagination: Pagination }>(endpoint);
  return res.data;
}

export async function getRoomDetail(roomId: number): Promise<RoomDetail> {
  const res = await apiRequest<RoomDetail>(`/api/rooms/${roomId}`);
  return res.data;
}

export async function getRoomCalendar(
  roomId: number,
  from?: string,
  to?: string
): Promise<RoomCalendar> {
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const qs = query.toString();
  const endpoint = qs ? `/api/rooms/${roomId}/calendar?${qs}` : `/api/rooms/${roomId}/calendar`;
  const res = await apiRequest<RoomCalendar>(endpoint);
  return res.data;
}

export async function getRoomRates(roomId: number): Promise<RoomRate[]> {
  const res = await apiRequest<RoomRate[]>(`/api/rooms/${roomId}/rates`);
  return res.data || [];
}

export async function getEquipments(studioId: number, categoryId?: number): Promise<Equipment[]> {
  const query = new URLSearchParams();
  query.set('studio_id', String(studioId));
  if (categoryId) query.set('category_id', String(categoryId));
  const res = await apiRequest<Equipment[]>(`/api/equipments?${query.toString()}`);
  return res.data || [];
}
