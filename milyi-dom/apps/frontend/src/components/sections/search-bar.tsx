"use client";

import { useState } from 'react';

export default function SearchBar() {
  const [guests, setGuests] = useState(2);

  return (
    <form className="glass-panel -mt-12 rounded-3xl px-6 py-6 shadow-soft sm:px-10">
      <div className="grid gap-4 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
          Локация
          <input
            type="text"
            placeholder="Город, район или страна"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-800 outline-none ring-pine-200 transition focus:border-pine-400 focus:ring"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
          Даты
          <input
            type="text"
            placeholder="Когда планируете поездку?"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-800 outline-none ring-pine-200 transition focus:border-pine-400 focus:ring"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
          Гостей
          <input
            type="number"
            min={1}
            value={guests}
            onChange={(event) => setGuests(Math.max(1, Number(event.target.value)))}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-800 outline-none ring-pine-200 transition focus:border-pine-400 focus:ring"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-2xl bg-pine-600 px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-pine-500"
        >
          Найти жильё
        </button>
      </div>
    </form>
  );
}
