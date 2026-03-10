import { test, expect } from '@playwright/test';
import { loginAs, loginViaApi, ACCOUNTS } from '../fixtures/auth';

const API_URL = process.env.API_URL || 'https://api.milyidom.com';

test.describe('Host Journey — Dashboard', () => {
  test('host dashboard page loads', async ({ page, request }) => {
    await loginAs(page, request, 'host');
    await page.goto('/host/dashboard');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/host');
  });

  test('host listings page loads', async ({ page, request }) => {
    await loginAs(page, request, 'host');
    await page.goto('/host/listings');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/host/listings');
    // Some listing content or empty state should be visible
    const content = page.locator('main, [role="main"]').first();
    await expect(content).toBeVisible();
  });

  test('host new listing form loads', async ({ page, request }) => {
    await loginAs(page, request, 'host');
    await page.goto('/host/listings/new');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/host/listings/new');
    // Form should have some inputs
    const firstInput = page.locator('input, textarea, select').first();
    await expect(firstInput).toBeVisible({ timeout: 10_000 });
  });

  test('host bookings page loads', async ({ page, request }) => {
    await loginAs(page, request, 'host');
    await page.goto('/host/bookings');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/host/bookings');
  });
});

test.describe('Host Journey — Listings API', () => {
  test('host can get own listings', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.host.email, ACCOUNTS.host.password);

    const res = await request.get(`${API_URL}/api/listings/my`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data || body)).toBe(true);
  });

  test('host can create listing (idempotency)', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.host.email, ACCOUNTS.host.password);

    const idempotencyKey = `pw-test-${Date.now()}`;
    const payload = {
      title: `E2E Test Listing ${idempotencyKey}`,
      description: 'Created by Playwright E2E tests — safe to delete',
      propertyType: 'APARTMENT',
      guests: 2, bedrooms: 1, beds: 1, bathrooms: 1,
      basePrice: 3500, currency: 'RUB',
      country: 'Russia', city: 'Moscow',
      addressLine1: 'Тверская 1',
      latitude: 55.7558, longitude: 37.6173,
    };

    const res1 = await request.post(`${API_URL}/api/listings`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Idempotency-Key': idempotencyKey },
      data: payload,
    });
    expect(res1.status()).toBe(201);
    const listing1 = await res1.json();
    expect(listing1.id).toBeTruthy();

    // Same idempotency key → same result
    const res2 = await request.post(`${API_URL}/api/listings`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Idempotency-Key': idempotencyKey },
      data: payload,
    });
    expect(res2.status()).toBe(201);
    const listing2 = await res2.json();
    expect(listing2.id).toBe(listing1.id); // idempotent — same listing returned
  });

  test('host can upload image to S3', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.host.email, ACCOUNTS.host.password);

    // Create listing first
    const listingRes = await request.post(`${API_URL}/api/listings`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        title: `E2E Image Test ${Date.now()}`,
        description: 'E2E image upload test — safe to delete',
        propertyType: 'APARTMENT',
        guests: 2, bedrooms: 1, beds: 1, bathrooms: 1,
        basePrice: 3000, currency: 'RUB',
        country: 'Russia', city: 'Moscow',
        addressLine1: 'Арбат 1',
        latitude: 55.7494, longitude: 37.5998,
      },
    });
    const listing = await listingRes.json();

    // Download a small test image
    const imgRes = await request.get('https://picsum.photos/200/150');
    const imgBuffer = await imgRes.body();

    // Upload
    const uploadRes = await request.post(`${API_URL}/api/listings/${listing.id}/images`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      multipart: {
        file: { name: 'test.jpg', mimeType: 'image/jpeg', buffer: imgBuffer },
        isPrimary: 'true',
      },
    });
    expect(uploadRes.status()).toBe(201);
    const image = await uploadRes.json();
    expect(image.url).toContain('storage.yandexcloud.net');
    expect(image.isPrimary).toBe(true);

    // Verify it appears in listing detail
    const detailRes = await request.get(`${API_URL}/api/listings/${listing.id}`);
    const detail = await detailRes.json();
    expect(detail.images?.length).toBeGreaterThan(0);
    expect(detail.images[0].url).toContain('storage.yandexcloud.net');
  });

  test('host can update listing', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.host.email, ACCOUNTS.host.password);

    // Get host listings
    const listingsRes = await request.get(`${API_URL}/api/listings/my`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const listings = await listingsRes.json();
    const items = listings.data || listings;
    if (items.length === 0) return; // skip if no listings

    const listingId = items[0].id;
    const newTitle = `Updated ${Date.now()}`;

    const updateRes = await request.patch(`${API_URL}/api/listings/${listingId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { title: newTitle },
    });
    expect([200, 201]).toContain(updateRes.status());
    const updated = await updateRes.json();
    expect(updated.title).toBe(newTitle);
  });

  test('host cannot update another host listing (403)', async ({ request }) => {
    // Login as host2
    let accessToken: string;
    try {
      ({ accessToken } = await loginViaApi(request, 'host2@example.com', 'password123'));
    } catch {
      return; // skip if host2 not available
    }

    // Get listings of host (not host2)
    const { accessToken: hostToken } = await loginViaApi(request, ACCOUNTS.host.email, ACCOUNTS.host.password);
    const listingsRes = await request.get(`${API_URL}/api/listings/my`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    const listings = await listingsRes.json();
    const items = listings.data || listings;
    if (items.length === 0) return;

    const listingId = items[0].id;
    const updateRes = await request.patch(`${API_URL}/api/listings/${listingId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { title: 'Stolen title' },
    });
    expect([403, 401, 404]).toContain(updateRes.status());
  });
});

test.describe('Host Journey — Bookings management', () => {
  test('host can get own bookings', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.host.email, ACCOUNTS.host.password);

    const res = await request.get(`${API_URL}/api/bookings/host`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data || body)).toBe(true);
  });

  test('host analytics endpoint returns data', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.host.email, ACCOUNTS.host.password);

    const res = await request.get(`${API_URL}/api/analytics/host`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
  });
});
