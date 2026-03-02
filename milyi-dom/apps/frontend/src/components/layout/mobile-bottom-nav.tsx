'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useAuth } from '../../hooks/useAuth';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const tabs = [
    {
      href: '/',
      label: 'Главная',
      icon: (active: boolean) => (
        <svg className={clsx('h-6 w-6', active ? 'text-pine-600' : 'text-slate-500')} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.5 1.5 0 012.092 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      href: '/listings',
      label: 'Поиск',
      icon: (active: boolean) => (
        <svg className={clsx('h-6 w-6', active ? 'text-pine-600' : 'text-slate-500')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      href: '/favorites',
      label: 'Избранное',
      icon: (active: boolean) => (
        <svg className={clsx('h-6 w-6', active ? 'text-pine-600' : 'text-slate-500')} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      ),
    },
    {
      href: isAuthenticated ? '/profile' : '/auth/login',
      label: 'Профиль',
      icon: (active: boolean) => (
        <svg className={clsx('h-6 w-6', active ? 'text-pine-600' : 'text-slate-500')} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur-md md:hidden">
      <div className="grid grid-cols-4">
        {tabs.map((tab) => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium"
            >
              {tab.icon(active)}
              <span className={clsx(active ? 'text-pine-600' : 'text-slate-500')}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
