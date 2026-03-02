'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';

const publicLinks = [
  { href: '/listings', label: 'Каталог' },
  { href: '/top-hosts', label: 'Лучшие хосты' },
  { href: '/amenities', label: 'Удобства' },
];

const guestLinks = [
  { href: '/favorites', label: 'Избранное' },
  { href: '/saved-searches', label: 'Сохранённые поиски' },
  { href: '/bookings', label: 'Мои бронирования' },
  { href: '/notifications', label: 'Уведомления' },
  { href: '/messages', label: 'Сообщения' },
];

const hostLinks = [
  { href: '/host/dashboard', label: 'Панель хоста' },
  { href: '/host/listings', label: 'Мои объявления' },
  { href: '/host/listings/new', label: 'Создать объявление' },
  { href: '/host/bookings', label: 'Бронирования гостей' },
  { href: '/payments', label: 'Платежи' },
];

const adminLinks = [{ href: '/admin', label: 'Админ-панель' }];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = useMemo(() => {
    const first = user?.profile?.firstName?.[0] ?? '';
    const last = user?.profile?.lastName?.[0] ?? '';
    const fallback = user?.email?.slice(0, 2)?.toUpperCase() ?? 'ГО';
    const value = (first + last).trim();
    return value ? value.toUpperCase() : fallback;
  }, [user]);

  const secondaryLinks: { href: string; label: string }[] = [];
  if (isAuthenticated) {
    secondaryLinks.push(...guestLinks);
    if (user?.role === 'HOST' || user?.role === 'ADMIN') {
      secondaryLinks.push(...hostLinks);
    }
    if (user?.role === 'ADMIN') {
      secondaryLinks.push(...adminLinks);
    }
    secondaryLinks.push({ href: '/profile', label: 'Профиль' });
  }

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    setMobileOpen(false);
    router.push('/');
  };

  const roleLabel =
    user?.role === 'HOST' ? 'Хост' : user?.role === 'ADMIN' ? 'Админ' : 'Гость';

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-content-xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-pine-700">
          <span className="text-2xl text-pine-600">Милый дом</span>
        </Link>

        <nav className="hidden gap-6 text-sm font-medium text-slate-700 md:flex">
          {publicLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'transition-colors hover:text-pine-500',
                pathname.startsWith(link.href) && 'text-pine-600',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!isAuthenticated ? (
            <Fragment>
              <Link
                href="/auth/login"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-pine-400 hover:text-pine-500"
              >
                Войти
              </Link>
              <Link
                href="/auth/register"
                className="rounded-full bg-pine-600 px-5 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-pine-500"
              >
                Зарегистрироваться
              </Link>
            </Fragment>
          ) : (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-pine-400 hover:text-pine-500"
              >
                <span className="hidden text-right sm:block">
                  <span className="block text-xs text-slate-500">{roleLabel}</span>
                  <span className="block text-sm font-semibold">
                    {user?.profile?.firstName ?? user?.email}
                  </span>
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pine-600 text-sm font-semibold text-white">
                  {initials}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
                  <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto text-sm text-slate-700">
                    {secondaryLinks.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="block rounded-lg px-3 py-2 transition hover:bg-sand-100"
                          onClick={() => setMenuOpen(false)}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                      Выйти
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 p-2 text-slate-700 transition hover:border-pine-400 hover:text-pine-500 md:hidden"
          aria-label="Открыть меню"
        >
          <span className="sr-only">Меню</span>
          <svg className="h-6 w-6" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.5}>
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="mx-auto flex max-w-content-xl flex-col gap-2 px-6 py-4 text-sm font-medium text-slate-700">
            {publicLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-1 transition hover:text-pine-500"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!isAuthenticated ? (
              <Fragment>
                <Link href="/auth/login" className="py-1 transition hover:text-pine-500" onClick={() => setMobileOpen(false)}>
                  Войти
                </Link>
                <Link href="/auth/register" className="py-1 text-pine-600" onClick={() => setMobileOpen(false)}>
                  Зарегистрироваться
                </Link>
              </Fragment>
            ) : (
              <Fragment>
                {secondaryLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="py-1 transition hover:text-pine-500"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <button className="py-1 text-left text-rose-600" onClick={handleLogout}>
                  Выйти
                </button>
              </Fragment>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
