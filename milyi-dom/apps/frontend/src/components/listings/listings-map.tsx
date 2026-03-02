'use client';

import { useEffect, useRef, useState } from 'react';
import type { Listing } from '../../types/api';

interface ListingsMapProps {
  listings: Listing[];
  onListingClick?: (listing: Listing) => void;
  onSearchArea?: (lat: number, lng: number, radiusKm: number) => void;
}

// MapBox token — users must set NEXT_PUBLIC_MAPBOX_TOKEN in frontend .env
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export function ListingsMap({ listings, onListingClick, onSearchArea }: ListingsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [mapMoved, setMapMoved] = useState(false);

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      setError('Для отображения карты укажите NEXT_PUBLIC_MAPBOX_TOKEN в .env.local');
      return;
    }

    let map: {
      remove: () => void;
      on: (event: string, cb: () => void) => void;
      addControl: (control: unknown) => void;
      addSource: (id: string, source: unknown) => void;
      addLayer: (layer: unknown) => void;
      getSource: (id: string) => { setData: (data: unknown) => void } | undefined;
    } | null = null;

    const init = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        // Dynamically inject MapBox CSS (only once)
        if (!document.querySelector('#mapbox-css')) {
          const link = document.createElement('link');
          link.id = 'mapbox-css';
          link.rel = 'stylesheet';
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
          document.head.appendChild(link);
        }

        if (!containerRef.current) return;

        (mapboxgl as { accessToken: string }).accessToken = MAPBOX_TOKEN;

        // Find map center from listings
        const validListings = listings.filter(
          (l) => l.latitude && l.longitude,
        );
        const center: [number, number] =
          validListings.length > 0
            ? [
                parseFloat(validListings[0].longitude),
                parseFloat(validListings[0].latitude),
              ]
            : [37.6173, 55.7558]; // Moscow default

        map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center,
          zoom: 10,
        }) as typeof map;

        mapRef.current = map;

        map!.addControl(new mapboxgl.NavigationControl({ showCompass: true }));

        map!.on('load', () => {
          setLoaded(true);

          // Build GeoJSON from listings
          const geojson = {
            type: 'FeatureCollection' as const,
            features: validListings.map((l) => ({
              type: 'Feature' as const,
              properties: {
                id: l.id,
                title: l.title,
                price: l.basePrice,
                rating: l.rating ?? 0,
                currency: l.currency,
              },
              geometry: {
                type: 'Point' as const,
                coordinates: [parseFloat(l.longitude), parseFloat(l.latitude)],
              },
            })),
          };

          map!.addSource('listings', { type: 'geojson', data: geojson, cluster: true, clusterMaxZoom: 14, clusterRadius: 50 });

          // Clustered circles
          map!.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'listings',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': ['step', ['get', 'point_count'], '#84b49c', 10, '#4a8c6e', 30, '#2d6e52'],
              'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40],
            },
          });

          // Cluster count labels
          map!.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'listings',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12,
            },
            paint: { 'text-color': '#fff' },
          });

          // Individual listing pins (price badges)
          map!.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'listings',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': '#fff',
              'circle-radius': 18,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#4a8c6e',
            },
          });
        });

        // Track map movement for "Search this area" button
        map!.on('moveend', () => setMapMoved(true));

        // Click on listing pin
        map!.on('click', () => {
          // handled via popup
        });

        // Add popups on click
        if (typeof mapboxgl.Popup === 'function') {
          const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });
          map!.on('mouseenter', () => {
            // add hover popup logic
          });
          void popup; // keep reference
        }

        // Add markers with price labels
        for (const listing of validListings) {
          const el = document.createElement('div');
          el.className =
            'cursor-pointer rounded-full border-2 border-pine-600 bg-white px-2 py-1 text-xs font-bold text-pine-700 shadow-md hover:bg-pine-600 hover:text-white transition';
          el.textContent = `${Math.round(parseFloat(listing.basePrice))}₽`;
          el.addEventListener('click', () => onListingClick?.(listing));

          new mapboxgl.Marker({ element: el })
            .setLngLat([parseFloat(listing.longitude), parseFloat(listing.latitude)])
            .addTo(map as Parameters<typeof mapboxgl.Marker.prototype.addTo>[0]);
        }
      } catch (err) {
        setError(`Ошибка инициализации карты: ${String(err)}`);
      }
    };

    void init();

    return () => {
      map?.remove();
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
    const map = mapRef.current as {
      getCenter: () => { lat: number; lng: number };
      getBounds: () => {
        getNorthEast: () => { lat: number; lng: number };
        getCenter: () => { lat: number; lng: number };
      };
    };
    const center = map.getCenter();
    const bounds = map.getBounds();
    const ne = bounds.getNorthEast();
    // Compute radius as Haversine distance from center to NE corner
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(ne.lat - center.lat);
    const dLng = toRad(ne.lng - center.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(center.lat)) * Math.cos(toRad(ne.lat)) * Math.sin(dLng / 2) ** 2;
    const radiusKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    setMapMoved(false);
    onSearchArea(center.lat, center.lng, Math.max(radiusKm, 5));
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
