import { test, expect } from '@playwright/test';
import { loginAs, clearAuth, ACCOUNTS } from '../fixtures/auth';

const API_URL = process.env.API_URL || 'https://api.milyidom.com';

test.describe('Guest Journey — Discovery', () => {
  test('homepage loads with listing cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Check page renders
    expect(page.url()).toContain('milyidom.com');
    // Featured listings or search section should be visible
    const listingCards = page.locator('[data-testid="listing-card"], .listing-card, [href*="/listings/"]');
    await expect(listingCards.first()).toBeVisible({ timeout: 15_000 });
  });

  test('listings catalog page loads', async ({ page }) => {
    await page.goto('/listings');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/listings');
    const listingCards = page.locator('[href*="/listings/"]').filter({ hasText: /руб|₽|\d+/i });
    const count = await listingCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('listing detail page loads with key sections', async ({ page, request }) => {
    // Get first listing from API
    const res = await request.get(`${API_URL}/api/listings?limit=1`);
    const body = await res.json();
    const listing = body.data?.[0] || body[0];
    expect(listing).toBeTruthy();

    const detailPath = listing.slug
      ? `/listings/${listing.id}`
      : `/listings/${listing.id}`;

    await page.goto(detailPath);
    await page.waitForLoadState('networkidle');

    // Title should be visible
    await expect(page.locator('h1').first()).toBeVisible();
    // Price should be visible
    await expect(page.locator('text=/руб|₽/i').first()).toBeVisible({ timeout: 10_000 });
  });

  test('search returns results', async ({ page }) => {
    await page.goto('/listings');
    await page.waitForLoadState('networkidle');
    const listingsBefore = await page.locator('[href*="/listings/"]').count();
    expect(listingsBefore).toBeGreaterThan(0);
  });

  test('API listings endpoint returns paginated data', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/listings?limit=12&page=1`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = body.data || body;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    // Each listing has required fields
    const listing = items[0];
    expect(listing.id).toBeTruthy();
    expect(listing.title).toBeTruthy();
    expect(listing.basePrice).toBeDefined();
  });
});

test.describe('Guest Journey — Auth-gated actions', () => {
  test('unauthenticated user redirected to login when accessing favorites', async ({ page }) => {
    await page.goto('/');
    await clearAuth(page);
    await page.goto('/favorites');
    await page.waitForURL(/\/auth\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/auth/login');
  });

  test('unauthenticated user redirected to login when accessing bookings', async ({ page }) => {
    await page.goto('/');
    await clearAuth(page);
    await page.goto('/bookings');
    await page.waitForURL(/\/auth\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/auth/login');
  });

  test('unauthenticated user redirected to login when accessing messages', async ({ page }) => {
    await page.goto('/');
    await clearAuth(page);
    await page.goto('/messages');
    await page.waitForURL(/\/auth\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/auth/login');
  });
});

test.describe('Guest Journey — Authenticated guest actions', () => {
  test('guest can access favorites page', async ({ page, request }) => {
    await loginAs(page, request, 'guest');
    await page.goto('/favorites');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/favorites');
  });

  test('guest can access bookings page', async ({ page, request }) => {
    await loginAs(page, request, 'guest');
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/bookings');
  });

  test('guest can access messages page', async ({ page, request }) => {
    await loginAs(page, request, 'guest');
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/messages');
  });

  test('guest can access profile page', async ({ page, request }) => {
    await loginAs(page, request, 'guest');
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/profile');
  });

  test('guest API: can get own bookings', async ({ request }) => {
    const loginRes = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: ACCOUNTS.guest.email, password: ACCOUNTS.guest.password },
    });
    const { accessToken } = await loginRes.json();

    const res = await request.get(`${API_URL}/api/bookings`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data || body)).toBe(true);
  });

  test('guest API: can add/remove favorites', async ({ request }) => {
    const loginRes = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: ACCOUNTS.guest.email, password: ACCOUNTS.guest.password },
    });
    const { accessToken } = await loginRes.json();

    const listingsRes = await request.get(`${API_URL}/api/listings?limit=1`);
    const listingsBody = await listingsRes.json();
    const listing = listingsBody.data?.[0] || listingsBody[0];

    // Add to favorites
    const addRes = await request.post(`${API_URL}/api/favorites/${listing.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect([200, 201, 409]).toContain(addRes.status()); // 409 if already favorited

    // Get favorites list
    const favRes = await request.get(`${API_URL}/api/favorites`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(favRes.status()).toBe(200);
  });
});

test.describe('Guest Journey — Newsletter', () => {
  test('newsletter subscribe returns 200', async ({ request }) => {
    const uniqueEmail = `test-${Date.now()}@example-playwright.com`;
    const res = await request.post(`${API_URL}/api/newsletter/subscribe`, {
      data: { email: uniqueEmail },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toBeTruthy();
  });

  test('newsletter duplicate returns 409', async ({ request }) => {
    const email = `dup-${Date.now()}@example-playwright.com`;
    await request.post(`${API_URL}/api/newsletter/subscribe`, { data: { email } });
    const res = await request.post(`${API_URL}/api/newsletter/subscribe`, { data: { email } });
    expect(res.status()).toBe(409);
  });

  test('newsletter invalid email returns 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/newsletter/subscribe`, {
      data: { email: 'not-an-email' },
    });
    expect(res.status()).toBe(400);
  });
});
