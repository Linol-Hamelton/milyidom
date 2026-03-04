import Link from 'next/link';

export default function HostCta() {
  return (
    <section id="hosts" className="relative overflow-hidden bg-pine-700 py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-12 left-10 h-48 w-48 rounded-full bg-amber-300/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Начните зарабатывать на своём жилье
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-pine-200">
            Присоединяйтесь к хостам, которые зарабатывают на аренде. Простой старт и поддержка на каждом шагу.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {['Простой запуск', 'Поддержка 24/7', 'Гибкие тарифы'].map((label) => (
              <div key={label} className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm text-white">
                <svg className="h-4 w-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {label}
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/host/listings/new"
              className="rounded-full bg-white px-8 py-3 text-base font-semibold text-pine-700 shadow-lg transition hover:bg-pine-50 sm:px-10"
            >
              Стать хостом
            </Link>
            <Link
              href="/become-a-host"
              className="rounded-full border border-white/40 px-8 py-3 text-base font-medium text-white transition hover:bg-white/10 sm:px-10"
            >
              Узнать больше →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
