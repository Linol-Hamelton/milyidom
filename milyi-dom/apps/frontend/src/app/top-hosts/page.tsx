"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { fetchTopHosts } from '../../services/users';
import type { User } from '../../types/api';
import { parseError } from '../../lib/api-client';
import { Skeleton } from '../../components/ui/skeleton';

export default function TopHostsPage() {
  const [hosts, setHosts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchTopHosts(12);
        setHosts(data);
      } catch (error) {
        const { message } = parseError(error);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="bg-sand-50 py-12">
      <div className="mx-auto max-w-content-xl px-6 lg:px-10">
        <header className="max-w-3xl space-y-3">
          <p className="text-sm uppercase tracking-wide text-pine-600">Сообщество</p>
          <h1 className="text-3xl font-serif text-slate-900">Лучшие хосты Милого Дома</h1>
          <p className="text-sm text-slate-600">
            Эти люди создают особенную атмосферу и получают наивысшие оценки гостей. Мы отобрали их по рейтингу,
            скорости ответа и уровню сервиса.
          </p>
        </header>

        {loading ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-48 rounded-3xl" />
            ))}
          </div>
        ) : hosts.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-pine-200 bg-white p-10 text-center">
            <h2 className="text-lg font-semibold text-slate-900">Пока нет данных о топ-хостах</h2>
            <p className="mt-2 text-sm text-slate-500">Мы обновим список сразу после первых завершённых поездок.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hosts.map((host) => (
              <article key={host.id} className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 overflow-hidden rounded-full bg-pine-50">
                    {host.profile?.avatarUrl ? (
                      <Image src={host.profile.avatarUrl} alt={host.profile.firstName ?? host.email} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-pine-600">
                        {host.profile?.firstName?.[0]?.toUpperCase() ?? host.email[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {host.profile?.firstName ?? host.email}
                    </h3>
                    <p className="text-xs text-slate-500">{host.profile?.languages?.join(', ') ?? 'языки не указаны'}</p>
                  </div>
                </div>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>Статус: {host.isSuperhost ? 'Суперхост' : 'Хост'}</li>
                  <li>Подтверждён: {host.isVerified ? 'да' : 'нет'}</li>
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
