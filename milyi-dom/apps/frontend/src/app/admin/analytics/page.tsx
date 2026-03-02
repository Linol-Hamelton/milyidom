"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  UserGroupIcon,
  HomeModernIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  BuildingOffice2Icon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { RequireAuth } from "../../../components/ui/require-auth";
import { Skeleton } from "../../../components/ui/skeleton";
import { fetchAdminAnalytics, type AdminAnalytics } from "../../../services/analytics";
import { parseError } from "../../../lib/api-client";

function fmt(n: number) {
  return new Intl.NumberFormat("ru-RU").format(n);
}

function fmtMoney(n: number, currency = "RUB") {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  delay: number;
}

function KpiCard({ label, value, sub, icon, accent, delay }: KpiCardProps) {
  return (
    <motion.div
      className="flex items-start gap-4 rounded-3xl bg-white p-6 shadow-soft"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
    >
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </motion.div>
  );
}

function CityBar({ city, count, max }: { city: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 truncate text-sm text-slate-700">{city}</span>
      <div className="flex-1 rounded-full bg-slate-100 h-3 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-pine-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="w-8 text-right text-sm font-semibold text-slate-800">{count}</span>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminAnalytics()
      .then(setData)
      .catch((err) => toast.error(parseError(err).message))
      .finally(() => setLoading(false));
  }, []);

  const maxCityCount = data ? Math.max(...data.topCities.map((c) => c.count), 1) : 1;

  return (
    <RequireAuth roles={["ADMIN"]}>
      <div className="min-h-screen bg-sand-50 py-12">
        <div className="mx-auto max-w-content-xl px-6 lg:px-10">

          {/* Header */}
          <header className="mb-10 space-y-1">
            <p className="text-sm uppercase tracking-wide text-pine-600">Администратор</p>
            <h1 className="text-3xl font-serif text-slate-900">Аналитика платформы</h1>
            <p className="text-sm text-slate-500">
              Ключевые показатели платформы Милый Дом в реальном времени.
            </p>
          </header>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-3xl" />
              ))}
            </div>
          ) : data ? (
            <>
              {/* ── KPI grid ──────────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="Всего пользователей"
                  value={fmt(data.totalUsers)}
                  sub={`+${fmt(data.newUsers30d)} за 30 дней`}
                  icon={<UserGroupIcon className="h-6 w-6 text-blue-600" />}
                  accent="bg-blue-50"
                  delay={0}
                />
                <KpiCard
                  label="Активных хостов"
                  value={fmt(data.totalHosts)}
                  icon={<BuildingOffice2Icon className="h-6 w-6 text-violet-600" />}
                  accent="bg-violet-50"
                  delay={0.06}
                />
                <KpiCard
                  label="Активных объявлений"
                  value={fmt(data.totalListings)}
                  icon={<HomeModernIcon className="h-6 w-6 text-pine-600" />}
                  accent="bg-pine-50"
                  delay={0.12}
                />
                <KpiCard
                  label="Всего бронирований"
                  value={fmt(data.totalBookings)}
                  icon={<CalendarDaysIcon className="h-6 w-6 text-emerald-600" />}
                  accent="bg-emerald-50"
                  delay={0.18}
                />
                <KpiCard
                  label="Общая выручка"
                  value={fmtMoney(data.totalRevenue)}
                  sub="За всё время (оплаченные платежи)"
                  icon={<CurrencyDollarIcon className="h-6 w-6 text-amber-600" />}
                  accent="bg-amber-50"
                  delay={0.24}
                />
                <KpiCard
                  label="GMV — последние 30 дней"
                  value={fmtMoney(data.gmv30d)}
                  icon={<ArrowTrendingUpIcon className="h-6 w-6 text-rose-600" />}
                  accent="bg-rose-50"
                  delay={0.3}
                />
                <KpiCard
                  label="Новых пользователей (30д)"
                  value={fmt(data.newUsers30d)}
                  icon={<UserPlusIcon className="h-6 w-6 text-cyan-600" />}
                  accent="bg-cyan-50"
                  delay={0.36}
                />
                <KpiCard
                  label="Конверсия"
                  value={`${data.conversionRate}%`}
                  sub="Бронирований на объявление (30д)"
                  icon={<ChartBarIcon className="h-6 w-6 text-orange-600" />}
                  accent="bg-orange-50"
                  delay={0.42}
                />
              </div>

              {/* ── Top cities ────────────────────────────────────────────────── */}
              {data.topCities.length > 0 && (
                <motion.section
                  className="mt-10 rounded-3xl bg-white p-8 shadow-soft"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h2 className="mb-6 text-lg font-semibold text-slate-900">
                    Топ городов по объявлениям
                  </h2>
                  <div className="space-y-4">
                    {data.topCities.map((c) => (
                      <CityBar
                        key={c.city}
                        city={c.city}
                        count={c.count}
                        max={maxCityCount}
                      />
                    ))}
                  </div>
                </motion.section>
              )}
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-pine-200 bg-white p-12 text-center">
              <p className="text-slate-500">Не удалось загрузить аналитику.</p>
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
