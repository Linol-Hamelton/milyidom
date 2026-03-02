"use client";

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { EyeSlashIcon, TrashIcon, StarIcon } from '@heroicons/react/24/outline';
import { Skeleton } from '../../../components/ui/skeleton';
import { Button } from '../../../components/ui/button';
import { adminFetchReviews, adminHideReview, adminDeleteReview } from '../../../services/reviews';
import { parseError } from '../../../lib/api-client';
import type { Review } from '../../../types/api';

interface ReviewsPage {
  items: Review[];
  meta: { total: number; page: number; limit: number };
}

export default function AdminReviewsPage() {
  const [data, setData] = useState<ReviewsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminFetchReviews(page, 20);
      setData(result as ReviewsPage);
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  const handleHide = async (reviewId: string, currentlyHidden: boolean) => {
    try {
      await adminHideReview(reviewId);
      toast.success(currentlyHidden ? 'Отзыв восстановлен' : 'Отзыв скрыт');
      void load();
    } catch (err) {
      toast.error(parseError(err).message);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Удалить отзыв навсегда?')) return;
    try {
      await adminDeleteReview(reviewId);
      toast.success('Отзыв удалён');
      void load();
    } catch (err) {
      toast.error(parseError(err).message);
    }
  };

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 1;

  return (
    <div className="p-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Администратор / Отзывы</p>
        <h1 className="mt-1 text-2xl font-serif font-semibold text-slate-900">Модерация отзывов</h1>
        {data && (
          <p className="mt-1 text-sm text-slate-500">Всего: {data.meta.total}</p>
        )}
      </header>

      <div className="flex flex-col gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))
          : data?.items.map((review) => (
              <article
                key={review.id}
                className={`rounded-2xl bg-white p-5 shadow-soft ${review.isHidden ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {/* Rating stars */}
                      <span className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <StarIcon
                            key={i}
                            className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-amber-400' : 'fill-none'}`}
                          />
                        ))}
                      </span>
                      <span className="text-sm font-medium text-slate-700">{review.rating}/5</span>
                      {review.isHidden && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          Скрыт
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-800 line-clamp-3">{review.comment}</p>

                    {review.hostReply && (
                      <div className="mt-2 rounded-xl bg-pine-50 px-3 py-2 text-xs text-pine-700">
                        <span className="font-medium">Ответ хоста:</span> {review.hostReply}
                      </div>
                    )}

                    <p className="mt-2 text-xs text-slate-400">
                      {review.author?.profile?.firstName
                        ? `${review.author.profile.firstName} ${review.author.profile.lastName ?? ''}`.trim()
                        : review.author?.email ?? 'Аноним'}
                      {' · '}
                      {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => handleHide(review.id, !!review.isHidden)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600"
                      title={review.isHidden ? 'Показать' : 'Скрыть'}
                    >
                      <EyeSlashIcon className="h-4 w-4" />
                      {review.isHidden ? 'Показать' : 'Скрыть'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(review.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      title="Удалить"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Удалить
                    </Button>
                  </div>
                </div>
              </article>
            ))}
      </div>

      {data && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
          <span>Стр. {page} из {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 text-xs">
              Назад
            </Button>
            <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 text-xs">
              Вперёд
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
