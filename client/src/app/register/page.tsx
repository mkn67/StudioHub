'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Camera, UserPlus, Lock, Mail, Phone, User as UserIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl shadow-sm border border-gray-200 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center font-bold">
          ✓
        </div>
        <h2 className="text-xl font-bold text-gray-800">Bạn đã đăng nhập!</h2>
        <p className="text-sm text-gray-600">Email: <strong>{user.email}</strong></p>
        <div className="pt-4 flex justify-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-semibold transition-all"
          >
            Về Trang chủ
          </Link>
          <Link
            href="/profile"
            className="px-4 py-2 bg-[#F89C1E] hover:bg-[#e08914] text-white rounded-lg text-sm font-semibold transition-all"
          >
            Xem Hồ sơ
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    setLoading(true);

    try {
      await register({
        full_name: fullName,
        email,
        phone,
        password,
      });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Đăng ký tài khoản không thành công');
      if (Array.isArray(err.errors)) {
        const mapped: Record<string, string> = {};
        err.errors.forEach((e: any) => {
          if (e.field) mapped[e.field] = e.message;
        });
        setFieldErrors(mapped);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#F89C1E] flex items-center justify-center text-white mx-auto shadow-md">
          <Camera className="w-6 h-6 text-white" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-gray-900 tracking-tight">
          Tạo tài khoản StudioHub
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-semibold text-[#F89C1E] hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-gray-200 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Họ và tên
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F89C1E] focus:border-transparent outline-none transition-all"
                />
              </div>
              {fieldErrors.full_name && (
                <p className="text-[11px] text-red-500 mt-1">{fieldErrors.full_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F89C1E] focus:border-transparent outline-none transition-all"
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] text-red-500 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Số điện thoại
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F89C1E] focus:border-transparent outline-none transition-all"
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-[11px] text-red-500 mt-1">{fieldErrors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Mật khẩu (tối thiểu 8 ký tự)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F89C1E] focus:border-transparent outline-none transition-all"
                />
              </div>
              {fieldErrors.password && (
                <p className="text-[11px] text-red-500 mt-1">{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F89C1E] focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Quy định bảo mật &amp; Phân quyền:</span>
              </div>
              <p>Mọi tài khoản đăng ký mới luôn mặc định nhận vai trò Khách hàng (Customer) để đảm bảo an toàn hệ thống theo Phase 3.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-[#F89C1E] hover:bg-[#e08914] text-white text-sm font-bold rounded-xl shadow-xs transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
