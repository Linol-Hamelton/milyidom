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
import { fetchHostListings } from "../../../services/listings";
import { fetchHostBookings } from "../../../services/bookings";
import type { Listing, Booking } from "../../../types/api";
import { parseError } from "../../../lib/api-client";

type TabDefinition = {
  id: "overview" | "listings" | "bookings" | "analytics";
  name: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  href?: string;
};

const TABS = [
  { id: "overview", name: "Overview", icon: ChartBarIcon },
  { id: "listings", name: "Listings", icon: HomeModernIcon, href: "/host/listings" },
  { id: "bookings", name: "Bookings", icon: CalendarDaysIcon, href: "/host/bookings" },
  { id: "analytics", name: "Analytics", icon: PresentationChartBarIcon },
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

export default function HostDashboardPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const router = useRouter();

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
      .reduce((total, booking) => total + Number(booking.totalPrice), 0);

    const occupancyRate = published > 0 ? Math.round((activeBookings / (published * 30)) * 100) : 0;

    return { published, draft, activeBookings, pendingBookings, revenue, occupancyRate };
  }, [bookings, listings]);

  const metricCards: MetricDefinition[] = useMemo(
    () => [
      {
        label: "Published listings",
        value: metrics.published,
        change: metrics.published ? `${metrics.published} live` : "No listings live",
        icon: <HomeModernIcon className="h-5 w-5" />,
        color: "blue",
      },
      {
        label: "Active bookings",
        value: metrics.activeBookings,
        change: metrics.activeBookings ? "Guests on the way" : "No active stays",
        icon: <CalendarDaysIcon className="h-5 w-5" />,
        color: "green",
      },
      {
        label: "Pending requests",
        value: metrics.pendingBookings,
        change: metrics.pendingBookings ? "Action required" : "All caught up",
        icon: <ClipboardDocumentCheckIcon className="h-5 w-5" />,
        color: "yellow",
      },
      {
        label: "Occupancy",
        value: `${metrics.occupancyRate}%`,
        change: "Projected this month",
        icon: <PresentationChartBarIcon className="h-5 w-5" />,
        color: "purple",
      },
      {
        label: "Revenue",
        value: metrics.revenue.toLocaleString("en-US", {
          style: "currency",
          currency: "RUB",
          maximumFractionDigits: 0,
        }),
        change: "Includes confirmed stays",
        icon: <CurrencyDollarIcon className="h-5 w-5" />,
        color: "green",
      },
      {
        label: "Draft listings",
        value: metrics.draft,
        change: metrics.draft ? "Needs publishing" : "No drafts",
        icon: <HomeModernIcon className="h-5 w-5" />,
        color: "gray",
      },
    ],
    [metrics],
  );

  const recentBookings = useMemo(
    () =>
      bookings
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
    const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
    return `${formatter.format(new Date(checkIn))} вЂ“ ${formatter.format(new Date(checkOut))}`;
  };

  const handleTabClick = (tab: (typeof TABS)[number]) => {
    if (tab.href) {
      router.push(tab.href);
      return;
    }
    setActiveTab(tab.id);
  };

  return (
    <RequireAuth roles={["HOST", "ADMIN"]}>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">Host workspace</h1>
                <p className="mt-2 text-gray-600">
                  Track the performance of your listings, respond to guests, and keep your calendar in sync.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => router.push("/host/listings/new")}
                  className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
                >
                  Create listing
                </Button>
                <Button variant="outline" onClick={() => router.push("/host/listings")}>Manage listings</Button>
              </div>
            </div>
          </div>

          <div className="mb-8 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Dashboard navigation tabs">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const baseClasses = "flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition";
                const activeClasses = "border-rose-500 text-rose-600";
                const inactiveClasses = "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700";

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab)}
                    className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{tab.name}</span>
                    {tab.href && <span className="sr-only">Opens in a dedicated page</span>}
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

              {!loading && (
                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Recent bookings</h3>
                      <Button variant="ghost" size="sm" onClick={() => router.push("/host/bookings")}>View all</Button>
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
                              {Number(booking.totalPrice).toLocaleString("en-US", {
                                style: "currency",
                                currency: booking.currency,
                                maximumFractionDigits: 0,
                              })}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">{booking.status.toLowerCase()}</p>
                          </div>
                        </div>
                      ))}
                      {recentBookings.length === 0 && (
                        <div className="py-8 text-center">
                          <p className="text-gray-500">No bookings yet.</p>
                          <p className="mt-1 text-sm text-gray-400">When guests book, they will appear here.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">New listings</h3>
                      <Button variant="ghost" size="sm" onClick={() => router.push("/host/listings")}>View all</Button>
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
                              {Number(listing.basePrice).toLocaleString("en-US", {
                                style: "currency",
                                currency: listing.currency,
                                maximumFractionDigits: 0,
                              })}
                              <span className="text-xs text-gray-500">/night</span>
                            </p>
                            <p className="text-xs text-gray-500 capitalize">{listing.status.toLowerCase()}</p>
                          </div>
                        </div>
                      ))}
                      {recentListings.length === 0 && (
                        <div className="py-8 text-center">
                          <p className="text-gray-500">No listings yet.</p>
                          <p className="mt-1 text-sm text-gray-400">Create a listing to start welcoming guests.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "analytics" && (
            <div className="rounded-xl bg-white p-10 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Analytics preview</h3>
              <p className="mt-2 text-sm text-gray-500">
                Deeper insights and reporting are in progress. In the meantime you can export data from the listings and bookings sections.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Button variant="outline" onClick={() => router.push("/host/listings")}>Go to listings</Button>
                <Button variant="outline" onClick={() => router.push("/host/bookings")}>Go to bookings</Button>
              </div>
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



