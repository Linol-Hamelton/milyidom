"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDaysIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  CurrencyDollarIcon,
  HomeModernIcon,
  PresentationChartBarIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { RequireAuth } from "../../../components/ui/require-auth";
import { Skeleton } from "../../../components/ui/skeleton";
import { Button } from "../../../components/ui/button";
import { RevenueChart } from "../../../components/ui/revenue-chart";
import { IcalSync } from "../../../components/host/ical-sync";
import { AvailabilityCalendar } from "../../../components/host/availability-calendar";
import { fetchHostListings } from "../../../services/listings";
import { fetchHostBookings, updateBookingStatus } from "../../../services/bookings";
import { fetchHostAnalytics } from "../../../services/analytics";
import type { Listing, Booking, BookingStatus } from "../../../types/api";
import type { HostAnalytics } from "../../../services/analytics";
import { parseError } from "../../../lib/api-client";
import { decimalToNumber } from "../../../lib/format";

type TabDefinition = {
  id: "overview" | "listings" | "bookings" | "analytics" | "ical" | "availability";
  name: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  href?: string;
};

const TABS = [
  { id: "overview", name: "Обзор", icon: ChartBarIcon },
  { id: "listings", name: "Объявления", icon: HomeModernIcon, href: "/host/listings" },
  { id: "bookings", name: "Бронирования", icon: CalendarDaysIcon, href: "/host/bookings" },
  { id: "analytics", name: "Аналитика", icon: PresentationChartBarIcon },
  { id: "ical", name: "Календари", icon: ClipboardDocumentCheckIcon },
  { id: "availability", name: "Доступность", icon: CalendarDaysIcon },
] satisfies ReadonlyArray<TabDefinition>;

type TabId = TabDefinition["id"];

type MetricCardColor = "blue" | "green" | "yellow" | "purple" | "gray";

type MetricDefinition = {
  label: string;
  value: string | number;
  change?: string;
  icon: ReactNode;
  color: MetricCardColor;
};

const STATUS_RU: Record<string, string> = {
  confirmed: "Подтверждено",
  pending: "Ожидает",
  cancelled: "Отменено",
  completed: "Завершено",
  published: "Опубликовано",
  draft: "Черновик",
  unlisted: "Снято",
};

