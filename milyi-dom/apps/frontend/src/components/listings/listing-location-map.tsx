'use client';

import { useEffect, useRef, useState } from 'react';

interface ListingLocationMapProps {
  latitude: string | number;
  longitude: string | number;
  city?: string;
  country?: string;
}

const YANDEX_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? '';

// Minimal typing for the Yandex Maps 3.0 API we use
interface YMapDestroyable {
  addChild: (child: unknown) => void;
  destroy: () => void;
}

interface YMaps3 {
  ready: Promise<void>;
  YMap: new (
    container: HTMLElement,
    params: { location: { center: [number, number]; zoom: number }; behaviors?: string[] },
  ) => YMapDestroyable;
  YMapDefaultSchemeLayer: new (params: Record<string, unknown>) => unknown;
  YMapDefaultFeaturesLayer: new (params: Record<string, unknown>) => unknown;
  YMapMarker: new (params: { coordinates: [number, number] }, element: HTMLElement) => unknown;
}

export function ListingLocationMap({ latitude, longitude }: ListingLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const lat = parseFloat(String(latitude));
  const lng = parseFloat(String(longitude));
  const validCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

  useEffect(() => {
    if (!validCoords) return;
    if (!YANDEX_KEY) {
      setError('no-token');
      return;
    }

    let map: YMapDestroyable | null = null;

    const init = async () => {
      try {
        // Load Yandex Maps 3.0 script (only once per page)
        if (!document.querySelector('#ymaps3-script')) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.id = 'ymaps3-script';
            s.src = `https://api-maps.yandex.ru/3.0/?apikey=${YANDEX_KEY}&lang=ru_RU`;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Не удалось загрузить Яндекс Карты'));
            document.head.appendChild(s);
          });
        }

        const ym = (window as unknown as { ymaps3: YMaps3 }).ymaps3;
        await ym.ready;

        if (!containerRef.current) return;

        const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = ym;

        const mapInstance = new YMap(containerRef.current, {
          location: { center: [lng, lat], zoom: 13 },
          behaviors: ['drag'],
        });

        mapInstance.addChild(new YMapDefaultSchemeLayer({}));
        mapInstance.addChild(new YMapDefaultFeaturesLayer({}));

        const markerEl = document.createElement('div');
        markerEl.className = 'h-4 w-4 rounded-full border-2 border-pine-600 bg-pine-400';
        mapInstance.addChild(new YMapMarker({ coordinates: [lng, lat] }, markerEl));

        map = mapInstance;
        setLoaded(true);
      } catch (err) {
        console.error('Failed to load location map', err);
        setError('load-error');
      }
    };

    void init();

    return () => {
      map?.destroy();
    };
  }, [lat, lng, validCoords]);

  if (!validCoords) return null;

  if (error === 'no-token') {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
        Карта недоступна
      </div>
    );
  }

  if (error === 'load-error') {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
        Не удалось загрузить карту
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-2xl"
        style={{ minHeight: 256 }}
      />
      {/* CSS privacy circle overlay — shows approximate area, not exact address */}
      {loaded && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-32 w-32 rounded-full border-2 border-pine-600/40 bg-pine-600/10 backdrop-blur-sm" />
        </div>
      )}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-100">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-pine-600 border-t-transparent" />
        </div>
      )}
      <p className="mt-2 text-xs text-slate-400">
        Точный адрес предоставляется после подтверждения бронирования.
      </p>
    </div>
  );
}
