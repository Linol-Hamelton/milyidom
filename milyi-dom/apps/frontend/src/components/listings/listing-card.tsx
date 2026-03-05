'use client';

const backendImagesBase = (
  process.env.NEXT_PUBLIC_BACKEND_IMAGES_URL ??
  (process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '/images')
    : 'http://localhost:4001/images')
).replace(/\/$/, '');

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { Listing } from '../../types/api';
import { decimalToNumber, formatCurrency } from '../../lib/format';
import { listingBlurDataURL } from '../../lib/image-placeholder';
import { FavoriteToggle } from './favorite-toggle';

const propertyTypeLabels: Record<string, string> = {
  apartment: 'Квартира',
  loft: 'Лофт',
  house: 'Дом',
  villa: 'Вилла',
  studio: 'Студия',
};

interface ListingCardProps {
  listing: Listing;
  href?: string;
}

export function ListingCard({ listing, href }: ListingCardProps) {
  const sortedImages = [...listing.images].sort((a, b) => a.position - b.position);
  const [activeIdx, setActiveIdx] = useState(0);
  const [hovered, setHovered] = useState(false);

  const getImageUrl = (url: string) => {
    if (!url) return '/images/listing-1.jpg';
    if (url.startsWith('/images/')) return url;
    if (url.startsWith('http')) return url;
    return `${backendImagesBase}/${url.replace(/^\/+/, '')}`;
  };

  const currentImage = sortedImages[activeIdx] ?? sortedImages[0];
  const imageSrc = currentImage ? getImageUrl(currentImage.url) : '/images/listing-1.jpg';
  const shouldUnoptimizeImage = imageSrc.startsWith('http') || imageSrc.startsWith('/images/');
  const normalizedPrice = decimalToNumber(listing.basePrice);
  const price = Number.isFinite(normalizedPrice) ? normalizedPrice : 0;
  const linkHref = href ?? `/listings/${listing.id}`;
  const propertyLabel = propertyTypeLabels[listing.propertyType] ?? listing.propertyType;
  const hasMultiple = sortedImages.length > 1;

  const goTo = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIdx((idx + sortedImages.length) % sortedImages.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
    >
      <Link href={linkHref} className="group cursor-pointer">
        <div className="space-y-2">
          {/* Image container with carousel */}
          <div
            className="relative aspect-square overflow-hidden rounded-xl"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <Image
              src={imageSrc}
              alt={listing.title}
              fill
              sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 100vw"
              className="object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
              placeholder="blur"
              blurDataURL={listingBlurDataURL}
              unoptimized={shouldUnoptimizeImage}
            />

            {/* Prev / Next arrows */}
            {hasMultiple && hovered && (
              <>
                <button
                  type="button"
                  onClick={(e) => goTo(e, activeIdx - 1)}
                  aria-label="Предыдущее фото"
                  className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:scale-105 hover:bg-white"
                >
                  <svg className="h-3.5 w-3.5 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => goTo(e, activeIdx + 1)}
                  aria-label="Следующее фото"
                  className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:scale-105 hover:bg-white"
                >
                  <svg className="h-3.5 w-3.5 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Dot indicators */}
            {hasMultiple && (
              <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 gap-1">
                {sortedImages.slice(0, 5).map((_, i) => (
                  <span
                    key={i}
                    className={clsx(
                      'block rounded-full transition-all duration-200',
                      i === activeIdx
                        ? 'h-1.5 w-3 bg-white'
                        : 'h-1.5 w-1.5 bg-white/55',
                    )}
                  />
                ))}
              </div>
            )}

            {/* Favorite toggle */}
            <div className="absolute right-3 top-3 z-10 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
              <FavoriteToggle listingId={listing.id} appearance="icon" />
            </div>
          </div>

          {/* Card info */}
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-gray-900 line-clamp-1">{listing.title}</h3>
              {listing.rating && (
                <div className="flex shrink-0 items-center gap-1">
                  <svg className="h-3 w-3 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    {Number(listing.rating).toFixed(1)}
                    {listing.reviewCount > 0 && (
                      <span className="text-gray-400"> ({listing.reviewCount})</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-500 line-clamp-1">
              {listing.city}, {listing.country}
            </p>

            <p className="text-sm text-gray-500">{propertyLabel}</p>

            {listing.host?.isSuperhost && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                ⭐ Суперхост
              </span>
            )}

            <div className="flex items-center gap-1">
              <span className="font-medium text-gray-900">
                {formatCurrency(price, listing.currency)}
              </span>
              <span className="text-sm text-gray-500">/ ночь</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
