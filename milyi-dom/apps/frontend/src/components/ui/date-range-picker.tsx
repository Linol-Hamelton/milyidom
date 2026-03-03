'use client';

import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isValid, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import clsx from 'clsx';
import 'react-day-picker/style.css';

type DateRange = { from: Date | undefined; to: Date | undefined };

interface DateRangePickerProps {
  checkIn?: string;
  checkOut?: string;
  onChange: (checkIn: string | undefined, checkOut: string | undefined) => void;
  /** Layout variant: 'columns' renders two separate labeled cells, 'inline' renders in one row */
  variant?: 'columns' | 'inline';
  className?: string;
}

function fromStr(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = parseISO(s);
  return isValid(d) ? d : undefined;
}

function toStr(d: Date | undefined): string | undefined {
  return d ? format(d, 'yyyy-MM-dd') : undefined;
}

function fmtDisplay(d: Date | undefined): string {
  return d ? format(d, 'd MMM', { locale: ru }) : '';
}

/** pine-600 = #3d6b4f (approximate from Tailwind config) */
const RDP_STYLE = {
  '--rdp-accent-color': '#3f6456',
  '--rdp-accent-color-dark': '#2d4d40',
  '--rdp-selected-border': '1px solid #3f6456',
} as React.CSSProperties;

export function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
  variant = 'columns',
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected: DateRange = {
    from: fromStr(checkIn),
    to: fromStr(checkOut),
  };

  const handleSelect = (range: DateRange | undefined) => {
    const from = range?.from;
    const to = range?.to;
    onChange(toStr(from), toStr(to));
    if (from && to) setOpen(false);
  };

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (open && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const checkInDisplay = checkIn ? fmtDisplay(fromStr(checkIn)) : null;
  const checkOutDisplay = checkOut ? fmtDisplay(fromStr(checkOut)) : null;

  if (variant === 'inline') {
    return (
      <div ref={containerRef} className={clsx('relative', className)}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-sm text-slate-700 focus:outline-none"
        >
          <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <span className={checkInDisplay ? 'text-slate-800' : 'text-slate-400'}>
            {checkInDisplay ?? 'Заезд'}
          </span>
          <span className="text-slate-300">–</span>
          <span className={checkOutDisplay ? 'text-slate-800' : 'text-slate-400'}>
            {checkOutDisplay ?? 'Выезд'}
          </span>
        </button>
        <CalendarPopup
          open={open}
          selected={selected}
          today={today}
          onSelect={handleSelect}
          onReset={() => onChange(undefined, undefined)}
          onClose={() => setOpen(false)}
          hasValue={Boolean(checkIn || checkOut)}
        />
      </div>
    );
  }

  // columns variant: two separate trigger cells
  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      <div className="flex gap-px">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-col p-0 text-left focus:outline-none"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Заезд</span>
          <span className={clsx('text-sm', checkInDisplay ? 'text-slate-800' : 'text-slate-400')}>
            {checkInDisplay ?? 'Добавить дату'}
          </span>
        </button>
        <span className="mx-2 self-end pb-0.5 text-slate-300">–</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-col p-0 text-left focus:outline-none"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Выезд</span>
          <span className={clsx('text-sm', checkOutDisplay ? 'text-slate-800' : 'text-slate-400')}>
            {checkOutDisplay ?? 'Добавить дату'}
          </span>
        </button>
      </div>
      <CalendarPopup
        open={open}
        selected={selected}
        today={today}
        onSelect={handleSelect}
        onReset={() => onChange(undefined, undefined)}
        onClose={() => setOpen(false)}
        hasValue={Boolean(checkIn || checkOut)}
      />
    </div>
  );
}

function CalendarPopup({
  open,
  selected,
  today,
  onSelect,
  onReset,
  onClose,
  hasValue,
}: {
  open: boolean;
  selected: DateRange;
  today: Date;
  onSelect: (r: DateRange | undefined) => void;
  onReset: () => void;
  onClose: () => void;
  hasValue: boolean;
}) {
  if (!open) return null;

  return (
    <div className="absolute left-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <DayPicker
        mode="range"
        selected={selected}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSelect={onSelect as any}
        numberOfMonths={2}
        locale={ru}
        disabled={{ before: today }}
        showOutsideDays={false}
        style={RDP_STYLE}
        classNames={{
          root: 'p-4',
        }}
      />
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
        <button
          type="button"
          onClick={onReset}
          className={clsx(
            'text-sm underline transition',
            hasValue ? 'text-slate-600 hover:text-slate-900' : 'cursor-default text-slate-300',
          )}
          disabled={!hasValue}
        >
          Сбросить даты
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-pine-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-pine-500"
        >
          Готово
        </button>
      </div>
    </div>
  );
}
