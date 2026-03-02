'use client';

import Link from 'next/link';

const categories = [
  { value: 'apartment', label: 'Квартиры', icon: '🏢' },
  { value: 'studio', label: 'Студии', icon: '🛋️' },
  { value: 'loft', label: 'Лофты', icon: '🏭' },
  { value: 'house', label: 'Дома', icon: '🏡' },
  { value: 'villa', label: 'Виллы', icon: '🏰' },
];

export default function CategoryPills() {
  return (
    <section className="border-b border-slate-100 bg-white py-4">
      <div className="mx-auto max-w-content-xl px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
          <Link
            href="/listings"
            className="flex shrink-0 flex-col items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <span className="text-xl">✨</span>
            <span>Все</span>
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.value}
              href={`/listings?propertyType=${cat.value}`}
              className="flex shrink-0 flex-col items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            >
              <span className="text-xl">{cat.icon}</span>
              <span>{cat.label}</span>
            </Link>
          ))}
          <div className="ml-auto hidden shrink-0 md:block">
            <Link
              href="/listings"
              className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-pine-400 hover:text-pine-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591L15.25 12.75a2.25 2.25 0 00-.659 1.591V19l-4.5 2.25V14.341a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
              </svg>
              Фильтры
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
