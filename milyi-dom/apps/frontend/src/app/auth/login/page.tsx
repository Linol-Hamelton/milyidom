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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-semibold text-gray-900">Вход в аккаунт</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Если API недоступен, используйте одну из демо-учёток ниже.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Демо-данные для входа</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <div><strong>Хост:</strong> host@example.com / password123</div>
            <div><strong>Гость:</strong> guest@example.com / password123</div>
            <div><strong>Админ:</strong> admin@example.com / password123</div>
          </div>
        </div>

        {!showForgotPassword ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
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
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-rose-500 focus:border-rose-500 focus:z-10"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
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
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-rose-500 focus:border-rose-500 focus:z-10"
                placeholder="Введите пароль"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-rose-600 hover:text-rose-500"
              >
                Забыли пароль?
              </button>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Входим…' : 'Войти'}
              </button>
            </div>

            <div className="text-center text-sm text-gray-600">
              Нет аккаунта?{' '}
              <Link href="/auth/register" className="font-medium text-rose-600 hover:text-rose-500">
                Зарегистрироваться
              </Link>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Сброс пароля</h3>
              <p className="text-sm text-gray-600 mb-4">
                Введите email, привязанный к вашему аккаунту, и мы отправим инструкции по восстановлению.
              </p>
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
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
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-rose-500 focus:border-rose-500 focus:z-10"
                placeholder="name@example.com"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
              >
                Назад
              </button>
              <button
                type="submit"
                disabled={resetLoading}
                className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
