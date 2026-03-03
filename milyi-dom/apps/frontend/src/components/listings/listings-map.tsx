'use client';

import { useEffect, useRef, useState } from 'react';
import type { Listing } from '../../types/api';

interface ListingsMapProps {
  listings: Listing[];
  onListingClick?: (listing: Listing) => void;
  onSearchArea?: (lat: number, lng: number, radiusKm: number) => void;
}

const YANDEX_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? '';

// Minimal typing for the Yandex Maps 3.0 API we use
interface YMapInstance {
  addChild: (child: unknown) => void;
  destroy: () => void;
  readonly center: [number, number]; // [lng, lat]
  readonly bounds: [[number, number], [number, number]]; // [[minLng, minLat], [maxLng, maxLat]]
}

interface YMaps3 {
  ready: Promise<void>;
  import: (pkg: string) => Promise<Record<string, unknown>>;
  YMap: new (
    container: HTMLElement,
    params: { location: { center: [number, number]; zoom: number }; behaviors?: string[] },
  ) => YMapInstance;
  YMapDefaultSchemeLayer: new (params: Record<string, unknown>) => unknown;
  YMapDefaultFeaturesLayer: new (params: Record<string, unknown>) => unknown;
  YMapMarker: new (params: { coordinates: [number, number] }, element: HTMLElement) => unknown;
  YMapListener: new (params: { layer: string; onActionEnd?: () => void }) => unknown;
}

type ClusterFeature = {
  type: 'Feature';
  id: string;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Listing;
};

export function ListingsMap({ listings, onListingClick, onSearchArea }: ListingsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YMapInstance | null>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [mapMoved, setMapMoved] = useState(false);

  useEffect(() => {
    if (!YANDEX_KEY) {
      setError('Для отображения карты укажите NEXT_PUBLIC_YANDEX_MAPS_API_KEY в .env.local');
      return;
    }

    let map: YMapInstance | null = null;

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

        const {
          YMap,
          YMapDefaultSchemeLayer,
          YMapDefaultFeaturesLayer,
          YMapMarker,
          YMapListener,
        } = ym;

        const { YMapZoomControl } = (await ym.import('@yandex/ymaps3-controls@0.0.1')) as {
          YMapZoomControl: new (params: Record<string, unknown>) => unknown;
        };

        const { YMapClusterer, clusterByGrid } = (await ym.import(
          '@yandex/ymaps3-clusterer@0.0.1',
        )) as {
          YMapClusterer: new (params: {
            method: unknown;
            features: ClusterFeature[];
            marker: (feature: ClusterFeature) => unknown;
            cluster: (coordinates: [number, number], features: ClusterFeature[]) => unknown;
          }) => unknown;
          clusterByGrid: (params: { gridSize: number }) => unknown;
        };

        const validListings = listings.filter((l) => l.latitude && l.longitude);
        const centerLng =
          validListings.length > 0 ? parseFloat(validListings[0].longitude) : 37.6173;
        const centerLat =
          validListings.length > 0 ? parseFloat(validListings[0].latitude) : 55.7558;

        map = new YMap(containerRef.current, {
          location: { center: [centerLng, centerLat], zoom: 10 },
          behaviors: ['drag', 'scrollZoom', 'pinchZoom'],
        });

        map.addChild(new YMapDefaultSchemeLayer({}));
        map.addChild(new YMapDefaultFeaturesLayer({}));
        map.addChild(new YMapZoomControl({}));

        const makeMarker = (listing: Listing) => {
          const el = document.createElement('div');
          el.className =
            'cursor-pointer rounded-full border-2 border-pine-600 bg-white px-2 py-1 text-xs font-bold text-pine-700 shadow-md hover:bg-pine-600 hover:text-white transition';
          el.textContent = `${Math.round(parseFloat(listing.basePrice))}₽`;
          el.addEventListener('click', () => onListingClick?.(listing));
          return new YMapMarker(
            { coordinates: [parseFloat(listing.longitude), parseFloat(listing.latitude)] },
            el,
          );
        };

        const features: ClusterFeature[] = validListings.map((l) => ({
          type: 'Feature' as const,
          id: l.id,
          geometry: {
            type: 'Point' as const,
            coordinates: [parseFloat(l.longitude), parseFloat(l.latitude)] as [number, number],
          },
          properties: l,
        }));

        map.addChild(
          new YMapClusterer({
            method: clusterByGrid({ gridSize: 64 }),
            features,
            marker: (feature) => makeMarker(feature.properties),
            cluster: (coordinates, clusterFeatures) => {
              const el = document.createElement('div');
              el.className =
                'flex h-9 w-9 items-center justify-center rounded-full bg-pine-600 text-xs font-bold text-white shadow-md';
              el.textContent = String(clusterFeatures.length);
              return new YMapMarker({ coordinates }, el);
            },
          }),
        );

        // Track map movement for "Search this area" button
        map.addChild(new YMapListener({ layer: 'any', onActionEnd: () => setMapMoved(true) }));

        mapRef.current = map;
        setLoaded(true);
      } catch (err) {
        setError(`Ошибка инициализации карты: ${String(err)}`);
      }
    };

    void init();

    return () => {
      map?.destroy();
      mapRef.current = null;
    };
  }, [listings, onListingClick]);

  if (error) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <div>
          <p className="text-2xl">🗺️</p>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const handleSearchArea = () => {
    if (!onSearchArea || !mapRef.current) return;
    const [cLng, cLat] = mapRef.current.center;
    const [, [maxLng, maxLat]] = mapRef.current.bounds;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(maxLat - cLat);
    const dLng = toRad(maxLng - cLng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(cLat)) * Math.cos(toRad(maxLat)) * Math.sin(dLng / 2) ** 2;
    const radiusKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    setMapMoved(false);
    onSearchArea(cLat, cLng, Math.max(radiusKm, 5));
  };

  return (
    <div className="relative h-[420px] overflow-hidden rounded-2xl border border-slate-200">
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-pine-600 border-t-transparent" />
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
      {loaded && mapMoved && onSearchArea && (
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
          <button
            type="button"
            onClick={handleSearchArea}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-md hover:bg-slate-50 transition-colors border border-slate-200"
          >
            🔍 Искать в этой области
          </button>
        </div>
      )}
    </div>
  );
}
