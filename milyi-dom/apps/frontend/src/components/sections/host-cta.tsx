import Link from 'next/link';

export default function HostCta() {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-blue-700 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Начните зарабатывать на своём жилье
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
            Присоединяйтесь к тысячам хозяев, которые зарабатывают на аренде своего жилья
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Простой запуск
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Поддержка 24/7
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Гибкие тарифы
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/host/listings/new"
              className="rounded-full bg-white px-8 py-3 text-base font-medium text-blue-600 hover:bg-gray-50 sm:px-10"
            >
              Стать хозяином
            </Link>
            <Link
              href="/host/dashboard"
              className="rounded-full border border-white px-8 py-3 text-base font-medium text-white hover:bg-white/10 sm:px-10"
            >
              Узнать больше
            </Link>
          </div>

          <p className="mt-8 text-sm text-blue-200">
            Присоединяйтесь к сообществу из 10,000+ хозяев
          </p>
        </div>
      </div>
    </section>
  );
}

