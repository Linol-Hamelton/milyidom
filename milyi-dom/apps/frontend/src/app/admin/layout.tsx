"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  UsersIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { RequireAuth } from '../../components/ui/require-auth';

const navItems = [
  { href: '/admin', label: 'Главная', icon: HomeIcon, exact: true },
  { href: '/admin/users', label: 'Пользователи', icon: UsersIcon, exact: false },
  { href: '/admin/listings', label: 'Объявления', icon: ClipboardDocumentListIcon, exact: false },
  { href: '/admin/analytics', label: 'Аналитика', icon: ChartBarIcon, exact: false },
  { href: '/admin/reviews', label: 'Отзывы', icon: ChatBubbleLeftRightIcon, exact: false },
  { href: '/admin/disputes', label: 'Споры', icon: ExclamationTriangleIcon, exact: false },
  { href: '/admin/audit-log', label: 'Журнал действий', icon: ShieldCheckIcon, exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <RequireAuth roles={['ADMIN']}>
      <div className="flex min-h-screen bg-sand-50">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-sand-200 bg-white px-4 py-8">
          <p className="mb-6 px-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Панель администратора
          </p>
          <nav className="flex flex-col gap-1">
            {navItems.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-pine-50 text-pine-700'
                      : 'text-slate-600 hover:bg-sand-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </RequireAuth>
  );
}
