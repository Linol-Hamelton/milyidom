'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api-client';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(normalizedEmail);
    if (!isValidEmail) {
      const message = 'Введите корректный email в формате name@example.com';
      setEmailError(message);
      toast.error(message);
      return;
    }

    setEmailError(null);
    setLoading(true);
    try {
      await api.post('/newsletter/subscribe', { email: normalizedEmail });
      setSubmitted(true);
      setEmail('');
      toast.success('Подписка оформлена! Ждите подборки на почту.');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.success('Вы уже подписаны на нашу рассылку.');
        setSubmitted(true);
      } else {
        toast.error('Не удалось оформить подписку. Попробуйте позже.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="support" className="bg-sand-50 py-16">
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
            Вы подписались на рассылку. Спасибо!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) {
                  setEmailError(null);
                }
              }}
              placeholder="Введите ваш email"
              className={`w-full rounded-full border bg-white px-5 py-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 sm:max-w-xs ${
                emailError
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-400'
                  : 'border-slate-200 focus:border-pine-400 focus:ring-pine-400'
              }`}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'newsletter-email-error' : undefined}
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-pine-600 px-8 py-3 text-sm font-semibold text-white shadow transition hover:bg-pine-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Подписываем...' : 'Подписаться'}
            </button>
          </form>
        )}

        {emailError && (
          <p id="newsletter-email-error" className="mt-3 text-sm text-red-600">
            {emailError}
          </p>
        )}

        <p className="mt-4 text-xs text-slate-400">
          Никакого спама. Отписаться можно в любой момент.
        </p>
      </div>
    </section>
  );
}
