'use client';

import { useEffect, useRef, useState } from 'react';

interface ListingLocationMapProps {
  latitude: string | number;
  longitude: string | number;
  city?: string;
  country?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export function ListingLocationMap({ latitude, longitude }: ListingLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const lat = parseFloat(String(latitude));
  const lng = parseFloat(String(longitude));
  const validCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

  useEffect(() => {
    if (!validCoords) return;
    if (!MAPBOX_TOKEN) {
      setError('no-token');
      return;
    }

    let map: { remove: () => void } | null = null;

    const init = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;

        if (!document.querySelector('#mapbox-css')) {
          const link = document.createElement('link');
          link.id = 'mapbox-css';
          link.rel = 'stylesheet';
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
          document.head.appendChild(link);
        }

        if (!containerRef.current) return;

        (mapboxgl as { accessToken: string }).accessToken = MAPBOX_TOKEN;

        const mapInstance = new (mapboxgl as unknown as {
          new (...args: unknown[]): unknown;
          Map: new (opts: unknown) => {
            remove: () => void;
            on: (event: string, cb: () => void) => void;
            getCanvas: () => { style: { cursor: string } };
          };
          Marker: new (opts?: unknown) => { setLngLat: (coords: [number, number]) => { addTo: (map: unknown) => void } };
          NavigationControl: new () => unknown;
        }).Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [lng, lat],
          zoom: 13,
          interactive: true,
          scrollZoom: false,
        });

        mapInstance.on('load', () => {
          setLoaded(true);

          // Add a blurred circle for privacy (show area, not exact address)
          (mapInstance as unknown as {
            addSource: (id: string, source: unknown) => void;
            addLayer: (layer: unknown) => void;
          }).addSource('location-area', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [lng, lat] },
                properties: {},
              }],
            },
          });

          (mapInstance as unknown as { addLayer: (layer: unknown) => void }).addLayer({
            id: 'location-circle',
            type: 'circle',
            source: 'location-area',
            paint: {
              'circle-radius': 60,
              'circle-color': '#4a7c59',
              'circle-opacity': 0.18,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#4a7c59',
              'circle-stroke-opacity': 0.4,
            },
          });
        });

        // Add navigation control
        const nav = new (mapboxgl as unknown as { NavigationControl: new () => unknown }).NavigationControl();
        (mapInstance as unknown as { addControl: (ctrl: unknown, pos?: string) => void }).addControl(nav, 'top-right');

        map = mapInstance as unknown as { remove: () => void };
      } catch (err) {
        console.error('Failed to load location map', err);
        setError('load-error');
      }
    };

    void init();

    return () => {
      map?.remove();
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
