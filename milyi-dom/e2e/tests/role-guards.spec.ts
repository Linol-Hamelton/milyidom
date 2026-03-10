import { test, expect } from '@playwright/test';
import { loginAs, clearAuth, loginViaApi, setAuthInBrowser, ACCOUNTS } from '../fixtures/auth';

const API_URL = process.env.API_URL || 'https://api.milyidom.com';

// ── Frontend role-based access ────────────────────────────────────────────────

test.describe('Role guards — GUEST cannot access HOST routes', () => {
  const hostOnlyRoutes = [
    '/host/dashboard',
    '/host/listings',
    '/host/listings/new',
    '/host/bookings',
  ];

  for (const route of hostOnlyRoutes) {
    test(`GUEST is redirected from ${route}`, async ({ page, request }) => {
      await loginAs(page, request, 'guest');
      await page.goto(route);
      // Wait for Next.js client-side redirect to complete
      await page.waitForURL((url) => !url.toString().includes(route), { timeout: 15_000 });
      expect(page.url()).not.toContain(route);
    });
  }
});

test.describe('Role guards — GUEST cannot access ADMIN routes', () => {
  const adminRoutes = ['/admin', '/admin/users', '/admin/listings', '/admin/analytics'];

  for (const route of adminRoutes) {
    test(`GUEST is redirected from ${route}`, async ({ page, request }) => {
      await loginAs(page, request, 'guest');
      await page.goto(route);
      await page.waitForURL((url) => !url.toString().includes(route), { timeout: 15_000 });
      expect(page.url()).not.toContain(route);
    });
  }
});

test.describe('Role guards — HOST cannot access ADMIN routes', () => {
  const adminRoutes = ['/admin', '/admin/users', '/admin/listings'];

  for (const route of adminRoutes) {
    test(`HOST is redirected from ${route}`, async ({ page, request }) => {
      await loginAs(page, request, 'host');
      await page.goto(route);
      await page.waitForURL((url) => !url.toString().includes(route), { timeout: 15_000 });
      expect(page.url()).not.toContain(route);
    });
  }
});

test.describe('Role guards — HOST can access HOST routes', () => {
  const hostRoutes = ['/host/dashboard', '/host/listings', '/host/bookings'];

  for (const route of hostRoutes) {
    test(`HOST can access ${route}`, async ({ page, request }) => {
      await loginAs(page, request, 'host');
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      expect(page.url()).toContain(route);
    });
  }
});

test.describe('Role guards — ADMIN can access all routes', () => {
  test('ADMIN can access /admin', async ({ page, request }) => {
    await loginAs(page, request, 'admin');
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('/admin');
  });

  test('ADMIN can access /host/listings (admin has host role access)', async ({ page, request }) => {
    await loginAs(page, request, 'admin');
    await page.goto('/host/listings');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('/host/listings');
  });
});

test.describe('Role guards — any authenticated user can access shared routes', () => {
  const sharedRoutes = ['/messages', '/favorites', '/bookings', '/profile', '/notifications'];

  for (const role of ['guest', 'host'] as const) {
    for (const route of sharedRoutes) {
      test(`${role.toUpperCase()} can access ${route}`, async ({ page, request }) => {
        await loginAs(page, request, role);
        await page.goto(route);
        await page.waitForLoadState('domcontentloaded');
        expect(page.url()).toContain(route);
      });
    }
  }
});

// ── Backend API role-based access ─────────────────────────────────────────────

test.describe('API role guards — ADMIN-only endpoints', () => {
  test('GUEST cannot access GET /api/admin/users (403)', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.guest.email, ACCOUNTS.guest.password);

    const res = await request.get(`${API_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('HOST cannot access GET /api/admin/users (403)', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.host.email, ACCOUNTS.host.password);

    const res = await request.get(`${API_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('ADMIN can access GET /api/admin/users (200)', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.admin.email, ACCOUNTS.admin.password);

    const res = await request.get(`${API_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
  });
});

test.describe('API role guards — HOST-only endpoints', () => {
  test('GUEST cannot access GET /api/bookings/host (403)', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.guest.email, ACCOUNTS.guest.password);

    const res = await request.get(`${API_URL}/api/bookings/host`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('HOST can access GET /api/bookings/host (200)', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.host.email, ACCOUNTS.host.password);

    const res = await request.get(`${API_URL}/api/bookings/host`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
  });
});

test.describe('API role guards — unauthenticated access', () => {
  test('no token returns 401 for protected endpoints', async ({ request }) => {
    const endpoints = [
      `${API_URL}/api/users/me`,
      `${API_URL}/api/bookings/host`,
      `${API_URL}/api/admin/users`,
    ];

    for (const endpoint of endpoints) {
      const res = await request.get(endpoint);
      expect([401, 403]).toContain(res.status());
    }
  });

  test('public endpoints accessible without token', async ({ request }) => {
    const publicEndpoints = [
      `${API_URL}/api/health`,
      `${API_URL}/api/listings`,
    ];

    for (const endpoint of publicEndpoints) {
      const res = await request.get(endpoint);
      expect(res.status()).toBe(200);
    }
  });
});
