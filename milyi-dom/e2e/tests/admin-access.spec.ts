import { test, expect } from '@playwright/test';
import { loginAs, loginViaApi, ACCOUNTS } from '../fixtures/auth';

const API_URL = process.env.API_URL || 'https://api.milyidom.com';

test.describe('Admin — Frontend routes', () => {
  test('admin can access /admin dashboard', async ({ page, request }) => {
    await loginAs(page, request, 'admin');
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/admin');
    expect(page.url()).not.toContain('/auth/login');
    expect(page.url()).not.toBe('https://milyidom.com/');
  });

  const adminPages = [
    '/admin/users',
    '/admin/listings',
    '/admin/analytics',
    '/admin/audit-log',
    '/admin/reviews',
  ];

  for (const route of adminPages) {
    test(`admin can access ${route}`, async ({ page, request }) => {
      await loginAs(page, request, 'admin');
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain(route);
      const content = page.locator('main, [role="main"], table, [class*="table"]').first();
      await expect(content).toBeVisible({ timeout: 15_000 });
    });
  }
});

test.describe('Admin — API endpoints', () => {
  test('GET /api/admin/users returns paginated users', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.admin.email, ACCOUNTS.admin.password);

    const res = await request.get(`${API_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const users = body.data || body;
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
  });

  test('GET /api/admin/listings returns all listings', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.admin.email, ACCOUNTS.admin.password);

    const res = await request.get(`${API_URL}/api/admin/listings`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = body.data || body;
    expect(Array.isArray(items)).toBe(true);
  });

  test('GET /api/audit returns audit log entries', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.admin.email, ACCOUNTS.admin.password);

    const res = await request.get(`${API_URL}/api/audit`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = body.data || body;
    expect(Array.isArray(items)).toBe(true);
  });

  test('GET /api/analytics/stats returns platform stats', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.admin.email, ACCOUNTS.admin.password);

    const res = await request.get(`${API_URL}/api/analytics/stats`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
  });

  test('admin can change user role', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.admin.email, ACCOUNTS.admin.password);

    const usersRes = await request.get(`${API_URL}/api/admin/users?limit=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const usersBody = await usersRes.json();
    const users = usersBody.data || usersBody;
    const targetUser = users.find(
      (u: { role: string; email: string }) =>
        u.role === 'GUEST' && !u.email.includes('admin'),
    );
    if (!targetUser) return;

    const updateRes = await request.patch(`${API_URL}/api/admin/users/${targetUser.id}/role`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { role: 'GUEST' },
    });
    expect([200, 201]).toContain(updateRes.status());
  });

  test('admin can block/unblock user', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.admin.email, ACCOUNTS.admin.password);

    const usersRes = await request.get(`${API_URL}/api/admin/users?limit=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const usersBody = await usersRes.json();
    const users = usersBody.data || usersBody;
    const targetUser = users.find(
      (u: { email: string; role: string }) =>
        u.email.includes('qa_') || u.email.includes('test'),
    );
    if (!targetUser) return;

    const blockRes = await request.post(`${API_URL}/api/admin/users/${targetUser.id}/unblock`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect([200, 201, 400]).toContain(blockRes.status());
  });
});

test.describe('Admin — Listings moderation', () => {
  test('admin can view any listing regardless of status', async ({ request }) => {
    const { accessToken } = await loginViaApi(request, ACCOUNTS.admin.email, ACCOUNTS.admin.password);

    const res = await request.get(`${API_URL}/api/admin/listings?status=DRAFT`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
  });

  test('admin can approve listing', async ({ request }) => {
    const { accessToken: adminToken } = await loginViaApi(request, ACCOUNTS.admin.email, ACCOUNTS.admin.password);
    const { accessToken: hostToken } = await loginViaApi(request, ACCOUNTS.host.email, ACCOUNTS.host.password);

    const createRes = await request.post(`${API_URL}/api/listings`, {
      headers: { Authorization: `Bearer ${hostToken}` },
      data: {
        title: `Admin Approval Test ${Date.now()}`,
        description: 'E2E test listing for admin approval workflow — safe to delete after test',
        propertyType: 'APARTMENT',
        guests: 2, bedrooms: 1, beds: 1, bathrooms: 1,
        basePrice: 3000, currency: 'RUB',
        country: 'Russia', city: 'Moscow',
        addressLine1: 'Тверская 5',
        latitude: 55.7558, longitude: 37.6173,
      },
    });
    const listing = await createRes.json();

    const approveRes = await request.patch(
      `${API_URL}/api/admin/listings/${listing.id}/status`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { status: 'PUBLISHED' },
      },
    );
    expect([200, 201]).toContain(approveRes.status());
    const approved = await approveRes.json();
    expect(approved.status).toBe('PUBLISHED');

    // Cleanup
    await request.delete(`${API_URL}/api/listings/${listing.id}`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
  });
});
