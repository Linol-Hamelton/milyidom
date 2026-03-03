import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-sand-50 px-4 text-center">
      <div className="mb-6 text-7xl">🏡</div>
      <h1 className="text-6xl font-bold text-pine-700">404</h1>
      <h2 className="mt-3 text-2xl font-semibold text-slate-800">Страница не найдена</h2>
      <p className="mx-auto mt-3 max-w-md text-slate-500">
        Кажется, эта страница переехала или не существует. Воспользуйтесь поиском или вернитесь на главную.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href="/"
          className="rounded-full bg-pine-600 px-8 py-3 text-sm font-semibold text-white shadow transition hover:bg-pine-500"
        >
          На главную
        </Link>
        <Link
          href="/listings"
          className="rounded-full border border-pine-300 px-8 py-3 text-sm font-medium text-pine-700 transition hover:bg-pine-50"
        >
          Найти жильё
        </Link>
      </div>
    </div>
  );
}
