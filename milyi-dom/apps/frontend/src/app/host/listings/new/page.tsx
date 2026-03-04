"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { RequireAuth } from "../../../../components/ui/require-auth";
import { ListingForm, ListingFormValues } from "../../../../components/host/listing-form";
import { fetchAmenities } from "../../../../services/amenities";
import { createListing, uploadListingImage } from "../../../../services/listings";
import type { Amenity } from "../../../../types/api";
import { parseError } from "../../../../lib/api-client";

type CreateListingPayload = Parameters<typeof createListing>[0];
type ListingImagePayload = NonNullable<CreateListingPayload["images"]>[number];

const createIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `listing-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function HostCreateListingPage() {
  const router = useRouter();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const submitKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAmenities();
        setAmenities(data);
      } catch (error) {
        toast.error(parseError(error).message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleSubmit = async (values: ListingFormValues) => {
    if (!submitKeyRef.current) {
      submitKeyRef.current = createIdempotencyKey();
    }

    setSubmitting(true);
    try {
      const images: ListingImagePayload[] = values.images
        .split("\n")
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
        images: images.length > 0 ? images : undefined,
        amenityIds: values.amenityIds.length > 0 ? values.amenityIds : undefined,
        status: "DRAFT",
      };

      const created = await createListing(payload, {
        timeoutMs: 60_000,
        idempotencyKey: submitKeyRef.current,
      });

      if (values.uploadFiles.length > 0) {
        await Promise.all(values.uploadFiles.map((file) => uploadListingImage(created.id, file)));
      }

      submitKeyRef.current = null;
      toast.success("Объявление создано и сохранено как черновик");
      router.push("/host/listings");
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
        toast.error(
          "Сохранение заняло больше минуты. Проверьте список объявлений перед повторной отправкой.",
        );
        return;
      }

      toast.error(parseError(error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RequireAuth roles={["HOST", "ADMIN"]}>
      <div className="bg-sand-50 py-8 sm:py-12">
        <div className="mx-auto max-w-content-xl px-4 sm:px-6 lg:px-10">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-pine-600">Новое объявление</p>
            <h1 className="text-2xl font-serif text-slate-900 sm:text-3xl">
              Заполните карточку размещения
            </h1>
            <p className="text-sm text-slate-600">
              Добавьте подробное описание, фотографии и удобства — чем информативнее карточка, тем
              выше доверие гостей.
            </p>
          </header>

          {loading ? (
            <div className="mt-10 space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-3xl bg-white" />
              ))}
            </div>
          ) : (
            <section className="mt-8 rounded-3xl bg-white p-4 shadow-soft sm:p-6">
              <ListingForm amenities={amenities} onSubmit={handleSubmit} submitting={submitting} />
            </section>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
