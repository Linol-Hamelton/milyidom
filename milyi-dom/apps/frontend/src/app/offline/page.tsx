import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl">🏠</div>
      <h1 className="mt-6 font-serif text-3xl text-slate-900">Нет подключения к интернету</h1>
      <p className="mt-4 max-w-md text-slate-500">
        Похоже, вы офлайн. Проверьте соединение и попробуйте снова. Ранее просмотренные страницы
        доступны в кеше.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-2xl bg-pine-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-pine-500"
      >
        Попробовать снова
      </Link>
    </div>
  );
}
