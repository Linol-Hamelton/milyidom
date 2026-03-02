'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { getBlockedDatesDetailed, blockDates, unblockDates } from '../../services/ical';
import { fetchHostBookings } from '../../services/bookings';
import { parseError } from '../../lib/api-client';

interface Props {
  listingId: string;
}

type BlockSource = 'manual' | 'ical_sync' | 'booking';

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addMonths(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  return d;
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function AvailabilityCalendar({ listingId }: Props) {
  const today = new Date();
  const todayStr = formatDate(today);

  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  // dateMap: YYYY-MM-DD → source
  const [dateMap, setDateMap] = useState<Map<string, BlockSource>>(new Map());
  // pendingBlock: free dates selected to be blocked
  const [pendingBlock, setPendingBlock] = useState<Set<string>>(new Set());
  // pendingUnblock: manual-blocked dates selected to be unblocked
  const [pendingUnblock, setPendingUnblock] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [blocked, hostBookings] = await Promise.all([
        getBlockedDatesDetailed(listingId),
        fetchHostBookings({ limit: 200 }),
      ]);

      const map = new Map<string, BlockSource>();

      // Expand confirmed/completed booking ranges for this listing
      for (const booking of hostBookings.items) {
        if (booking.listingId !== listingId) continue;
        if (booking.status !== 'CONFIRMED' && booking.status !== 'COMPLETED') continue;
        const start = new Date(booking.checkIn);
        const end = new Date(booking.checkOut);
        const cur = new Date(start);
        while (cur < end) {
          map.set(formatDate(cur), 'booking');
          cur.setDate(cur.getDate() + 1);
        }
      }

      // Blocked dates (manual / ical_sync) — don't overwrite booking entries
      for (const { date, source } of blocked) {
        if (!map.has(date)) map.set(date, source as BlockSource);
      }

      setDateMap(map);
      setPendingBlock(new Set());
      setPendingUnblock(new Set());
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => { void load(); }, [load]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = getDaysInMonth(year, month);
  const firstDayOfWeek = (days[0].getDay() + 6) % 7; // Mon=0
  const leadingBlanks = Array.from({ length: firstDayOfWeek });

  const handleDayClick = (dateStr: string) => {
    if (dateStr < todayStr) return; // past
    const source = dateMap.get(dateStr);
    if (source === 'booking' || source === 'ical_sync') return; // read-only

    if (source === 'manual') {
      setPendingUnblock((prev) => {
        const next = new Set(prev);
        if (next.has(dateStr)) next.delete(dateStr); else next.add(dateStr);
        return next;
      });
    } else {
      // free date
      setPendingBlock((prev) => {
        const next = new Set(prev);
        if (next.has(dateStr)) next.delete(dateStr); else next.add(dateStr);
        return next;
      });
    }
  };

  const handleSaveBlock = async () => {
    if (pendingBlock.size === 0) return;
    setSaving(true);
    try {
      await blockDates(listingId, Array.from(pendingBlock));
      toast.success(`Заблокировано дат: ${pendingBlock.size}`);
      await load();
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUnblock = async () => {
    if (pendingUnblock.size === 0) return;
    setSaving(true);
    try {
      await unblockDates(listingId, Array.from(pendingUnblock));
      toast.success(`Разблокировано дат: ${pendingUnblock.size}`);
      await load();
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const getDayClass = (dateStr: string): string => {
    const isPast = dateStr < todayStr;
    const source = dateMap.get(dateStr);
    const base = 'h-9 rounded-lg text-sm transition-colors';

    if (pendingUnblock.has(dateStr)) return `${base} bg-amber-100 text-amber-700 line-through cursor-pointer`;
    if (pendingBlock.has(dateStr)) return `${base} border-2 border-amber-400 bg-amber-50 text-amber-800 font-semibold cursor-pointer`;
    if (isPast) return `${base} text-slate-300 cursor-default`;
    if (source === 'booking') return `${base} bg-rose-100 text-rose-700 cursor-default`;
    if (source === 'manual') return `${base} bg-amber-400 text-white font-medium cursor-pointer hover:bg-amber-500`;
    if (source === 'ical_sync') return `${base} bg-slate-200 text-slate-500 cursor-default`;
    return `${base} text-slate-900 hover:bg-sand-100 cursor-pointer`;
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-soft">
      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setViewDate((d) => addMonths(d, -1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-sand-100 transition-colors"
          aria-label="Предыдущий месяц"
        >
          <ChevronLeftIcon className="h-4 w-4 text-slate-600" />
        </button>
        <h3 className="text-base font-semibold text-slate-900 capitalize">
          {viewDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          onClick={() => setViewDate((d) => addMonths(d, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-sand-100 transition-colors"
          aria-label="Следующий месяц"
        >
          <ChevronRightIcon className="h-4 w-4 text-slate-600" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
          <div key={d} className="py-1 text-xs font-medium text-slate-400">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-sand-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {leadingBlanks.map((_, i) => <div key={`blank-${i}`} />)}
          {days.map((day) => {
            const dateStr = formatDate(day);
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDayClick(dateStr)}
                className={getDayClass(dateStr)}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      )}

      {/* Action buttons — appear only when there are pending changes */}
      {(pendingBlock.size > 0 || pendingUnblock.size > 0) && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {pendingBlock.size > 0 && (
            <button
              onClick={handleSaveBlock}
              disabled={saving}
              className="rounded-xl bg-pine-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pine-700 disabled:opacity-50"
            >
              {saving ? 'Сохранение…' : `Заблокировать (${pendingBlock.size})`}
            </button>
          )}
          {pendingUnblock.size > 0 && (
            <button
              onClick={handleSaveUnblock}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {saving ? 'Сохранение…' : `Разблокировать (${pendingUnblock.size})`}
            </button>
          )}
          <button
            onClick={() => { setPendingBlock(new Set()); setPendingUnblock(new Set()); }}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Сбросить выбор
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-rose-100" /> Забронировано
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-amber-400" /> Закрыто вручную
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-slate-200" /> Закрыто через iCal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border-2 border-amber-400 bg-amber-50" /> Выбрано для блокировки
        </span>
      </div>
    </div>
  );
}
