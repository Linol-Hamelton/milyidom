"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  UsersIcon,
  HomeIcon,
  CalendarDaysIcon,
  CurrencyRupeeIcon,
  UserPlusIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { Skeleton } from '../../components/ui/skeleton';
import { fetchPlatformStats } from '../../services/admin';
import { parseError } from '../../lib/api-client';
import type { PlatformStats } from '../../types/api';

interface KpiCard {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformStats()
      .then(setStats)
      .catch((err) => toast.error(parseError(err).message))
      .finally(() => setLoading(false));
  }, []);

  const kpis: KpiCard[] = stats
    ? [
        { label: 'Всего пользователей', value: stats.totalUsers.toLocaleString(), icon: UsersIcon, color: 'text-blue-600 bg-blue-50' },
        { label: 'Активных объявлений', value: stats.totalListings.toLocaleString(), icon: HomeIcon, color: 'text-pine-600 bg-pine-50' },
        { label: 'Всего бронирований', value: stats.totalBookings.toLocaleString(), icon: CalendarDaysIcon, color: 'text-amber-600 bg-amber-50' },
        { label: 'Новых пользователей (30д)', value: stats.newUsers30d.toLocaleString(), icon: UserPlusIcon, color: 'text-purple-600 bg-purple-50' },
        {
          label: 'Оборот (30д)',
          value: new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(stats.gmv30d),
          icon: CurrencyRupeeIcon,
          color: 'text-emerald-600 bg-emerald-50',
        },
      ]
    : [];

  const quickLinks = [
    { href: '/admin/users', label: 'Пользователи', icon: UsersIcon, desc: 'Просмотр, блокировка и управление ролями' },
    { href: '/admin/listings', label: 'Модерация объявлений', icon: ClipboardDocumentListIcon, desc: 'Публикация, снятие с публикации, черновики' },
    { href: '/admin/analytics', label: 'Аналитика', icon: ChartBarIcon, desc: 'Ключевые показатели платформы и графики доходов' },
    { href: '/admin/reviews', label: 'Модерация отзывов', icon: ChatBubbleLeftRightIcon, desc: 'Скрытие и удаление нарушающих правила отзывов' },
    { href: '/admin/audit-log', label: 'Журнал действий', icon: ShieldCheckIcon, desc: 'Полная история административных действий' },
  ];

  return (
    <div className="p-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Администратор</p>
        <h1 className="mt-1 text-2xl font-serif font-semibold text-slate-900">Главная</h1>
      </header>

      {/* KPI Cards */}
      <section className="mb-10">
        <h2 className="mb-4 text-sm font-semibold text-slate-500 uppercase tracking-wide">Обзор платформы</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl bg-white p-5 shadow-soft">
                <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xl font-bold text-slate-900">{value}</p>
                <p className="mt-0.5 text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick links */}
      <section>
        <h2 className="mb-4 text-sm font-semibold text-slate-500 uppercase tracking-wide">Быстрые действия</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {quickLinks.map(({ href, label, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-soft transition-shadow hover:shadow-md"
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pine-50 text-pine-700">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{label}</p>
                <p className="mt-0.5 text-sm text-slate-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
