"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';
import { login, requestPasswordReset } from '../../../services/auth';
import { parseError } from '../../../lib/api-client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const result = await login({ email, password });
      setAuth(result);
      toast.success('Вы успешно вошли!');
      router.push('/');
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetLoading(true);

    try {
      await requestPasswordReset(resetEmail);
      toast.success('Инструкции по сбросу пароля отправлены на вашу почту.');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    } finally {
      setResetLoading(false);
    }
  };

  const accessError = searchParams?.get('error');
  useEffect(() => {
    if (accessError === 'access_denied') {
      toast.error('Доступ запрещён. Пожалуйста, войдите снова.');
    }
  }, [accessError]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-semibold text-slate-900">Вход в аккаунт</h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Войдите, чтобы бронировать жильё и управлять объявлениями.
          </p>
        </div>

        {!showForgotPassword ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-pine-400 focus:outline-none focus:ring-1 focus:ring-pine-400"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-pine-400 focus:outline-none focus:ring-1 focus:ring-pine-400"
                placeholder="Введите пароль"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-pine-600 hover:text-pine-500"
              >
                Забыли пароль?
              </button>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-pine-600 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-pine-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Входим…' : 'Войти'}
              </button>
            </div>

            <div className="text-center text-sm text-slate-500">
              Нет аккаунта?{' '}
              <Link href="/auth/register" className="font-medium text-pine-600 hover:text-pine-500">
                Зарегистрироваться
              </Link>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
            <div>
              <h3 className="mb-4 text-lg font-medium text-slate-900">Сброс пароля</h3>
              <p className="mb-4 text-sm text-slate-500">
                Введите email, привязанный к вашему аккаунту, и мы отправим инструкции по восстановлению.
              </p>
              <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="reset-email"
                name="reset-email"
                type="email"
                autoComplete="email"
                required
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-pine-400 focus:outline-none focus:ring-1 focus:ring-pine-400"
                placeholder="name@example.com"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Назад
              </button>
              <button
                type="submit"
                disabled={resetLoading}
                className="flex-1 rounded-full bg-pine-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-pine-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resetLoading ? 'Отправляем…' : 'Отправить инструкции'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
