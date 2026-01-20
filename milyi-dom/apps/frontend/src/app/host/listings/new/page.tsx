"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { RequireAuth } from '../../../../components/ui/require-auth';
import { ListingForm, ListingFormValues } from '../../../../components/host/listing-form';
import { fetchAmenities } from '../../../../services/amenities';
import { createListing } from '../../../../services/listings';
import type { Amenity } from '../../../../types/api';
import { parseError } from '../../../../lib/api-client';

type CreateListingPayload = Parameters<typeof createListing>[0];
type ListingImagePayload = CreateListingPayload['images'][number];

export default function HostCreateListingPage() {
  const router = useRouter();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAmenities();
        setAmenities(data);
      } catch (error) {
        const { message } = parseError(error);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSubmit = async (values: ListingFormValues) => {
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

      const payload: CreateListingPayload = {
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
        status: 'DRAFT',
      };

      await createListing(payload);
      toast.success('Объявление создано и сохранено как черновик');
      router.push('/host/listings');
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RequireAuth roles={['HOST', 'ADMIN']}>
      <div className="bg-sand-50 py-12">
        <div className="mx-auto max-w-content-xl px-4 sm:px-6 lg:px-10">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-pine-600">Новое объявление</p>
            <h1 className="text-3xl font-serif text-slate-900">Заполните карточку размещения</h1>
            <p className="text-sm text-slate-600">
              Добавьте подробное описание, фотографии и удобства — чем информативнее карточка, тем выше доверие гостей.
            </p>
          </header>

          {loading ? (
            <div className="mt-10 space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-3xl bg-white" />
              ))}
            </div>
          ) : (
            <section className="mt-8 rounded-3xl bg-white p-6 shadow-soft">
              <ListingForm amenities={amenities} onSubmit={handleSubmit} submitting={submitting} />
            </section>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
