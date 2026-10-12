'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getHealth, HealthResponse } from '@/lib/api';
import {
  Server,
  Database,
  Globe,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Activity,
  Layers,
  Clock,
  ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    const data = await getHealth();
    setHealth(data);
    setLastChecked(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const isApiConnected = health?.server === 'ok';
  const isDbConnected = health?.database === 'ok';
  const isAllHealthy = isApiConnected && isDbConnected;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Về Trang chủ</span>
          </Link>

          <button
            onClick={checkHealth}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Đang kiểm tra...' : 'Làm mới'}</span>
          </button>
        </div>

        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-400" />
            Kiểm Tra Kết Nối Hệ Thống (DevOps Health Check)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kiểm tra thông suốt: Next.js 14 ➔ PHP 8.2 Native API (PDO) ➔ PostgreSQL 16 (btree_gist)
          </p>
        </div>

        {/* Status Banner */}
        <div
          className={`p-4 rounded-xl border ${
            isAllHealthy
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/40 border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {isAllHealthy ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-400" />
            )}
            <div>
              <h2 className="font-bold text-sm">
                {isAllHealthy ? 'Toàn bộ Foundation Services Hoạt Động Bình Thường' : 'Cảnh báo Kết nối'}
              </h2>
              <p className="text-xs text-slate-400">
                {isAllHealthy
                  ? 'Giao tiếp từ Client tới PHP API và Database PostgreSQL phản hồi thành công.'
                  : health?.message || 'Có lỗi kết nối dịch vụ.'}
              </p>
            </div>
          </div>
        </div>

        {/* 3 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <Globe className="w-5 h-5 text-blue-400 mb-2" />
            <h3 className="font-bold text-xs text-white">Next.js Frontend</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Port 3000 • React 18</p>
            <span className="inline-block mt-2 text-[10px] font-bold text-emerald-400 uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              Running
            </span>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <Server className="w-5 h-5 text-indigo-400 mb-2" />
            <h3 className="font-bold text-xs text-white">PHP API Native</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Port 8000 • Apache Rewrite</p>
            <span
              className={`inline-block mt-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                isApiConnected
                  ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40'
                  : 'text-rose-400 bg-rose-950/60 border-rose-800/40'
              }`}
            >
              {health?.server || 'UNKNOWN'}
            </span>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <Database className="w-5 h-5 text-amber-400 mb-2" />
            <h3 className="font-bold text-xs text-white">MySQL 8.0 Database</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Port 3306 • PDO MySQL</p>
            <span
              className={`inline-block mt-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                isDbConnected
                  ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40'
                  : 'text-rose-400 bg-rose-950/60 border-rose-800/40'
              }`}
            >
              {health?.database || 'UNKNOWN'}
            </span>
          </div>
        </div>

        {health?.timestamp && (
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Thời gian truy vấn từ MySQL (`SELECT NOW()`):
            </span>
            <span className="font-mono text-emerald-400 font-semibold">{health.timestamp}</span>
          </div>
        )}
      </div>
    </div>
  );
}
