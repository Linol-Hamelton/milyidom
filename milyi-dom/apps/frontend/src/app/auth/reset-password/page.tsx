'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { resetPassword } from '../../../services/auth';
import { parseError } from '../../../lib/api-client';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-700">
          Недействительная ссылка для сброса пароля. Запросите новую.
        </p>
        <Link
          href="/auth/forgot-password"
          className="mt-4 inline-block text-sm text-pine-600 hover:text-pine-500"
        >
          Запросить ссылку
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast.error('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Пароль должен быть не менее 8 символов');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setDone(true);
      toast.success('Пароль успешно изменён!');
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl bg-green-50 p-6 text-center">
        <p className="text-sm font-medium text-green-700">Пароль успешно изменён.</p>
        <button
          onClick={() => router.push('/auth/login')}
          className="mt-4 rounded-full bg-pine-600 px-6 py-2 text-sm font-semibold text-white hover:bg-pine-500"
        >
          Войти
        </button>
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-slate-700">
          Новый пароль
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-pine-400 focus:outline-none focus:ring-1 focus:ring-pine-400"
          placeholder="Минимум 8 символов"
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-slate-700">
          Повторите пароль
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-pine-400 focus:outline-none focus:ring-1 focus:ring-pine-400"
          placeholder="Повторите новый пароль"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-pine-600 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-pine-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Сохраняем…' : 'Сохранить новый пароль'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-slate-900">Новый пароль</h2>
          <p className="mt-2 text-sm text-slate-500">Придумайте надёжный пароль для вашего аккаунта.</p>
        </div>
        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-pine-200 border-t-pine-600" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
