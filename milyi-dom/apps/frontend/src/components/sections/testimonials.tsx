"use client";

import { useEffect, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { fetchFeaturedReviews } from '../../services/reviews';
import type { Review } from '../../types/api';
import { testimonials as fallbackTestimonials } from '../../data/testimonials';
import { parseError } from '../../lib/api-client';
import { Skeleton } from '../ui/skeleton';

type FallbackTestimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  avatar: string;
  type: 'fallback';
};

type ReviewItem = Review & { type: 'review' };

type TestimonialItem = ReviewItem | FallbackTestimonial;

export default function Testimonials() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const load = async () => {
      try {
        const data = await fetchFeaturedReviews(6, { signal: controller.signal });
        if (!isMounted) return;
        setReviews(data);
        setIsFallback(data.length === 0);
      } catch (error) {
        if (axios.isCancel?.(error) || (error as Error)?.name === 'CanceledError') {
          return;
        }
        if (!isMounted) return;
        const { message } = parseError(error);
        toast.error(message);
        setReviews(null);
        setIsFallback(true);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  if (loading) {
    return (
      <section className="mx-auto max-w-content-lg px-6 py-16 lg:px-10">
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-3xl" />
          ))}
        </div>
      </section>
    );
  }

  const normalizedReviews: TestimonialItem[] =
    reviews && reviews.length > 0
      ? reviews.map((review) => ({ ...review, type: 'review' as const }))
      : fallbackTestimonials.map((item) => ({ ...item, type: 'fallback' as const }));

  return (
    <section className="mx-auto max-w-content-lg px-6 py-16 lg:px-10">
      <div className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-wide text-pine-600">Отзывы гостей</p>
        <h2 className="mb-2 font-serif text-3xl text-slate-900 md:text-4xl">Нам доверяют тысячи путешественников</h2>
        <p className="max-w-2xl text-sm text-slate-600">
          Истории гостей и хостов, которые бронируют жильё, принимают путешественников и управляют объявлениями.
          {isFallback && ' Показаны демо-отзывы — API временно недоступен.'}
        </p>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {normalizedReviews.map((item) => (
          <figure key={item.id} className="glass-panel h-full rounded-3xl px-6 py-8 shadow-soft">
            <div className="flex items-center gap-3">
              {item.type === 'review' ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pine-100 text-sm font-semibold text-pine-700">
                  {item.author.profile?.firstName?.[0]?.toUpperCase() ?? item.author.email[0]}
                </div>
              ) : (
                <Image
                  src={item.avatar}
                  alt={item.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                />
              )}
              <div>
                <figcaption className="text-sm font-semibold text-slate-900">
                  {item.type === 'review' ? item.author.profile?.firstName ?? item.author.email : item.name}
                </figcaption>
                <p className="text-xs text-slate-500">
                  {item.type === 'review'
                    ? `Оценка ${item.rating.toFixed(1)} · ${new Date(item.createdAt).toLocaleDateString('ru-RU')}`
                    : item.role}
                </p>
              </div>
            </div>
            <blockquote className="mt-4 text-sm leading-relaxed text-slate-600">
              &ldquo;{item.type === 'review'
                ? item.comment ?? 'Гость оставил высокую оценку, но не добавил подробный комментарий.'
                : item.quote}&rdquo;
            </blockquote>
          </figure>
        ))}
      </div>
    </section>
  );
}
