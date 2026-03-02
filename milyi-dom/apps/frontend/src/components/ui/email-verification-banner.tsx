'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { resendVerification } from '../../services/auth';

export function EmailVerificationBanner() {
  const { user, isAuthenticated } = useAuth();
  const [sending, setSending] = useState(false);

  if (!isAuthenticated || !user || user.isVerified) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await resendVerification();
      toast.success('Письмо с подтверждением отправлено!');
    } catch {
      toast.error('Не удалось отправить письмо. Попробуйте позже.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="mx-auto flex max-w-content-2xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
        <p className="text-sm text-amber-800">
          Подтвердите ваш email, чтобы получить полный доступ к платформе. Проверьте папку «Входящие».
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={sending}
          className="shrink-0 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60 transition"
        >
          {sending ? 'Отправка…' : 'Отправить снова'}
        </button>
      </div>
    </div>
  );
}
