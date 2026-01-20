import Image from "next/image";
import type { Listing } from "../../types";

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  return (
    <article className="group cursor-pointer">
      <div className="relative mb-3 overflow-hidden rounded-xl">
        <Image
          src={listing.image}
          alt={listing.title}
          width={400}
          height={300}
          className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105"
        />

        <button
          className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm transition hover:bg-white"
          aria-label="Добавить в избранное"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>

        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
          <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
          <span>{listing.rating.toFixed(1)}</span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-start justify-between">
          <h3 className="line-clamp-1 font-semibold text-gray-900">{listing.title}</h3>
          <div className="flex items-center gap-1 text-sm text-gray-900">
            <span className="font-semibold">₽{listing.pricePerNight}</span>
            <span className="text-gray-600">/ночь</span>
          </div>
        </div>

        <p className="line-clamp-1 text-sm text-gray-500">{listing.location}</p>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{listing.guests} гостей</span>
          <span>•</span>
          <span>{listing.bedrooms} спальни</span>
          <span>•</span>
          <span>{listing.baths} ванные</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {listing.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
            >
              {tag}
            </span>
          ))}
          {listing.tags.length > 2 && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
              +{listing.tags.length - 2}
            </span>
          )}
        </div>

        {listing.instantBook && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Мгновенное бронирование
          </div>
        )}
      </div>
    </article>
  );
}
