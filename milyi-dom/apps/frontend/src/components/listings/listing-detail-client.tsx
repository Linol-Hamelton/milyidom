"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  fetchListing,
  fetchListingStats,
  type ListingStats,
} from "../../services/listings";
import {
  createReview,
  fetchListingReviewStats,
  fetchListingReviews,
} from "../../services/reviews";
import { createBooking, fetchGuestBookings } from "../../services/bookings";
import type { Booking, Listing, Review, ReviewStats } from "../../types/api";
import { parseError } from "../../lib/api-client";
import { FavoriteToggle } from "./favorite-toggle";

interface ListingDetailClientProps {
  listingId: string;
}

const ratingFields = [
  { key: "cleanliness", label: "Cleanliness" },
  { key: "communication", label: "Communication" },
  { key: "checkIn", label: "Check-in" },
  { key: "accuracy", label: "Accuracy" },
  { key: "location", label: "Location" },
  { key: "value", label: "Value" },
] as const;

type RatingFieldKey = (typeof ratingFields)[number]["key"];

type ReviewFormState = {
  bookingId: string;
  rating: number;
  comment: string;
} & Record<RatingFieldKey, number>;

type BookingFormState = {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  infants: number;
  pets: number;
};

const initialReviewState: ReviewFormState = {
  bookingId: "",
  rating: 5,
  comment: "",
  cleanliness: 5,
  communication: 5,
  checkIn: 5,
  accuracy: 5,
  location: 5,
  value: 5,
};

const initialBookingState: BookingFormState = {
  checkIn: "",
  checkOut: "",
  adults: 2,
  children: 0,
  infants: 0,
  pets: 0,
};

