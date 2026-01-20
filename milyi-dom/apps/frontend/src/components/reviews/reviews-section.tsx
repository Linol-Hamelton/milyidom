'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createReview, fetchListingReviewStats, fetchListingReviews } from '../../services/reviews';
import { fetchGuestBookings } from '../../services/bookings';
import type { Booking, Review, ReviewStats } from '../../types/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader } from '../ui/card';
import toast from 'react-hot-toast';
import { parseError } from '../../lib/api-client';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../lib/format';

interface ReviewsSectionProps {
  listingId: string;
}

type ReviewFormState = {
  bookingId: string;
  rating: number;
  cleanliness: number;
  communication: number;
  checkIn: number;
  accuracy: number;
  location: number;
  value: number;
  comment: string;
};

type RatingFieldKey = Exclude<keyof ReviewFormState, 'bookingId' | 'comment'>;

const ratingFields: Array<{ key: RatingFieldKey; label: string }> = [
  { key: 'rating', label: 'Общая оценка' },
  { key: 'cleanliness', label: 'Чистота' },
  { key: 'communication', label: 'Коммуникация' },
  { key: 'checkIn', label: 'Заселение' },
  { key: 'accuracy', label: 'Точность' },
  { key: 'location', label: 'Локация' },
  { key: 'value', label: 'Соотношение цена/качество' },
];

type CreateReviewPayload = Parameters<typeof createReview>[0];

export function ReviewsSectionFixed({ listingId }: ReviewsSectionProps) {
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [formState, setFormState] = useState<ReviewFormState>({
    bookingId: '',
    rating: 5,
    cleanliness: 5,
    communication: 5,
    checkIn: 5,
    accuracy: 5,
    location: 5,
    value: 5,
    comment: '',
  });

  const loadReviews = useCallback(
    async (pageNumber = 1) => {
      setLoading(true);
      try {
        const data = await fetchListingReviews(listingId, pageNumber);
        setPage(data.meta.page);
        setHasMore(data.meta.page < Math.ceil(data.meta.total / data.meta.limit));
        if (pageNumber === 1) {
          setReviews(data.items);
        } else {
          setReviews((prev) => [...prev, ...data.items]);
        }
      } catch (error) {
        const { message } = parseError(error);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [listingId],
  );

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchListingReviewStats(listingId);
      setStats(data);
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    }
  }, [listingId]);

  const loadEligibleBookings = useCallback(async () => {
    if (!isAuthenticated) {
      setBookings([]);
      return;
    }
    try {
      const data = await fetchGuestBookings({ limit: 50 });
      const eligible = data.items.filter(
        (booking) => booking.listingId === listingId && booking.status === 'COMPLETED',
      );
      setBookings(eligible);
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    }
  }, [isAuthenticated, listingId]);

  useEffect(() => {
    loadReviews(1);
    loadStats();
  }, [loadReviews, loadStats]);

  useEffect(() => {
    loadEligibleBookings();
  }, [loadEligibleBookings]);

  const ratingSummary = useMemo(() => {
    if (!stats) return null;
    return {
      average: stats.averageRating.toFixed(1),
      total: stats.totalReviews,
    };
  }, [stats]);

  const handleCreateReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.bookingId) {
      toast.error('Пожалуйста, выберите поездку, по которой хотите оставить отзыв.');
      return;
    }

    const payload: CreateReviewPayload = {
      bookingId: formState.bookingId,
      rating: formState.rating,
      cleanliness: formState.cleanliness,
      communication: formState.communication,
      checkIn: formState.checkIn,
      accuracy: formState.accuracy,
      location: formState.location,
      value: formState.value,
      comment: formState.comment.trim() || undefined,
    };

    try {
      await createReview(payload);
      toast.success('Спасибо! Отзыв отправлен на модерацию.');
      setFormState((prev) => ({ ...prev, bookingId: '', comment: '' }));
      await Promise.all([loadReviews(1), loadStats()]);
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadReviews(nextPage);
  };

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-serif text-slate-900">Отзывы гостей</h2>
        {ratingSummary && (
          <p className="mt-2 text-sm text-slate-600">
            Средняя оценка {ratingSummary.average} из {ratingSummary.total} отзывов
          </p>
        )}
      </div>

      {isAuthenticated && bookings.length > 0 && (
        <Card className="bg-white/90">
          <CardHeader>
            <h3 className="text-lg font-semibold text-slate-900">Оставьте отзыв о поездке</h3>
            <p className="text-sm text-slate-500">
              Мы показываем только отзывы от гостей, которые действительно останавливались в этом жилье.
            </p>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleCreateReview}>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Выберите бронирование
                <select
                  value={formState.bookingId}
                  onChange={(event) => setFormState((prev) => ({ ...prev, bookingId: event.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-400"
                >
                  <option value="">Выберите поездку</option>
                  {bookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      Заезд {formatDate(booking.checkIn)} — выезд {formatDate(booking.checkOut)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ratingFields.map(({ key, label }) => (
                  <label key={key} className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    {label}
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      step={1}
                      value={formState[key]}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, [key]: Number(event.target.value) || 1 }))
                      }
                    />
                  </label>
                ))}
              </div>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Комментарий
                <Textarea
                  rows={4}
                  placeholder="Поделитесь, что понравилось, а что можно улучшить."
                  value={formState.comment}
                  onChange={(event) => setFormState((prev) => ({ ...prev, comment: event.target.value }))}
                />
              </label>

              <div className="flex justify-end">
                <Button type="submit">Отправить отзыв</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {review.author.profile?.firstName ?? review.author.email}
                </p>
                <p className="text-xs text-slate-500">{formatDate(review.createdAt)}</p>
              </div>
              <span className="rounded-full bg-pine-100 px-3 py-1 text-sm font-medium text-pine-700">
                {review.rating.toFixed(1)}
              </span>
            </div>
            {review.comment && <p className="mt-3 text-sm text-slate-700">{review.comment}</p>}
            <dl className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
              {ratingFields.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between rounded-xl bg-sand-100 px-3 py-2">
                  <dt>{label}</dt>
                  <dd>{review[key]}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={handleLoadMore} disabled={loading}>
            Показать ещё
          </Button>
        </div>
      )}
    </section>
  );
}
