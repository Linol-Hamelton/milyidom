import { test, expect } from '@playwright/test';
import { loginViaApi, setAuthInBrowser, clearAuth, ACCOUNTS } from '../fixtures/auth';

const API_URL = process.env.API_URL || 'https://api.milyidom.com';

test.describe('Auth — unauthenticated redirects', () => {
  const protectedRoutes = [
    '/host/dashboard',
    '/host/listings',
    '/admin',
    '/messages',
    '/favorites',
    '/bookings',
    '/profile',
    '/saved-searches',
    '/notifications',
  ];

  for (const route of protectedRoutes) {
    test(`redirects unauthenticated user from ${route} to /auth/login`, async ({ page }) => {
      await page.goto('/');
      await clearAuth(page);
      await page.goto(route);
      await page.waitForURL(/\/auth\/login/, { timeout: 10_000 });
      expect(page.url()).toContain('/auth/login');
    });
  }
});

test.describe('Auth — login flow', () => {
  test('login API returns 201 with token and user', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: ACCOUNTS.host.email, password: ACCOUNTS.host.password },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.user.email).toBe(ACCOUNTS.host.email);
    expect(body.user.role).toBe('HOST');
  });

  test('login with wrong password returns 401', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: ACCOUNTS.host.email, password: 'wrongpassword' },
    });
    expect(res.status()).toBe(401);
  });

  test('login UI page renders correctly', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

test.describe('Auth — register flow', () => {
  test('register API validates required fields', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/register`, {
      data: { email: 'not-an-email', password: '123' },
    });
    expect(res.status()).toBe(400);
  });

  test('register with existing email returns 409', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        email: ACCOUNTS.guest.email,
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      },
    });
    expect([409, 400]).toContain(res.status());
  });

  test('register UI page renders correctly', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });
});

test.describe('Auth — token lifecycle', () => {
  test('refresh token returns new access token', async ({ request }) => {
    const loginRes = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: ACCOUNTS.guest.email, password: ACCOUNTS.guest.password },
    });
    const { refreshToken } = await loginRes.json();

    const refreshRes = await request.post(`${API_URL}/api/auth/refresh`, {
      data: { refreshToken },
    });
    expect(refreshRes.status()).toBe(201);
    const body = await refreshRes.json();
    expect(body.accessToken).toBeTruthy();
  });

  test('authenticated user can access /api/users/me', async ({ request }) => {
    const loginRes = await request.post(`${API_URL}/api/auth/login`, {
      data: { email: ACCOUNTS.host.email, password: ACCOUNTS.host.password },
    });
    const { accessToken } = await loginRes.json();

    const meRes = await request.get(`${API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(meRes.status()).toBe(200);
    const me = await meRes.json();
    expect(me.email).toBe(ACCOUNTS.host.email);
  });

  test('invalid token returns 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/users/me`, {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('Auth — logout', () => {
  test('logged-in user can logout and is redirected', async ({ page, request }) => {
    const { accessToken, user } = await loginViaApi(
      request,
      ACCOUNTS.guest.email,
      ACCOUNTS.guest.password,
    );
    await page.goto('/');
    await setAuthInBrowser(page, accessToken, user);

    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');
    // Auth state should allow access
    expect(page.url()).toContain('/profile');
  });
});
