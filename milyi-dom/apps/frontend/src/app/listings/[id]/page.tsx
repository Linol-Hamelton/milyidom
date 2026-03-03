import type { Metadata } from 'next';
import { ListingDetailClient } from '../../../components/listings/listing-detail-client';

export const revalidate = 3600; // ISR: revalidate every hour

const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/api').replace(/\/+$/, '');

interface ListingMeta {
  title?: string;
  description?: string;
  city?: string;
  country?: string;
  basePrice?: number | string;
  currency?: string;
  images?: { url: string; isPrimary?: boolean }[];
}

async function fetchListingMeta(id: string): Promise<ListingMeta | null> {
  try {
    const res = await fetch(`${apiBase}/listings/${id}`, {
      next: { revalidate: 3600 }, // cache 1 hour
    });
    if (!res.ok) return null;
    return (await res.json()) as ListingMeta;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await fetchListingMeta(id);

  if (!listing) {
    return {
      title: 'Объявление — Милый Дом',
      description: 'Аренда жилья на платформе Милый Дом.',
    };
  }

  const title = `${listing.title ?? 'Объявление'} — Милый Дом`;
  const location = [listing.city, listing.country].filter(Boolean).join(', ');
  const price = listing.basePrice
    ? `от ${Number(listing.basePrice).toLocaleString('ru-RU')} ${listing.currency ?? '₽'}/ночь`
    : '';
  const description = [listing.description, location, price].filter(Boolean).join(' · ').slice(0, 160);

  const primaryImage =
    listing.images?.find((img) => img.isPrimary)?.url ?? listing.images?.[0]?.url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(primaryImage ? { images: [{ url: primaryImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(primaryImage ? { images: [primaryImage] } : {}),
    },
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListingDetailClient listingId={id} />;
}
