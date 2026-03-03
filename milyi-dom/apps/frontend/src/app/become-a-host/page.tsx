import type { Metadata } from 'next';
import Link from 'next/link';
import { BecomeHostCta } from '../../components/become-host-cta';

export const metadata: Metadata = {
  title: 'Стать хостом — Милый Дом',
  description:
    'Зарабатывайте на своём жилье. Сдавайте квартиру, дом или комнату через Милый Дом — простой старт, поддержка 24/7, честные выплаты.',
};

const steps = [
  {
    num: '01',
    title: 'Создайте объявление',
    desc: 'Добавьте фотографии, описание и укажите цену. Займёт не более 15 минут.',
    icon: '📝',
  },
  {
    num: '02',
    title: 'Принимайте гостей',
    desc: 'Вы сами выбираете даты и гостей. Подтверждайте или отклоняйте запросы.',
    icon: '🤝',
  },
  {
    num: '03',
    title: 'Получайте выплаты',
    desc: 'Деньги поступают на карту автоматически после каждого заезда.',
    icon: '💳',
  },
];

const benefits = [
  {
    icon: '🔒',
    title: 'Полный контроль',
    desc: 'Вы решаете кого принять, когда сдавать и по какой цене. Никаких обязательств.',
  },
  {
    icon: '📊',
    title: 'Умное ценообразование',
    desc: 'AI-помощник подскажет оптимальную цену с учётом сезонности и спроса.',
  },
  {
    icon: '🛡️',
    title: 'Страховка и защита',
    desc: 'Каждое бронирование защищено. Поддержка работает круглосуточно.',
  },
  {
    icon: '📈',
    title: 'Аналитика доходов',
    desc: 'Детальная статистика: заполняемость, выручка, динамика по месяцам.',
  },
];

const faqs = [
  {
    q: 'Нужно ли платить за регистрацию?',
    a: 'Нет, регистрация и создание объявления бесплатны. Мы берём комиссию только с подтверждённых бронирований.',
  },
  {
    q: 'Сколько можно заработать?',
    a: 'Всё зависит от города, типа жилья и заполняемости. В среднем московские хосты зарабатывают от 30 000 ₽/месяц, сочинские — от 60 000 ₽ в сезон.',
  },
  {
    q: 'Как проходит выплата?',
    a: 'Деньги поступают на карту через 24 часа после заезда гостя.',
  },
  {
    q: 'Могу ли я сдавать только часть времени?',
    a: 'Да, вы полностью управляете календарём — блокируйте любые даты когда удобно.',
  },
];

export default function BecomeAHostPage() {
  return (
    <main>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pine-900 via-pine-700 to-pine-500" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 right-8 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center sm:py-32 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-amber-300">Для хостов</p>
          <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            Зарабатывайте на своём жилье
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-pine-100">
            Сдавайте квартиру, дом или комнату на Милом Доме. Простой старт, поддержка 24/7 и выплаты без задержек.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <BecomeHostCta />
            <Link
              href="/auth/register"
              className="rounded-full border border-white/50 px-8 py-3 text-base font-medium text-white transition hover:bg-white/10"
            >
              Зарегистрироваться
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-pine-600">Как это работает</p>
            <h2 className="mt-2 font-serif text-3xl text-slate-900 md:text-4xl">Три простых шага</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.num} className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-pine-50 text-3xl">
                  {step.icon}
                </div>
                <span className="mb-1 text-xs font-bold tracking-widest text-pine-500">{step.num}</span>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="bg-sand-50 py-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-pine-600">Преимущества</p>
            <h2 className="mt-2 font-serif text-3xl text-slate-900 md:text-4xl">Почему выбирают Милый Дом</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <span className="mt-0.5 text-2xl">{b.icon}</span>
                <div>
                  <h3 className="mb-1 font-semibold text-slate-900">{b.title}</h3>
                  <p className="text-sm text-slate-500">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Income estimator ── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-pine-600">Потенциальный доход</p>
          <h2 className="mt-2 font-serif text-3xl text-slate-900 md:text-4xl">Сколько можно заработать?</h2>
          <p className="mt-4 text-slate-500">
            Примерный расчёт для квартиры в Москве (1-2 комнаты):
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { label: 'При 50% загрузке', price: '5 000 ₽/ночь', monthly: '≈ 75 000 ₽/мес' },
              { label: 'При 70% загрузке', price: '5 000 ₽/ночь', monthly: '≈ 105 000 ₽/мес' },
              { label: 'При 90% загрузке', price: '5 000 ₽/ночь', monthly: '≈ 135 000 ₽/мес' },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-2xl border border-pine-100 bg-pine-50 p-5 text-center"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-pine-500">{row.label}</p>
                <p className="mt-2 text-sm text-slate-500">{row.price}</p>
                <p className="mt-1 text-2xl font-bold text-pine-700">{row.monthly}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            * Расчёт примерный. Реальный доход зависит от расположения, качества объявления и сезона.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-sand-50 py-20">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-pine-600">Вопросы и ответы</p>
            <h2 className="mt-2 font-serif text-3xl text-slate-900">Часто спрашивают</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-slate-100 bg-white p-6">
                <h3 className="font-semibold text-slate-900">{faq.q}</h3>
                <p className="mt-2 text-sm text-slate-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-pine-700 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <h2 className="text-3xl font-bold text-white">Готовы начать?</h2>
          <p className="mt-3 text-pine-200">
            Создайте первое объявление бесплатно прямо сейчас.
          </p>
          <div className="mt-8 flex justify-center">
            <BecomeHostCta className="rounded-full bg-white px-10 py-3 text-base font-semibold text-pine-700 shadow-lg transition hover:bg-pine-50 disabled:opacity-60" />
          </div>
        </div>
      </section>
    </main>
  );
}
