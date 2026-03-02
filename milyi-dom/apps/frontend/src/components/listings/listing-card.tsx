'use client';

const backendImagesBase = (
  process.env.NEXT_PUBLIC_BACKEND_IMAGES_URL ??
  (process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '/images')
    : 'http://localhost:4001/images')
).replace(/\/$/, '');

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Listing } from '../../types/api';
import { formatCurrency } from '../../lib/format';
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
  const primaryImage = sortedImages.find((image) => image.isPrimary) ?? sortedImages[0];

  const getImageUrl = (url: string) => {
    if (!url) {
      return '/images/listing-1.jpg';
    }
    if (url.startsWith('/images/')) {
      return url;
    }
    if (url.startsWith('http')) {
      return url;
    }
    return `${backendImagesBase}/${url.replace(/^\/+/, '')}`;
  };

  const imageSrc = primaryImage ? getImageUrl(primaryImage.url) : '/images/listing-1.jpg';
  const price = Number(listing.basePrice ?? 0);
  const linkHref = href ?? `/listings/${listing.id}`;
  const propertyLabel = propertyTypeLabels[listing.propertyType] ?? listing.propertyType;

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
        <div className="relative aspect-square overflow-hidden rounded-xl">
          <Image
            src={imageSrc}
            alt={listing.title}
            fill
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
            placeholder="blur"
            blurDataURL={listingBlurDataURL}
            unoptimized={imageSrc.startsWith('http')}
          />

          <div className="absolute right-3 top-3 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
            <FavoriteToggle listingId={listing.id} appearance="icon" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-start justify-between">
            <h3 className="font-medium text-gray-900 line-clamp-1">{listing.title}</h3>
            {listing.rating && (
              <div className="flex items-center gap-1">
                <svg className="h-3 w-3 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm text-gray-600">{Number(listing.rating).toFixed(1)}</span>
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

          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })} –{' '}
            {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU', {
              month: 'short',
              day: 'numeric',
            })}
          </p>

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



