/**
 * k6 load test — Booking availability check
 *
 * Targets:
 *   GET  /api/listings/:id/availability
 *   POST /api/bookings  (availability-only, with test listing)
 *
 * Requires env vars:
 *   BASE_URL      — API base (default: https://api.milyidom.com)
 *   GUEST_TOKEN   — valid JWT for a guest user
 *   LISTING_ID    — an existing listing ID for availability checks
 *
 * Run:
 *   k6 run --env BASE_URL=https://api.milyidom.com \
 *          --env GUEST_TOKEN=<token> \
 *          --env LISTING_ID=<id> \
 *          booking-flow.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL   = __ENV.BASE_URL    || 'https://api.milyidom.com';
const TOKEN      = __ENV.GUEST_TOKEN || '';
const LISTING_ID = __ENV.LISTING_ID  || '';

const availabilityLatency = new Trend('availability_duration', true);
const errorRate           = new Rate('booking_flow_errors');

export const options = {
  stages: [
    { duration: '20s', target: 10 },
    { duration: '1m',  target: 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    'http_req_duration{name:availability}': ['p(95)<500'],
    availability_duration: ['p(95)<500'],
    booking_flow_errors: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
};

const authHeader = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

export default function () {
  if (!LISTING_ID) {
    console.error('LISTING_ID not set — skipping');
    return;
  }

  // Check availability for next 30 days
  const checkIn  = new Date(Date.now() + 7  * 86400_000).toISOString().slice(0, 10);
  const checkOut = new Date(Date.now() + 10 * 86400_000).toISOString().slice(0, 10);

  const avRes = http.get(
    `${BASE_URL}/api/listings/${LISTING_ID}/availability?checkIn=${checkIn}&checkOut=${checkOut}`,
    { headers: { Accept: 'application/json', ...authHeader }, tags: { name: 'availability' } },
  );

  const ok = check(avRes, {
    'availability 200': (r) => r.status === 200,
  });

  availabilityLatency.add(avRes.timings.duration);
  errorRate.add(!ok);

  sleep(2);
}
