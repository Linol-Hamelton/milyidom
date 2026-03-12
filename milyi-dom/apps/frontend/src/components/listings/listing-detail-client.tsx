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
import { Skeleton } from "../ui/skeleton";
import {
  fetchListing,
  fetchListingStats,
  fetchSimilarListings,
  type ListingStats,
} from "../../services/listings";
import {
  createReview,
  fetchListingReviewStats,
  fetchListingReviews,
  replyToReview,
  deleteReplyToReview,
} from "../../services/reviews";
import { createBooking, fetchGuestBookings } from "../../services/bookings";
import { sendMessage } from "../../services/messages";
import type { Booking, Listing, Review, ReviewStats } from "../../types/api";
import { parseError } from "../../lib/api-client";
import { listingBlurDataURL } from "../../lib/image-placeholder";
import { FavoriteToggle } from "./favorite-toggle";
import { ListingCard } from "./listing-card";
import { ShareButton } from "../ui/share-button";
import { ListingLocationMap } from "./listing-location-map";

interface ListingDetailClientProps {
  listingId: string;
}

const ratingFields = [
  { key: "cleanliness", label: "Чистота" },
  { key: "communication", label: "Общение" },
  { key: "checkIn", label: "Заселение" },
  { key: "accuracy", label: "Точность описания" },
  { key: "location", label: "Расположение" },
  { key: "value", label: "Цена/качество" },
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

function ReviewCard({
  review,
  isHost,
  onReplySubmit,
  onReplyDelete,
}: {
  review: Review;
  isHost: boolean;
  onReplySubmit: (reply: string) => Promise<void>;
  onReplyDelete: () => Promise<void>;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!replyText.trim()) return;
    setSaving(true);
    try {
      await onReplySubmit(replyText.trim());
      setReplyText('');
      setShowReplyForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await onReplyDelete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border border-slate-100">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span className="font-medium text-slate-900">
            {review.author.profile?.firstName ?? review.author.email}
          </span>
          <span>{new Date(review.createdAt).toLocaleDateString("ru-RU")}</span>
        </div>
        <p className="text-sm leading-relaxed text-slate-700">{review.comment}</p>
        <div className="text-xs text-slate-500">Оценка: {review.rating.toFixed(1)}</div>

        {/* Host reply */}
        {review.hostReply && (
          <div className="mt-2 rounded-xl bg-pine-50 border border-pine-100 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-pine-700">Ответ хозяина</span>
              {isHost && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  Удалить
                </button>
              )}
            </div>
            <p className="text-sm text-slate-700">{review.hostReply}</p>
          </div>
        )}

        {/* Reply form for host */}
        {isHost && !review.hostReply && (
          showReplyForm ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                placeholder="Напишите ответ на отзыв..."
                className="w-full rounded-xl border border-sand-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pine-500"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowReplyForm(false); setReplyText(''); }}
                  className="rounded-xl border border-sand-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-sand-100 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving || !replyText.trim()}
                  className="rounded-xl bg-pine-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-pine-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Отправка…' : 'Ответить'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowReplyForm(true)}
              className="mt-1 text-xs text-pine-600 hover:underline"
            >
              Ответить на отзыв
            </button>
          )
        )}
      </CardContent>
    </Card>
  );
}

