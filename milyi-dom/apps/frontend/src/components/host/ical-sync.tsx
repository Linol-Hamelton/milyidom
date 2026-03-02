'use client';

import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { getSyncUrls, syncExternalCalendar, removeSyncUrl, getIcalFeedUrl } from '../../services/ical';
import { parseError } from '../../lib/api-client';

interface IcalSyncProps {
  listingId: string;
  icalToken?: string;
}

export function IcalSync({ listingId, icalToken }: IcalSyncProps) {
  const [syncUrls, setSyncUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const feedUrl = icalToken ? getIcalFeedUrl(icalToken) : '';

  useEffect(() => {
    setLoading(true);
    getSyncUrls(listingId)
      .then(setSyncUrls)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [listingId]);

  const handleAddSync = async () => {
    if (!newUrl.trim()) return;
    setSyncing(true);
    setError('');
    setSuccess('');
    try {
      const result = await syncExternalCalendar(listingId, newUrl.trim());
      setSyncUrls((prev) => (prev.includes(newUrl.trim()) ? prev : [...prev, newUrl.trim()]));
      setSuccess(`Синхронизировано: добавлено ${result.added} заблокированных дат`);
      setNewUrl('');
    } catch (err) {
      setError(parseError(err).message);
    } finally {
      setSyncing(false);
    }
  };

  const handleRemove = async (url: string) => {
    try {
      await removeSyncUrl(listingId, url);
      setSyncUrls((prev) => prev.filter((u) => u !== url));
    } catch (err) {
      setError(parseError(err).message);
    }
  };

  const handleCopy = () => {
    if (!feedUrl) return;
    void navigator.clipboard.writeText(feedUrl);
    setSuccess('Ссылка скопирована в буфер обмена');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Export: our iCal feed */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">📤 Экспорт календаря</h3>
        <p className="mt-1 text-xs text-slate-500">
          Поделитесь этой ссылкой с Airbnb, VRBO или Google Calendar, чтобы они видели ваши
          бронирования.
        </p>
        {feedUrl ? (
          <div className="mt-3 flex gap-2">
            <input
              readOnly
              value={feedUrl}
              className="flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
            />
            <Button size="sm" variant="secondary" onClick={handleCopy}>
              Копировать
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400">
            iCal токен недоступен. Откройте объявление для получения ссылки.
          </p>
        )}
      </div>

      {/* Import: external iCal URLs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-800">📥 Синхронизация с внешними календарями</h3>
        <p className="mt-1 text-xs text-slate-500">
          Добавьте ссылку iCal из Airbnb или VRBO — мы автоматически заблокируем занятые даты.
        </p>

        <div className="mt-3 flex gap-2">
          <Input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://example.com/calendar/ical/your-feed.ics"
            className="flex-1 text-xs"
            disabled={syncing}
          />
          <Button size="sm" onClick={handleAddSync} isLoading={syncing} disabled={!newUrl.trim()}>
            Синхронизировать
          </Button>
        </div>

        {success && (
          <p className="mt-2 text-xs text-pine-600">{success}</p>
        )}
        {error && (
          <p className="mt-2 text-xs text-rose-600">{error}</p>
        )}

        {loading ? (
          <p className="mt-4 text-xs text-slate-400">Загрузка...</p>
        ) : syncUrls.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-slate-600">Подключённые календари:</p>
            {syncUrls.map((url) => (
              <div key={url} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <span className="flex-1 truncate text-xs text-slate-600">{url}</span>
                <button
                  onClick={() => handleRemove(url)}
                  className="shrink-0 text-xs text-rose-500 hover:text-rose-700"
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-400">Нет подключённых внешних календарей.</p>
        )}
      </div>
    </div>
  );
}
