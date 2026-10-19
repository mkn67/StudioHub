'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, updateProfile, refreshProfile, isLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingInfo, setSavingInfo] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/login');
    }
  }, [isLoading, token, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-8 text-center text-gray-500">
        <div className="w-8 h-8 border-2 border-[#F89C1E] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Đang tải thông tin tài khoản...</p>
      </div>
    );
  }

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoMessage(null);
    setErrorMessage(null);
    setSavingInfo(true);

    try {
      await updateProfile({
        full_name: fullName,
        phone,
      });
      setInfoMessage('Cập nhật thông tin tài khoản thành công!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Cập nhật thất bại');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoMessage(null);
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu mới xác nhận không khớp');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Mật khẩu mới phải có tối thiểu 8 ký tự');
      return;
    }

    setChangingPass(true);

    try {
      await updateProfile({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setInfoMessage('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Đổi mật khẩu thất bại');
    } finally {
      setChangingPass(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return { text: 'Quản trị viên (Admin)', color: 'bg-red-100 text-red-800 border-red-200' };
      case 'host':
        return { text: 'Chủ Studio (Host)', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      default:
        return { text: 'Khách hàng (Customer)', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    }
  };

  const roleInfo = getRoleLabel(user.role);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[#F89C1E] text-white flex items-center justify-center text-2xl font-black shadow-md shrink-0">
          {user.full_name?.charAt(0) || 'U'}
        </div>
        <div className="flex-grow text-center sm:text-left space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">{user.full_name}</h1>
            <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${roleInfo.color}`}>
              {roleInfo.text}
            </span>
          </div>
          <p className="text-xs text-gray-500 flex items-center justify-center sm:justify-start gap-1">
            <Mail className="w-3.5 h-3.5" />
            <span>{user.email}</span>
          </p>
        </div>
      </div>

      {infoMessage && (
        <div className="p-3.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>{infoMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form 1: Cập nhật thông tin */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <UserIcon className="w-4 h-4 text-[#F89C1E]" />
            <h2 className="text-sm font-bold text-gray-800">Thông tin cá nhân</h2>
          </div>

          <form onSubmit={handleUpdateInfo} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Họ và tên
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F89C1E] focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Email (Không đổi)
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="block w-full px-3 py-2 text-sm border border-gray-200 bg-gray-50 text-gray-500 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F89C1E] focus:border-transparent outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={savingInfo}
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 bg-[#F89C1E] hover:bg-[#e08914] text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingInfo ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </form>
        </div>

        {/* Form 2: Đổi mật khẩu */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <KeyRound className="w-4 h-4 text-[#F89C1E]" />
            <h2 className="text-sm font-bold text-gray-800">Đổi mật khẩu</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F89C1E] focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Mật khẩu mới (≥ 8 ký tự)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F89C1E] focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F89C1E] focus:border-transparent outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={changingPass}
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{changingPass ? 'Đang cập nhật...' : 'Đổi mật khẩu'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