export function ListingDetailClient({ listingId }: ListingDetailClientProps) {
  const router = useRouter();
  const { isAuthenticated, user: currentUser } = useAuth();

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
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [similarListings, setSimilarListings] = useState<Listing[]>([]);

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
        console.error("Failed to load reviews", error);
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
          throw new Error("Объявление не найдено");
        } else {
          throw error;
        }
      }

      setListing(data);

      const [statsData, reviewStatsData, similar] = await Promise.all([
        fetchListingStats(data.id),
        fetchListingReviewStats(data.id),
        fetchSimilarListings(data.id),
      ]);

      setStats(statsData);
      setReviewStats(reviewStatsData);
      setSimilarListings(similar);
      await loadReviews(data.id, 1);

      if (isAuthenticated) {
        const bookingResponse = await fetchGuestBookings({ limit: 50 });
        setBookings(bookingResponse.items.filter((booking) => booking.listingId === data.id));
      }
    } catch (error) {
      console.error("Failed to load listing", error);
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
      toast.error("Войдите в аккаунт, чтобы создать бронирование");
      router.push("/auth/login");
      return;
    }

    if (!bookingForm.checkIn || !bookingForm.checkOut) {
      toast.error("Пожалуйста, выберите даты заезда и выезда");
      return;
    }

    if (new Date(bookingForm.checkOut) <= new Date(bookingForm.checkIn)) {
      toast.error("Дата выезда должна быть позже даты заезда");
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

      toast.success("Бронирование создано! Хозяин скоро подтвердит его.");
      setBookingForm(initialBookingState);

      if (isAuthenticated) {
        const bookingResponse = await fetchGuestBookings({ limit: 50 });
        setBookings(bookingResponse.items.filter((booking) => booking.listingId === listing.id));
      }
    } catch (error) {
      console.error("Failed to create booking", error);
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
      toast.error("Войдите в аккаунт, чтобы оставить отзыв");
      router.push("/auth/login");
      return;
    }

    if (!reviewState.bookingId) {
      toast.error("Выберите бронирование, к которому хотите написать отзыв");
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

      toast.success("Отзыв опубликован! Спасибо за вашу оценку.");
      setReviewState(initialReviewState);

      await Promise.all([
        loadReviews(listing.id, 1),
        fetchListingReviewStats(listing.id).then(setReviewStats),
      ]);
    } catch (error) {
      console.error("Failed to submit review", error);
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  const handleContactHost = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contactMessage.trim() || !listing) return;
    setContactSending(true);
    try {
      await sendMessage({
        listingId: listing.id,
        recipientId: listing.host.id,
        body: contactMessage.trim(),
      });
      toast.success('Сообщение отправлено! Переходим в чат…');
      setContactMessage('');
      setContactOpen(false);
      router.push('/messages');
    } catch (error) {
      console.error('Failed to send message to host', error);
      toast.error(parseError(error).message);
    } finally {
      setContactSending(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-content-lg px-4 py-8 sm:px-6 lg:px-10">
        {/* Photo grid skeleton */}
        <Skeleton className="mb-6 h-[400px] w-full rounded-3xl" />
        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4 rounded-xl" />
            <Skeleton className="h-5 w-1/2 rounded-lg" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-3xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-content-lg px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Объявление не найдено</h1>
        <p className="mt-2 text-sm text-slate-500">
          К сожалению, это объявление недоступно или было удалено.
        </p>
        <Button className="mt-6" onClick={() => router.push("/listings")}>Вернуться к списку</Button>
      </div>
    );
  }

  return (
    <div className="bg-sand-50 pb-16">
      <div className="bg-white">
        <div className="mx-auto grid max-w-content-2xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:px-10">
          <div className="min-w-0 lg:col-span-8">
            <h1 className="break-words text-3xl font-serif text-slate-900">{listing.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="break-words">
                {listing.city}, {listing.country}
              </span>
              {stats && (
                <span className="inline-flex items-center gap-1">
                  <svg className="h-4 w-4 text-pine-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  {stats.averageRating.toFixed(2)} / {stats.reviewCount} отзывов
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-start gap-2 sm:gap-3 lg:col-span-4 lg:justify-end">
            <Button variant="ghost" onClick={() => window.history.back()}>
              Назад
            </Button>
            <ShareButton title={listing.title} text={listing.summary ?? listing.title} />
            <FavoriteToggle listingId={listing.id} />
          </div>
        </div>

        {/* 5-photo grid: 1 large left + 2×2 right (Airbnb style) */}
        <div className="mx-auto grid max-w-content-2xl gap-2 px-4 pb-8 sm:px-6 lg:grid-cols-4 lg:px-10">
          {heroImages[0] && (
            <button
              type="button"
              onClick={() => openLightbox(0)}
              className="relative h-64 overflow-hidden rounded-3xl lg:col-span-2 lg:h-96 focus:outline-none"
            >
              <Image
                unoptimized
                src={heroImages[0]}
                alt={`${listing.title} — главное фото`}
                fill
                className="object-cover transition duration-300 hover:scale-105"
                priority
                placeholder="blur"
                blurDataURL={listingBlurDataURL}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              {heroImages.length > 1 && (
                <span className="absolute bottom-3 right-3 hidden rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white lg:inline-flex">
                  Все фото ({heroImages.length})
                </span>
              )}
            </button>
          )}
          {/* Right 2×2 grid */}
          <div className="hidden gap-2 lg:col-span-2 lg:grid lg:grid-cols-2 lg:grid-rows-2" style={{ height: '24rem' }}>
            {heroImages.slice(1, 5).map((image, index) => (
              <button
                type="button"
                key={`${listing.id}-hero-${index + 1}`}
                onClick={() => openLightbox(index + 1)}
                className={clsx(
                  'relative overflow-hidden focus:outline-none',
                  index === 0 ? 'rounded-tr-xl' : '',
                  index === 1 ? 'rounded-br-xl' : '',
                  index === 2 ? 'rounded-tl-xl' : '',
                  index === 3 ? 'rounded-bl-xl' : '',
                )}
              >
                <Image
                  unoptimized
                  src={image}
                  alt={`${listing.title} — фото ${index + 2}`}
                  fill
                  className="object-cover transition duration-300 hover:scale-105"
                  placeholder="blur"
                  blurDataURL={listingBlurDataURL}
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
              <span>до {listing.guests} гостей</span>
              <span>{listing.bedrooms} спальни</span>
              <span>{listing.beds} кроватей</span>
              <span>{Number(listing.bathrooms)} ванных</span>
              {listing.instantBook && <Badge>Мгновенное бронирование</Badge>}
            </div>
            <p className="mt-6 text-base leading-relaxed text-slate-700">{listing.description}</p>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-soft">
            <h2 className="text-xl font-semibold text-slate-900">Удобства</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {listing.amenities.map(({ amenity }) => (
                <div
                  key={amenity.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                >
                  <span className="font-medium text-slate-900">{amenity.name}</span>
                  <span className="text-xs text-slate-500">
                    {({ Connectivity: 'Связь', Comfort: 'Комфорт', Utilities: 'Бытовые', Essentials: 'Основное', Business: 'Работа', Convenience: 'Удобства' } as Record<string, string>)[amenity.category] ?? amenity.category}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {listing.latitude && listing.longitude && (
            <section className="rounded-3xl bg-white p-6 shadow-soft">
              <h2 className="mb-4 text-xl font-semibold text-slate-900">Расположение</h2>
              <p className="mb-4 text-sm text-slate-500">
                {listing.city}, {listing.country}
              </p>
              <ListingLocationMap
                latitude={listing.latitude}
                longitude={listing.longitude}
                city={listing.city}
                country={listing.country}
              />
            </section>
          )}

          {reviewStats && (
            <section className="rounded-3xl bg-white p-6 shadow-soft">
              <h2 className="text-xl font-semibold text-slate-900">Рейтинги гостей</h2>
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
                <h2 className="text-xl font-semibold text-slate-900">Отзывы гостей</h2>
                <p className="text-sm text-slate-500">Всего {reviewsTotal} отзывов</p>
              </div>
              {reviewPage * 6 < reviewsTotal && (
                <Button
                  variant="ghost"
                  onClick={() => loadReviews(listing.id, reviewPage + 1)}
                  disabled={reviewsLoading}
                >
                  Показать ещё
                </Button>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  isHost={listing.host.id === currentUser?.id}
                  onReplySubmit={async (reply) => {
                    const updated = await replyToReview(review.id, reply);
                    setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, ...updated } : r));
                  }}
                  onReplyDelete={async () => {
                    const updated = await deleteReplyToReview(review.id);
                    setReviews((prev) => prev.map((r) => r.id === review.id ? { ...r, ...updated } : r));
                  }}
                />
              ))}
              {reviews.length === 0 && <p className="text-sm text-slate-500">Отзывов пока нет. Будьте первым!</p>}
            </div>
          </section>

          {isAuthenticated && bookings.length > 0 && (
            <section className="rounded-3xl bg-white p-6 shadow-soft">
              <h2 className="text-xl font-semibold text-slate-900">Поделитесь впечатлениями</h2>
              <form className="mt-4 space-y-4" onSubmit={handleSubmitReview}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Выберите бронирование
                    <Select
                      value={reviewState.bookingId}
                      onChange={(event) => handleReviewFieldChange("bookingId", event.target.value)}
                    >
                      <option value="">Выберите поездку</option>
                      {bookings.map((booking) => (
                        <option key={booking.id} value={booking.id}>
                          Заезд {new Date(booking.checkIn).toLocaleDateString("ru-RU")} —{" "}
                          {new Date(booking.checkOut).toLocaleDateString("ru-RU")} ({booking.status})
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    Общая оценка
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
                  Ваш комментарий
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
                  <Button type="submit">Отправить отзыв</Button>
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
                <p className="text-xs text-slate-500">за ночь</p>
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleCreateBooking}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Заезд
                  <Input
                    type="date"
                    value={bookingForm.checkIn}
                    onChange={(event) => handleBookingChange("checkIn", event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Выезд
                  <Input
                    type="date"
                    value={bookingForm.checkOut}
                    onChange={(event) => handleBookingChange("checkOut", event.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Взрослые
                  <Input
                    type="number"
                    min={1}
                    value={bookingForm.adults}
                    onChange={(event) => handleBookingChange("adults", Number(event.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Дети
                  <Input
                    type="number"
                    min={0}
                    value={bookingForm.children}
                    onChange={(event) => handleBookingChange("children", Number(event.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Младенцы
                  <Input
                    type="number"
                    min={0}
                    value={bookingForm.infants}
                    onChange={(event) => handleBookingChange("infants", Number(event.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  Питомцы
                  <Input
                    type="number"
                    min={0}
                    value={bookingForm.pets}
                    onChange={(event) => handleBookingChange("pets", Number(event.target.value))}
                  />
                </label>
              </div>

              {bookingForm.checkIn && bookingForm.checkOut && (() => {
                const nights = Math.ceil(
                  (new Date(bookingForm.checkOut).getTime() - new Date(bookingForm.checkIn).getTime()) /
                    (1000 * 60 * 60 * 24),
                );
                const pricePerNight = Number(listing.basePrice ?? 0);
                const total = nights > 0 ? nights * pricePerNight : 0;
                const fmt = (n: number) =>
                  n.toLocaleString('ru-RU', { style: 'currency', currency: listing.currency ?? 'RUB', maximumFractionDigits: 0 });
                return nights > 0 ? (
                  <div className="rounded-2xl bg-pine-50 p-4 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>{fmt(pricePerNight)} × {nights} ноч.</span>
                      <span>{fmt(total)}</span>
                    </div>
                    <div className="mt-2 flex justify-between border-t border-pine-100 pt-2 font-semibold text-slate-900">
                      <span>Итого</span>
                      <span>{fmt(total)}</span>
                    </div>
                  </div>
                ) : null;
              })()}

              <Button type="submit" className="w-full">
                Запросить бронирование
              </Button>
            </form>
          </section>

          {/* Host Info + Contact */}
          <section className="rounded-3xl bg-white p-6 shadow-soft space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">О хозяине</h2>
            <div className="flex items-center gap-3">
              {listing.host.profile?.avatarUrl ? (
                <Image
                  src={listing.host.profile.avatarUrl}
                  alt={listing.host.profile.firstName}
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pine-100 text-lg font-semibold text-pine-700">
                  {(listing.host.profile?.firstName?.[0] ?? listing.host.email[0]).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900">
                  {listing.host.profile
                    ? `${listing.host.profile.firstName} ${listing.host.profile.lastName}`
                    : listing.host.email}
                </p>
                {listing.host.isSuperhost && (
                  <span className="text-xs font-medium text-amber-600">⭐ Суперхост</span>
                )}
              </div>
            </div>

            {isAuthenticated ? (
              contactOpen ? (
                <form onSubmit={handleContactHost} className="space-y-3">
                  <Textarea
                    rows={4}
                    placeholder="Напишите сообщение хозяину…"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={contactSending || !contactMessage.trim()} className="flex-1">
                      Отправить
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => { setContactOpen(false); setContactMessage(''); }}
                    >
                      Отмена
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full border border-pine-200 text-pine-700 hover:bg-pine-50"
                  onClick={() => setContactOpen(true)}
                >
                  Написать хозяину
                </Button>
              )
            ) : (
              <p className="text-xs text-slate-500">
                <a href="/auth/login" className="text-pine-600 underline">Войдите</a>, чтобы написать хозяину
              </p>
            )}
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-900">Правила проживания</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Заезд с {listing.checkInFrom ?? 14}:00</li>
              <li>Выезд до {listing.checkOutUntil ?? 12}:00</li>
              <li>Минимальный срок аренды: {listing.minNights ?? 1} ноч.</li>
              {listing.maxNights && <li>Максимальный срок аренды: {listing.maxNights} ноч.</li>}
            </ul>
          </section>
        </aside>
      </div>

      {similarListings.length > 0 && (
        <div className="mx-auto mt-10 max-w-content-2xl px-4 sm:px-6 lg:px-10 pb-12">
          <section className="rounded-3xl bg-white p-6 shadow-soft">
            <h2 className="mb-5 text-xl font-semibold text-slate-900">Похожие объявления</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similarListings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        </div>
      )}

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
            aria-label="Закрыть галерею"
          >
            ✕
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showPrevImage();
            }}
            className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/60 p-3 text-white transition hover:bg-black lg:block"
            aria-label="Предыдущее фото"
          >
            ←
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showNextImage();
            }}
            className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/60 p-3 text-white transition hover:bg-black lg:block"
            aria-label="Следующее фото"
          >
            →
          </button>

          <div
            className="relative mx-auto mt-20 w-full max-w-5xl flex-1 px-4 pb-8 sm:px-10"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative h-full min-h-[240px] w-full">
              <Image
                unoptimized
                src={heroImages[activeImageIndex]}
                alt={`${listing.title} — фото ${activeImageIndex + 1}`}
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
                  alt={`${listing.title} — фото ${index + 1}`}
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
