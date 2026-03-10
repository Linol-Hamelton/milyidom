/**
 * k6 load test — Listings search
 *
 * Targets: GET /api/listings  (catalog/search)
 *
 * Run:
 *   k6 run --env BASE_URL=https://api.milyidom.com listings-search.js
 *   k6 run --env BASE_URL=http://localhost:4001 listings-search.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'https://api.milyidom.com';

const listingsLatency = new Trend('listings_search_duration', true);
const errorRate = new Rate('listings_search_errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // ramp up
    { duration: '1m',  target: 20 },   // sustained load
    { duration: '30s', target: 50 },   // spike
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],  // P95 < 300ms
    listings_search_duration: ['p(95)<300'],
    listings_search_errors: ['rate<0.01'],  // < 1% error
    http_req_failed: ['rate<0.01'],
  },
};

const SEARCH_QUERIES = [
  { city: 'Москва' },
  { city: 'Санкт-Петербург' },
  { city: 'Сочи', guests: 2 },
  { propertyType: 'apartment' },
  { minPrice: 2000, maxPrice: 8000 },
  {},  // no filter — homepage catalog
];

export default function () {
  const q = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
  const params = new URLSearchParams({ page: '1', limit: '12', ...q });
  const url = `${BASE_URL}/api/listings?${params.toString()}`;

  const res = http.get(url, {
    headers: { Accept: 'application/json' },
    tags: { name: 'listings_search' },
  });

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'has items': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.items);
      } catch {
        return false;
      }
    },
  });

  listingsLatency.add(res.timings.duration);
  errorRate.add(!ok);

  sleep(1);
}
