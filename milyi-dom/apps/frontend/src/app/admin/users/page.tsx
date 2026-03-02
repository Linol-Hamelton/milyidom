"use client";

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Skeleton } from '../../../components/ui/skeleton';
import { Button } from '../../../components/ui/button';
import { fetchAdminUsers, changeUserRole, blockUser } from '../../../services/admin';
import { parseError } from '../../../lib/api-client';
import type { User, Role, PaginatedResponse } from '../../../types/api';

const ROLES: Role[] = ['GUEST', 'HOST', 'ADMIN'];

export default function AdminUsersPage() {
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [blockedFilter, setBlockedFilter] = useState<'' | 'true' | 'false'>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminUsers({
        page,
        limit: 20,
        search: search || undefined,
        role: roleFilter || undefined,
        blocked: blockedFilter === '' ? undefined : blockedFilter === 'true',
      });
      setData(result);
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, blockedFilter]);

  useEffect(() => { void load(); }, [load]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleRoleChange = async (userId: string, role: Role) => {
    try {
      await changeUserRole(userId, role);
      toast.success('Роль обновлена');
      void load();
    } catch (err) {
      toast.error(parseError(err).message);
    }
  };

  const handleBlock = async (user: User) => {
    const nowBlocked = !user.blockedAt;
    try {
      await blockUser(user.id, nowBlocked);
      toast.success(nowBlocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
      void load();
    } catch (err) {
      toast.error(parseError(err).message);
    }
  };

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 1;

  return (
    <div className="p-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Администратор / Пользователи</p>
        <h1 className="mt-1 text-2xl font-serif font-semibold text-slate-900">Управление пользователями</h1>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-sand-200 bg-white px-3 py-2 shadow-soft">
          <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-52 bg-transparent text-sm outline-none"
          />
          <Button variant="ghost" onClick={handleSearch} className="px-2 py-0.5 text-xs">
            Найти
          </Button>
        </div>

        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value as Role | ''); setPage(1); }}
          className="rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm shadow-soft outline-none"
        >
          <option value="">Все роли</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <select
          value={blockedFilter}
          onChange={(e) => { setBlockedFilter(e.target.value as '' | 'true' | 'false'); setPage(1); }}
          className="rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm shadow-soft outline-none"
        >
          <option value="">Все статусы</option>
          <option value="false">Активные</option>
          <option value="true">Заблокированные</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Пользователь</th>
              <th className="px-4 py-3">Роль</th>
              <th className="px-4 py-3">Объявл. / Брон.</th>
              <th className="px-4 py-3">Верифицирован</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-sand-50">
                    <td colSpan={6} className="px-4 py-3">
                      <Skeleton className="h-5 w-full rounded" />
                    </td>
                  </tr>
                ))
              : data?.items.map((user) => (
                  <tr key={user.id} className="border-b border-sand-50 hover:bg-sand-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {user.profile?.firstName} {user.profile?.lastName}
                      </p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                        className="rounded-lg border border-sand-200 bg-white px-2 py-1 text-xs outline-none"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {user._count?.listings ?? '–'} / {user._count?.bookings ?? '–'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.isVerified ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {user.isVerified ? 'Да' : 'Нет'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.blockedAt ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                      }`}>
                        {user.blockedAt ? 'Заблокирован' : 'Активен'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        onClick={() => handleBlock(user)}
                        className={`text-xs px-2 py-1 ${user.blockedAt ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {user.blockedAt ? 'Разблокировать' : 'Заблокировать'}
                      </Button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            {data.meta.total} пользователей — стр. {page} из {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 text-xs">
              Назад
            </Button>
            <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 text-xs">
              Вперёд
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
