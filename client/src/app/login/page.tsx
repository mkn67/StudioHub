'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Camera, LogIn, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already logged in, show status
  if (user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl shadow-sm border border-gray-200 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 mx-auto flex items-center justify-center font-bold">
          ✓
        </div>
        <h2 className="text-xl font-bold text-gray-800">Bạn đã đăng nhập!</h2>
        <p className="text-sm text-gray-600">Đang đăng nhập với email: <strong>{user.email}</strong></p>
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
    setLoading(true);

    try {
      await login({ email, password });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Đăng nhập không thành công');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#F89C1E] flex items-center justify-center text-white mx-auto shadow-md">
          <Camera className="w-6 h-6 text-white" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-gray-900 tracking-tight">
          Đăng nhập vào StudioHub
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="font-semibold text-[#F89C1E] hover:underline">
            Đăng ký ngay
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
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F89C1E] focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-[#F89C1E] hover:bg-[#e08914] text-white text-sm font-bold rounded-xl shadow-xs transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Đang xác thực...' : 'Đăng nhập'}</span>
            </button>
          </form>

          {/* Quick Dev Accounts Section */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center mb-2.5">
              Tài khoản mẫu thử nghiệm (Seed DB)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillQuickAccount('customer@test.local', 'password123')}
                className="p-2 border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-blue-800 rounded-lg text-left transition-all"
              >
                <div className="font-bold">Khách hàng</div>
                <div className="text-[10px] text-blue-600 truncate">customer@test.local</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('host1@test.local', 'password123')}
                className="p-2 border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-amber-800 rounded-lg text-left transition-all"
              >
                <div className="font-bold">Host 1 (Artemis)</div>
                <div className="text-[10px] text-amber-600 truncate">host1@test.local</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('host2@test.local', 'password123')}
                className="p-2 border border-purple-200 bg-purple-50/50 hover:bg-purple-100/70 text-purple-800 rounded-lg text-left transition-all"
              >
                <div className="font-bold">Host 2 (Zenith)</div>
                <div className="text-[10px] text-purple-600 truncate">host2@test.local</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('admin@test.local', 'password123')}
                className="p-2 border border-red-200 bg-red-50/50 hover:bg-red-100/70 text-red-800 rounded-lg text-left transition-all"
              >
                <div className="font-bold">Admin Quản trị</div>
                <div className="text-[10px] text-red-600 truncate">admin@test.local</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