export default function HostDashboardPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [analytics, setAnalytics] = useState<HostAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [actioningId, setActioningId] = useState<string | null>(null);
  const router = useRouter();

  const handleBookingAction = async (bookingId: string, status: BookingStatus) => {
    setActioningId(bookingId);
    try {
      await updateBookingStatus(bookingId, status);
      toast.success(status === "CONFIRMED" ? "Бронирование подтверждено" : "Бронирование отклонено");
      const response = await fetchHostBookings({ limit: 50 });
      setBookings(response.items);
    } catch (error) {
      toast.error(parseError(error).message);
    } finally {
      setActioningId(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [listingResponse, bookingResponse] = await Promise.all([
          fetchHostListings({ limit: 50 }),
          fetchHostBookings({ limit: 50 }),
        ]);
        setListings(listingResponse.items);
        setBookings(bookingResponse.items);
      } catch (error) {
        const { message } = parseError(error);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const metrics = useMemo(() => {
    const published = listings.filter((listing) => listing.status === "PUBLISHED").length;
    const draft = listings.filter((listing) => listing.status === "DRAFT").length;
    const activeBookings = bookings.filter((booking) => booking.status === "CONFIRMED").length;
    const pendingBookings = bookings.filter((booking) => booking.status === "PENDING").length;
    const revenue = bookings
      .filter((booking) => booking.status === "CONFIRMED" || booking.status === "COMPLETED")
      .reduce((total, booking) => total + decimalToNumber(booking.totalPrice), 0);
    const occupancyRate = published > 0 ? Math.round((activeBookings / (published * 30)) * 100) : 0;
    return { published, draft, activeBookings, pendingBookings, revenue, occupancyRate };
  }, [bookings, listings]);

  const metricCards: MetricDefinition[] = useMemo(
    () => [
      {
        label: "Активные объявления",
        value: metrics.published,
        change: metrics.published ? `${metrics.published} опубликовано` : "Нет активных",
        icon: <HomeModernIcon className="h-5 w-5" />,
        color: "blue",
      },
      {
        label: "Активные бронирования",
        value: metrics.activeBookings,
        change: metrics.activeBookings ? "Гости в пути" : "Нет активных заездов",
        icon: <CalendarDaysIcon className="h-5 w-5" />,
        color: "green",
      },
      {
        label: "Ожидают ответа",
        value: metrics.pendingBookings,
        change: metrics.pendingBookings ? "Требуют подтверждения" : "Всё обработано",
        icon: <ClipboardDocumentCheckIcon className="h-5 w-5" />,
        color: "yellow",
      },
      {
        label: "Загрузка",
        value: `${metrics.occupancyRate}%`,
        change: "Прогноз на месяц",
        icon: <PresentationChartBarIcon className="h-5 w-5" />,
        color: "purple",
      },
      {
        label: "Доход",
        value: metrics.revenue.toLocaleString("ru-RU", {
          style: "currency",
          currency: "RUB",
          maximumFractionDigits: 0,
        }),
        change: "Подтверждённые бронирования",
        icon: <CurrencyDollarIcon className="h-5 w-5" />,
        color: "green",
      },
      {
        label: "Черновики",
        value: metrics.draft,
        change: metrics.draft ? "Требуют публикации" : "Нет черновиков",
        icon: <HomeModernIcon className="h-5 w-5" />,
        color: "gray",
      },
    ],
    [metrics],
  );

  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status === "PENDING"),
    [bookings],
  );

  const recentBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.status !== "PENDING")
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [bookings],
  );

  const recentListings = useMemo(
    () =>
      listings
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [listings],
  );

  const renderDateRange = (checkIn: string, checkOut: string) => {
    const fmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
    return `${fmt.format(new Date(checkIn))} — ${fmt.format(new Date(checkOut))}`;
  };

  const handleTabClick = (tab: (typeof TABS)[number]) => {
    if (tab.href) {
      router.push(tab.href);
      return;
    }
    setActiveTab(tab.id);
    if (tab.id === "analytics" && !analytics && !analyticsLoading) {
      setAnalyticsLoading(true);
      fetchHostAnalytics()
        .then(setAnalytics)
        .catch((err) => toast.error(parseError(err).message))
        .finally(() => setAnalyticsLoading(false));
    }
  };

  return (
    <RequireAuth roles={["HOST", "ADMIN"]}>
      <div className="min-h-screen bg-sand-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">Кабинет хоста</h1>
                <p className="mt-2 text-slate-500">
                  Отслеживайте показатели объявлений, отвечайте гостям и синхронизируйте календарь.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => router.push("/host/listings/new")}
                  className="bg-pine-600 hover:bg-pine-500"
                >
                  Создать объявление
                </Button>
                <Button variant="outline" onClick={() => router.push("/host/listings")}>
                  Управлять объявлениями
                </Button>
              </div>
            </div>
          </div>

          <div className="mb-8 border-b border-slate-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Вкладки панели хоста">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const baseClasses = "flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition";
                const activeClasses = "border-pine-600 text-pine-700";
                const inactiveClasses = "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700";

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab)}
                    className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {activeTab === "overview" && (
            <>
              {loading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-32 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {metricCards.map((metric) => (
                    <MetricCard key={metric.label} {...metric} />
                  ))}
                </div>
              )}

              {!loading && pendingBookings.length > 0 && (
                <div className="mt-8 rounded-xl border border-yellow-200 bg-yellow-50 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-yellow-900">
                        Запросы на бронирование ({pendingBookings.length})
                      </h3>
                      <p className="text-sm text-yellow-700">Требуют вашего ответа</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {pendingBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4 shadow-sm"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{booking.listing.title}</p>
                          <p className="text-sm text-gray-500">
                            {renderDateRange(booking.checkIn, booking.checkOut)} ·{" "}
                            {decimalToNumber(booking.totalPrice).toLocaleString("ru-RU", {
                              style: "currency",
                              currency: booking.currency,
                              maximumFractionDigits: 0,
                            })}
                          </p>
                          <p className="text-xs text-gray-400">
                            Гость: {booking.guest?.profile?.firstName ?? booking.guest?.email ?? "—"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleBookingAction(booking.id, "CONFIRMED")}
                            disabled={actioningId === booking.id}
                            className="bg-green-600 text-white hover:bg-green-700 text-sm px-4 py-2"
                          >
                            {actioningId === booking.id ? "…" : "Подтвердить"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleBookingAction(booking.id, "CANCELLED")}
                            disabled={actioningId === booking.id}
                            className="border-red-200 text-red-600 hover:bg-red-50 text-sm px-4 py-2"
                          >
                            Отклонить
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!loading && (
                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Последние бронирования</h3>
                      <Button variant="ghost" size="sm" onClick={() => router.push("/host/bookings")}>Все</Button>
                    </div>
                    <div className="space-y-4">
                      {recentBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between rounded-lg border border-gray-100 p-4 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-3 w-3 rounded-full ${
                                booking.status === "CONFIRMED"
                                  ? "bg-green-500"
                                  : booking.status === "PENDING"
                                  ? "bg-yellow-500"
                                  : "bg-gray-400"
                              }`}
                            />
                            <div>
                              <p className="font-medium text-gray-900">{booking.listing.title}</p>
                              <p className="text-sm text-gray-500">{renderDateRange(booking.checkIn, booking.checkOut)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {decimalToNumber(booking.totalPrice).toLocaleString("ru-RU", {
                                style: "currency",
                                currency: booking.currency,
                                maximumFractionDigits: 0,
                              })}
                            </p>
                            <p className="text-xs text-gray-500">
                              {STATUS_RU[booking.status.toLowerCase()] ?? booking.status}
                            </p>
                          </div>
                        </div>
                      ))}
                      {recentBookings.length === 0 && (
                        <div className="py-8 text-center">
                          <p className="text-gray-500">Нет бронирований.</p>
                          <p className="mt-1 text-sm text-gray-400">Как только гости забронируют, они появятся здесь.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Недавние объявления</h3>
                      <Button variant="ghost" size="sm" onClick={() => router.push("/host/listings")}>Все</Button>
                    </div>
                    <div className="space-y-4">
                      {recentListings.map((listing) => (
                        <div
                          key={listing.id}
                          className="flex items-center justify-between rounded-lg border border-gray-100 p-4 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-3 w-3 rounded-full ${
                                listing.status === "PUBLISHED"
                                  ? "bg-green-500"
                                  : listing.status === "DRAFT"
                                  ? "bg-yellow-500"
                                  : "bg-gray-400"
                              }`}
                            />
                            <div>
                              <p className="font-medium text-gray-900">{listing.title}</p>
                              <p className="text-sm text-gray-500">
                                {listing.city}, {listing.country}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {Number(listing.basePrice).toLocaleString("ru-RU", {
                                style: "currency",
                                currency: listing.currency,
                                maximumFractionDigits: 0,
                              })}
                              <span className="text-xs text-gray-500">/ночь</span>
                            </p>
                            <p className="text-xs text-gray-500">
                              {STATUS_RU[listing.status.toLowerCase()] ?? listing.status}
                            </p>
                          </div>
                        </div>
                      ))}
                      {recentListings.length === 0 && (
                        <div className="py-8 text-center">
                          <p className="text-gray-500">Нет объявлений.</p>
                          <p className="mt-1 text-sm text-gray-400">Создайте объявление, чтобы начать принимать гостей.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6">
              {analyticsLoading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                  ))}
                </div>
              ) : analytics ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                      label="Общий доход (12 мес)"
                      value={analytics.totalRevenue.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 })}
                      icon={<CurrencyDollarIcon className="h-5 w-5" />}
                      color="green"
                    />
                    <MetricCard
                      label="Всего бронирований (12 мес)"
                      value={analytics.totalBookings}
                      icon={<CalendarDaysIcon className="h-5 w-5" />}
                      color="blue"
                    />
                    <MetricCard
                      label="Средняя загрузка"
                      value={`${analytics.avgOccupancyRate}%`}
                      icon={<PresentationChartBarIcon className="h-5 w-5" />}
                      color="purple"
                    />
                    <MetricCard
                      label="Заездов на неделе"
                      value={analytics.upcomingCheckIns}
                      change={`${analytics.upcomingCheckOuts} выездов`}
                      icon={<HomeModernIcon className="h-5 w-5" />}
                      color="yellow"
                    />
                  </div>

                  <div className="rounded-xl bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">Ежемесячный доход</h3>
                    <RevenueChart data={analytics.monthlyRevenue} />
                  </div>

                  {analytics.listingPerformance.length > 0 && (
                    <div className="rounded-xl bg-white p-6 shadow-sm">
                      <h3 className="mb-4 text-lg font-semibold text-gray-900">Эффективность объявлений</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-gray-500">
                              <th className="pb-3 font-medium">Объявление</th>
                              <th className="pb-3 font-medium">Броней</th>
                              <th className="pb-3 font-medium">Загрузка</th>
                              <th className="pb-3 font-medium">Доход</th>
                              <th className="pb-3 font-medium">Рейтинг</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {analytics.listingPerformance.map((l) => (
                              <tr key={l.listingId} className="hover:bg-gray-50">
                                <td className="py-3 pr-4">
                                  <p className="font-medium text-gray-900">{l.title}</p>
                                  <p className="text-xs text-gray-500">{l.city}</p>
                                </td>
                                <td className="py-3 pr-4">{l.bookingsCount}</td>
                                <td className="py-3 pr-4">{l.occupancyRate}%</td>
                                <td className="py-3 pr-4">
                                  {l.revenue.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 })}
                                </td>
                                <td className="py-3">
                                  {l.avgRating > 0 ? `★ ${l.avgRating.toFixed(1)}` : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl bg-white p-10 text-center shadow-sm">
                  <p className="text-gray-500">Нажмите на вкладку «Аналитика» для загрузки данных.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "ical" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Синхронизация календарей</h2>
                <p className="text-sm text-gray-500">
                  Экспортируйте ваш календарь бронирований или импортируйте занятые даты из внешних платформ.
                </p>
              </div>
              {listings.length === 0 ? (
                <div className="rounded-xl bg-white p-10 text-center shadow-sm">
                  <p className="text-gray-500">Создайте объявление, чтобы настроить синхронизацию календаря.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {listings.map((listing) => (
                    <div key={listing.id} className="rounded-xl bg-white p-6 shadow-sm">
                      <h3 className="mb-4 font-semibold text-gray-900">{listing.title}</h3>
                      <IcalSync listingId={listing.id} icalToken={listing.icalToken} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "availability" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Управление доступностью</h2>
                <p className="text-sm text-gray-500">
                  Кликните на дату или выберите диапазон, чтобы заблокировать или открыть даты для бронирования.
                </p>
              </div>
              {listings.length === 0 ? (
                <div className="rounded-xl bg-white p-10 text-center shadow-sm">
                  <p className="text-gray-500">Создайте объявление, чтобы управлять доступностью.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {listings.map((listing) => (
                    <div key={listing.id} className="space-y-3">
                      <h3 className="font-semibold text-gray-900">{listing.title}</h3>
                      <AvailabilityCalendar listingId={listing.id} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}

function MetricCard({
  label,
  value,
  change,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  change?: string;
  icon: ReactNode;
  color: MetricCardColor;
}) {
  const colorClasses: Record<MetricCardColor, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
    purple: "bg-purple-50 text-purple-700",
    gray: "bg-gray-50 text-gray-700",
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          {change && <p className="mt-1 text-xs text-gray-500">{change}</p>}
        </div>
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
}