export function ListingDetailClient({ listingId }: ListingDetailClientProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<Listing | null>(null);
  const [stats, setStats] = useState<ListingStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingForm, setBookingForm] = useState<BookingFormState>(initialBookingState);
  const [reviewState, setReviewState] = useState<ReviewFormState>(initialReviewState);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const heroImages = useMemo(() => {
    if (!listing) return [] as string[];
    const sorted = [...listing.images].sort((a, b) => a.position - b.position);
    return sorted.map((image) => image.url);
  }, [listing]);

  const openLightbox = useCallback(
    (index: number) => {
      if (!heroImages.length) return;
      setActiveImageIndex((index + heroImages.length) % heroImages.length);
      setIsLightboxOpen(true);
    },
    [heroImages.length],
  );

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
  }, []);

  const showPrevImage = useCallback(() => {
    if (!heroImages.length) return;
    setActiveImageIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  }, [heroImages.length]);

  const showNextImage = useCallback(() => {
    if (!heroImages.length) return;
    setActiveImageIndex((prev) => (prev + 1) % heroImages.length);
  }, [heroImages.length]);

  const loadReviews = useCallback(
    async (id: string, page: number) => {
      setReviewsLoading(true);
      try {
        const data = await fetchListingReviews(id, page);
        if (page === 1) {
          setReviews(data.items);
        } else {
          setReviews((prev) => [...prev, ...data.items]);
        }
        setReviewPage(data.meta.page);
        setReviewsTotal(data.meta.total);
      } catch (error) {
        console.error("Текст ТекстТекстТекстТекст ТекстТекстТекстТекстТекст ТекстТекстТекст ТекстТекстТекстТекстТекст", error);
        const { message } = parseError(error);
        toast.error(message);
      } finally {
        setReviewsLoading(false);
      }
    },
    [],
  );

    const loadListing = useCallback(async () => {
    setLoading(true);
    try {
      let data: Listing;
      try {
        data = await fetchListing(listingId);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          // fetchListingBySlug Текст ТекстТекстТекстТекстТекст, ТекстТекстТекст ТекстТекстТекстТекстТекстТекст ТекстТекстТекст
          throw new Error("ТекстТекстТекстТекстТекст Текст ТекстТекстТекстТекст");
        } else {
          throw error;
        }
      }

      setListing(data);

      const [statsData, reviewStatsData] = await Promise.all([
        fetchListingStats(data.id),
        fetchListingReviewStats(data.id),
      ]);

      setStats(statsData);
      setReviewStats(reviewStatsData);
      await loadReviews(data.id, 1);

      if (isAuthenticated) {
        const bookingResponse = await fetchGuestBookings({ limit: 50 });
        setBookings(bookingResponse.items.filter((booking) => booking.listingId === data.id));
      }
    } catch (error) {
      console.error("Текст ТекстТекстТекстТекст ТекстТекстТекстТекстТекст ТекстТекстТекстТекстТекст", error);
      const { message } = parseError(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, listingId, loadReviews]);

  useEffect(() => {
    loadListing();
  }, [loadListing]);

  useEffect(() => {
    if (!isLightboxOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevImage();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeLightbox, isLightboxOpen, showNextImage, showPrevImage]);

  const handleBookingChange = (key: keyof BookingFormState, value: string | number) => {
    setBookingForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!listing) return;

    if (!isAuthenticated) {
      toast.error("ТекстТекстТекстТекстТекстТекстТекст, ТекстТекстТекст ТекстТекстТекстТекстТекстТекстТекст ТекстТекстТекст");
      router.push("/auth/login");
      return;
    }

    if (!bookingForm.checkIn || !bookingForm.checkOut) {
      toast.error("ТекстТекстТекстТекст ТекстТекст ТекстТекстТекст Текст ТекстТекстТекст");
      return;
    }

    if (new Date(bookingForm.checkOut) <= new Date(bookingForm.checkIn)) {
      toast.error("ТекстТекст ТекстТекстТекст ТекстТекстТекст ТекстТекст ТекстТекстТекст ТекстТекст ТекстТекстТекст");
      return;
    }

    try {
      await createBooking({
        listingId: listing.id,
        checkIn: bookingForm.checkIn,
        checkOut: bookingForm.checkOut,
        adults: bookingForm.adults,
        children: bookingForm.children,
        infants: bookingForm.infants,
        pets: bookingForm.pets,
      });

      toast.success("ТекстТекстТекстТекстТекстТекст ТекстТекстТекстТекст Текст Текст ТекстТекстТекстТекстТекст ТекстТекстТекстТекстТекстТекстТекст Текст ТекстТекстТекст");
      setBookingForm(initialBookingState);

      if (isAuthenticated) {
        const bookingResponse = await fetchGuestBookings({ limit: 50 });
        setBookings(bookingResponse.items.filter((booking) => booking.listingId === listing.id));
      }
    } catch (error) {
      console.error("Текст ТекстТекстТекстТекст ТекстТекстТекстТекст ТекстТекстТекстТекстТекстТекст", error);
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  const handleReviewFieldChange = (key: keyof ReviewFormState, value: string | number) => {
    setReviewState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!listing) return;

    if (!isAuthenticated) {
      toast.error("ТекстТекстТекстТекстТекстТекстТекст, ТекстТекстТекст ТекстТекстТекстТекст ТекстТекстТекст");
      router.push("/auth/login");
      return;
    }

    if (!reviewState.bookingId) {
      toast.error("ТекстТекстТекстТекст ТекстТекстТекстТекстТекстТекст, Текст ТекстТекстТекстТекст ТекстТекстТекст ТекстТекстТекстТекст ТекстТекстТекст");
      return;
    }

    try {
      await createReview({
        bookingId: reviewState.bookingId,
        rating: reviewState.rating,
        comment: reviewState.comment,
        cleanliness: reviewState.cleanliness,
        communication: reviewState.communication,
        checkIn: reviewState.checkIn,
        accuracy: reviewState.accuracy,
        location: reviewState.location,
        value: reviewState.value,
      });

      toast.success("ТекстТекстТекстТекст! ТекстТекстТекст ТекстТекстТекстТекстТекст Текст ТекстТекстТекстТекстТекст");
      setReviewState(initialReviewState);

      await Promise.all([
        loadReviews(listing.id, 1),
        fetchListingReviewStats(listing.id).then(setReviewStats),
      ]);
    } catch (error) {
      console.error("Текст ТекстТекстТекстТекст ТекстТекстТекстТекстТекст ТекстТекстТекст", error);
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-pine-600 border-t-transparent" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-content-lg px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Property overview</h1>
        <p className="mt-2 text-sm text-slate-500">
          ТекстТекстТекстТекст, ТекстТекст ТекстТекстТекст Текст ТекстТекстТекстТекстТекст ТекстТекст ТекстТекстТекст ТекстТекстТекстТекст.
        </p>
        <Button className="mt-6" onClick={() => router.push("/listings")}>ТекстТекстТекстТекстТекст Текст ТекстТекстТекстТекст</Button>
      </div>
    );
  }

  return (
    <div className="bg-sand-50 pb-16">
      <div className="bg-white">
        <div className="mx-auto grid max-w-content-2xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:px-10">
          <div className="lg:col-span-8">
            <h1 className="text-3xl font-serif text-slate-900">{listing.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span>
                {listing.city}, {listing.country}
              </span>
              {stats && (
                <span className="inline-flex items-center gap-1">
                  <svg className="h-4 w-4 text-pine-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  {stats.averageRating.toFixed(2)} / {stats.reviewCount} reviews
                </span>
              )}
            </div>
          </div>
          <div className="flex items-start justify-end gap-3 lg:col-span-4">
            <Button variant="ghost" onClick={() => window.history.back()}>
              ТекстТекстТекст
            </Button>
            <FavoriteToggle listingId={listing.id} />
          </div>
        </div>

        <div className="mx-auto grid max-w-content-2xl gap-3 px-4 pb-8 sm:px-6 lg:grid-cols-3 lg:px-10">
          {heroImages[0] && (
            <button
              type="button"
              onClick={() => openLightbox(0)}
              className="relative h-80 overflow-hidden rounded-3xl lg:col-span-2 focus:outline-none"
            >
              <Image
                unoptimized
                src={heroImages[0]}
                alt={`${listing.title} Текст ТекстТекстТекстТекст ТекстТекст`}
                fill
                className="object-cover transition duration-300 hover:scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              <span className="absolute bottom-3 right-3 hidden rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white lg:inline-flex">
                ТекстТекстТекстТекст ТекстТекст ТекстТекстТекстТекстТекст ТекстТекстТекстТекст
              </span>
            </button>
          )}
          <div className="grid h-80 gap-3 lg:grid-rows-2">
            {heroImages.slice(1, 3).map((image, index) => (
              <button
                type="button"
                key={`${listing.id}-hero-${index + 1}`}
                onClick={() => openLightbox(index + 1)}
                className="relative overflow-hidden rounded-3xl focus:outline-none"
              >
                <Image
                  unoptimized
                  src={image}
                  alt={`${listing.title} Текст ТекстТекст ${index + 2}`}
                  fill
                  className="object-cover transition duration-300 hover:scale-105"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 grid max-w-content-2xl gap-8 px-4 sm:px-6 lg:grid-cols-[2fr_1fr] lg:px-10">
        <div className="space-y-8">
          <section className="rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span>Текст {listing.guests} ТекстТекстТекст</span>
              <span>{listing.bedrooms} bedrooms</span>\r\n              <span>{listing.beds} beds</span>\r\n              <span>{Number(listing.bathrooms)} bathrooms</span>\r\n              {listing.instantBook && <Badge>Instant booking</Badge>}
            </div>
            <p className="mt-6 text-base leading-relaxed text-slate-700">{listing.description}</p>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-soft">
            <h2 className="text-xl font-semibold text-slate-900">Amenities & features</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {listing.amenities.map(({ amenity }) => (
                <div
                  key={amenity.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                >
                  <span className="font-medium text-slate-900">{amenity.name}</span>
                  <span className="text-xs text-slate-500">{amenity.category}</span>
                </div>
              ))}
            </div>
          </section>

          {reviewStats && (
            <section className="rounded-3xl bg-white p-6 shadow-soft">
              <h2 className="text-xl font-semibold text-slate-900">Guest ratings</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {ratingFields.map((field) => (
                  <div key={field.key} className="flex justify-between text-sm text-slate-600">
                    <span>{field.label}</span>
                    <span className="font-semibold text-slate-900">
                      {Number(reviewStats.detailedRatings[field.key] ?? 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section id="reviews" className="space-y-6 rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Guest reviews</h2>
                <p className="text-sm text-slate-500">ТекстТекстТекст {reviewsTotal} ТекстТекстТекстТекст</p>
              </div>
              {reviewPage * 6 < reviewsTotal && (
                <Button
                  variant="ghost"
                  onClick={() => loadReviews(listing.id, reviewPage + 1)}
                  disabled={reviewsLoading}
                >
                  ТекстТекстТекстТекст ТекстТекст
                </Button>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {reviews.map((review) => (
                <Card key={review.id} className="border border-slate-100">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span className="font-medium text-slate-900">
                        {review.author.profile?.firstName ?? review.author.email}
                      </span>
                      <span>{new Date(review.createdAt).toLocaleDateString("ru-RU")}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-700">{review.comment}</p>
                    <div className="text-xs text-slate-500">ТекстТекстТекст: {review.rating.toFixed(1)}</div>
                  </CardContent>
                </Card>
              ))}
              {reviews.length === 0 && <p className="text-sm text-slate-500">ТекстТекст ТекстТекст ТекстТекстТекстТекст Текст ТекстТекстТекстТекст ТекстТекстТекстТекст.</p>}
            </div>
          </section>

          {isAuthenticated && bookings.length > 0 && (
            <section className="rounded-3xl bg-white p-6 shadow-soft">
              <h2 className="text-xl font-semibold text-slate-900">Share your experience</h2>
              <form className="mt-4 space-y-4" onSubmit={handleSubmitReview}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    ТекстТекстТекстТекстТекстТекст
                    <Select
                      value={reviewState.bookingId}
                      onChange={(event) => handleReviewFieldChange("bookingId", event.target.value)}
                    >
                      <option value="">ТекстТекстТекстТекст ТекстТекстТекстТекст</option>
                      {bookings.map((booking) => (
                        <option key={booking.id} value={booking.id}>
                          ТекстТекстТекст {new Date(booking.checkIn).toLocaleDateString("ru-RU")} Текст
                          {new Date(booking.checkOut).toLocaleDateString("ru-RU")} ({booking.status})
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    ТекстТекстТекст ТекстТекстТекстТекст
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      step={0.5}
                      value={reviewState.rating}
                      onChange={(event) => handleReviewFieldChange("rating", Number(event.target.value))}
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  ТекстТекстТекстТекстТекстТекст
                  <Textarea
                    rows={4}
                    value={reviewState.comment}
                    onChange={(event) => handleReviewFieldChange("comment", event.target.value)}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  {ratingFields.map((field) => (
                    <label key={field.key} className="flex flex-col gap-2 text-sm text-slate-600">
                      {field.label}
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        step={0.5}
                        value={reviewState[field.key]}
                        onChange={(event) =>
                          handleReviewFieldChange(field.key, Number(event.target.value))
                        }
                      />
                    </label>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button type="submit">ТекстТекстТекстТекстТекст ТекстТекстТекст</Button>
                </div>
              </form>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-slate-900">
                  {Number(listing.basePrice ?? 0).toLocaleString("ru-RU", {
                    style: "currency",
                    currency: listing.currency ?? "RUB",
                  })}
                </p>
                <p className="text-xs text-slate-500">Текст ТекстТекст</p>
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleCreateBooking}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  ТекстТекстТекст
                  <Input
                    type="date"
                    value={bookingForm.checkIn}
                    onChange={(event) => handleBookingChange("checkIn", event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  ТекстТекстТекст
                  <Input
                    type="date"
                    value={bookingForm.checkOut}
                    onChange={(event) => handleBookingChange("checkOut", event.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  ТекстТекстТекстТекст
                  <Input
                    type="number"
                    min={1}
                    value={bookingForm.adults}
                    onChange={(event) => handleBookingChange("adults", Number(event.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  ТекстТекст
                  <Input
                    type="number"
                    min={0}
                    value={bookingForm.children}
                    onChange={(event) => handleBookingChange("children", Number(event.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  ТекстТекстТекстТекст
                  <Input
                    type="number"
                    min={0}
                    value={bookingForm.infants}
                    onChange={(event) => handleBookingChange("infants", Number(event.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  ТекстТекстТекстТекст
                  <Input
                    type="number"
                    min={0}
                    value={bookingForm.pets}
                    onChange={(event) => handleBookingChange("pets", Number(event.target.value))}
                  />
                </label>
              </div>

              <Button type="submit" className="w-full">
                ТекстТекстТекстТекстТекстТекстТекст
              </Button>
            </form>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-900">House rules</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>ТекстТекстТекст ТекстТекстТекст {listing.checkInFrom ?? 14}:00</li>
              <li>ТекстТекстТекст Текст {listing.checkOutUntil ?? 12}:00</li>
              <li>ТекстТекстТекстТекстТекстТекст ТекстТекстТекстТекстТекст Текст {listing.minNights ?? 1} ТекстТекст</li>
              {listing.maxNights && <li>ТекстТекстТекстТекстТекстТекст ТекстТекстТекстТекстТекст Текст {listing.maxNights} ТекстТекстТекст</li>}
            </ul>
          </section>
        </aside>
      </div>

      {isLightboxOpen && heroImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur"
          role="dialog"
          aria-modal="true"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-6 top-6 rounded-full bg-black/70 p-2 text-white transition hover:bg-black"
            aria-label="ТекстТекстТекстТекст ТекстТекстТекстТекст"
          >
            ?
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showPrevImage();
            }}
            className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/60 p-3 text-white transition hover:bg-black lg:block"
            aria-label="ТекстТекстТекстТекстТекст ТекстТекст"
          >
            Текст
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showNextImage();
            }}
            className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/60 p-3 text-white transition hover:bg-black lg:block"
            aria-label="ТекстТекстТекстТекстТекст ТекстТекст"
          >
            Текст
          </button>

          <div
            className="relative mx-auto mt-20 w-full max-w-5xl flex-1 px-4 pb-8 sm:px-10"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative h-full min-h-[240px] w-full">
              <Image
                unoptimized
                src={heroImages[activeImageIndex]}
                alt={`${listing.title} Текст ТекстТекст ${activeImageIndex + 1}`}
                fill
                sizes="100vw"
                className="rounded-3xl object-contain"
                priority
              />
            </div>
          </div>

          <div className="flex w-full justify-center gap-3 overflow-x-auto px-6 pb-8">
            {heroImages.map((image, index) => (
              <button
                type="button"
                key={`${listing.id}-lightbox-${index}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveImageIndex(index);
                }}
                className={clsx(
                  "relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl focus:outline-none transition",
                  activeImageIndex === index
                    ? "ring-2 ring-white ring-offset-2 ring-offset-black/40"
                    : "opacity-70 hover:opacity-100"
                )}
              >
                <Image
                  unoptimized
                  src={image}
                  alt={`${listing.title} Текст ТекстТекст ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}














