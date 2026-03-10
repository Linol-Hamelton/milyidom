import { APIRequestContext, Page } from '@playwright/test';

const API_URL = process.env.API_URL || 'https://api.milyidom.com';

export const ACCOUNTS = {
  guest: { email: 'guest@example.com', password: 'password123', role: 'GUEST' },
  host: { email: 'host@example.com', password: 'password123', role: 'HOST' },
  admin: { email: 'admin@example.com', password: 'password123', role: 'ADMIN' },
};

// In-process token cache — one login per role per test worker run
// Tokens are valid for the JWT expiry window (typically 15min+), safe to reuse
const tokenCache = new Map<string, { accessToken: string; user: Record<string, unknown> }>();

export async function loginViaApi(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<{ accessToken: string; user: Record<string, unknown> }> {
  const cached = tokenCache.get(email);
  if (cached) return cached;

  const res = await request.post(`${API_URL}/api/auth/login`, {
    data: { email, password },
  });
  if (!res.ok()) {
    throw new Error(`Login failed for ${email}: ${res.status()} ${await res.text()}`);
  }
  const result = await res.json() as { accessToken: string; user: Record<string, unknown> };
  tokenCache.set(email, result);
  return result;
}

export async function setAuthInBrowser(
  page: Page,
  accessToken: string,
  user: Record<string, unknown>,
): Promise<void> {
  await page.evaluate(
    ({ token, userData }) => {
      localStorage.setItem(
        'milyi-dom-auth',
        JSON.stringify({ user: userData, accessToken: token, refreshToken: '' }),
      );
    },
    { token: accessToken, userData: user },
  );
}

export async function loginAs(
  page: Page,
  request: APIRequestContext,
  role: keyof typeof ACCOUNTS,
): Promise<void> {
  const account = ACCOUNTS[role];
  const { accessToken, user } = await loginViaApi(request, account.email, account.password);
  await page.goto('/');
  await setAuthInBrowser(page, accessToken, user);
}

export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.removeItem('milyi-dom-auth'));
}
