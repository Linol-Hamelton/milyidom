'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { requestPasswordReset } from '../../../services/auth';
import { parseError } from '../../../lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
      toast.success('Инструкции отправлены на вашу почту.');
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-slate-900">Сброс пароля</h2>
          <p className="mt-2 text-sm text-slate-500">
            Введите email вашего аккаунта — мы отправим ссылку для восстановления.
          </p>
        </div>

        {sent ? (
          <div className="rounded-2xl bg-green-50 p-6 text-center">
            <p className="text-sm font-medium text-green-700">
              Письмо отправлено на <strong>{email}</strong>. Проверьте папку «Входящие».
            </p>
            <Link
              href="/auth/login"
              className="mt-4 inline-block text-sm text-pine-600 hover:text-pine-500"
            >
              Вернуться ко входу
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-pine-400 focus:outline-none focus:ring-1 focus:ring-pine-400"
                placeholder="name@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-pine-600 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-pine-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Отправляем…' : 'Отправить инструкции'}
            </button>
            <p className="text-center text-sm text-slate-500">
              Вспомнили пароль?{' '}
              <Link href="/auth/login" className="font-medium text-pine-600 hover:text-pine-500">
                Войти
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
