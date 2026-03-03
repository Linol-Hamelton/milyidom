'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    // TODO: wire up real newsletter subscription endpoint
    setSubmitted(true);
    setEmail('');
    toast.success('Подписка оформлена! Ждите подборки на почту.');
  };

  return (
    <section className="bg-sand-50 py-16">
      <div className="mx-auto max-w-2xl px-6 text-center lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-pine-600">Рассылка</p>
        <h2 className="mt-2 font-serif text-3xl text-slate-900">
          Лучшие предложения — на вашу почту
        </h2>
        <p className="mt-3 text-slate-500">
          Получайте подборки уникального жилья и спецпредложения первыми.
        </p>

        {submitted ? (
          <div className="mt-8 rounded-2xl bg-pine-50 px-6 py-5 text-pine-700">
            ✅ Вы подписались на рассылку. Спасибо!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Введите ваш email"
              className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-pine-400 focus:outline-none focus:ring-1 focus:ring-pine-400 sm:max-w-xs"
            />
            <button
              type="submit"
              className="rounded-full bg-pine-600 px-8 py-3 text-sm font-semibold text-white shadow transition hover:bg-pine-500"
            >
              Подписаться
            </button>
          </form>
        )}

        <p className="mt-4 text-xs text-slate-400">
          Никакого спама. Отписаться можно в любой момент.
        </p>
      </div>
    </section>
  );
}
