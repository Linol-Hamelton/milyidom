'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyEmail } from '../../../services/auth';
import { Button } from '../../../components/ui/button';

type Status = 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Токен подтверждения отсутствует в ссылке.');
      return;
    }

    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => {
        setStatus('error');
        setMessage('Ссылка недействительна или истёк срок действия. Запросите новое письмо в настройках профиля.');
      });
  }, [searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-soft text-center">
        {status === 'verifying' && (
          <>
            <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-2 border-pine-600 border-t-transparent" />
            <p className="text-slate-600">Проверяем ссылку…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
              ✓
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Email подтверждён!</h1>
            <p className="mt-3 text-slate-600">
              Ваш адрес электронной почты успешно подтверждён. Теперь вы можете пользоваться всеми функциями платформы.
            </p>
            <Button className="mt-8 w-full" onClick={() => router.push('/')}>
              На главную
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl">
              ✕
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Ошибка подтверждения</h1>
            <p className="mt-3 text-slate-600">{message}</p>
            <Button variant="outline" className="mt-8 w-full" onClick={() => router.push('/')}>
              На главную
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
