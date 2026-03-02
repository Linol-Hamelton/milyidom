'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ListingForm, ListingFormValues } from './listing-form';
import { PriceOverrides } from './price-overrides';
import { fetchAmenities } from '../../services/amenities';
import { fetchListing, updateListing } from '../../services/listings';
import type { Amenity, Listing } from '../../types/api';
import { parseError } from '../../lib/api-client';

type UpdateListingPayload = Parameters<typeof updateListing>[1];
type ListingImagePayload = NonNullable<UpdateListingPayload['images']>[number];

export function EditListingClient({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [amenitiesData, listingData] = await Promise.all([
          fetchAmenities(),
          fetchListing(listingId),
        ]);
        setAmenities(amenitiesData);
        setListing(listingData);
      } catch (error) {
        const { message } = parseError(error);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [listingId]);

  const handleSubmit = async (values: ListingFormValues) => {
    if (!listing) return;

    setSubmitting(true);
    try {
      const images: ListingImagePayload[] = values.images
        .split('\n')
        .map((url) => url.trim())
        .filter(Boolean)
        .map<ListingImagePayload>((url, index) => ({
          url,
          position: index,
          isPrimary: index === 0,
        }));

      const payload: UpdateListingPayload = {
        title: values.title,
        summary: values.summary,
        description: values.description,
        propertyType: values.propertyType,
        guests: values.guests,
        bedrooms: values.bedrooms,
        beds: values.beds,
        bathrooms: values.bathrooms.toString(),
        basePrice: values.basePrice.toString(),
        cleaningFee: values.cleaningFee?.toString(),
        serviceFee: values.serviceFee?.toString(),
        currency: values.currency,
        instantBook: values.instantBook,
        addressLine1: values.addressLine1,
        addressLine2: values.addressLine2,
        city: values.city,
        state: values.state,
        country: values.country,
        postalCode: values.postalCode,
        latitude: values.latitude.toString(),
        longitude: values.longitude.toString(),
        images,
        amenityIds: values.amenityIds,
      };

      await updateListing(listing.id, payload);
      toast.success('Объявление обновлено');
      router.push('/host/listings');
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-3xl bg-white" />
        ))}
      </div>
    );
  }

  if (!listing) {
    return <p className="text-sm text-slate-500">Не удалось загрузить объявление.</p>;
  }

  return (
    <div className="space-y-8">
      <ListingForm amenities={amenities} initialValues={listing} listingId={listing.id} onSubmit={handleSubmit} submitting={submitting} />
      <PriceOverrides listingId={listing.id} />
    </div>
  );
}
