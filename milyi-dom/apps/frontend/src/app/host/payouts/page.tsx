'use client';

import { useEffect, useState } from 'react';
import { getPayoutStatus, savePayoutPhone } from '../../../services/payments';

export default function HostPayoutsPage() {
  const [phone, setPhone] = useState('');
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getPayoutStatus()
      .then((s) => {
        setSavedPhone(s.phone);
        if (s.phone) setPhone(s.phone);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await savePayoutPhone(phone);
      setSavedPhone(result.phone);
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Ошибка при сохранении';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pine-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Настройка выплат</h1>
      <p className="mb-8 text-slate-500">
        Введите номер телефона для получения выплат через СБП (Систему Быстрых Платежей).
        Средства поступают в течение нескольких минут после выезда гостя.
      </p>

      {savedPhone && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-medium text-green-800">
            Текущий номер для выплат: <span className="font-mono">{savedPhone}</span>
          </p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700">
            Номер телефона (СБП)
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+79991234567"
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-pine-500 focus:ring-2 focus:ring-pine-500/20"
          />
          <p className="mt-1 text-xs text-slate-400">Формат: +7XXXXXXXXXX</p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {success && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Номер телефона сохранён. Выплаты будут поступать на этот номер.
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-pine-600 py-3 text-base font-semibold text-white transition hover:bg-pine-700 disabled:opacity-60"
        >
          {saving ? 'Сохраняем...' : 'Сохранить номер для выплат'}
        </button>
      </form>

      <div className="mt-10 rounded-2xl border border-slate-100 bg-slate-50 p-6">
        <h2 className="mb-3 font-semibold text-slate-800">Как работают выплаты</h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="text-pine-600">✓</span>
            Комиссия платформы: 10% от суммы бронирования
          </li>
          <li className="flex gap-2">
            <span className="text-pine-600">✓</span>
            Выплаты через СБП — мгновенно на любой российский банк
          </li>
          <li className="flex gap-2">
            <span className="text-pine-600">✓</span>
            Деньги поступают после подтверждения заезда гостя
          </li>
          <li className="flex gap-2">
            <span className="text-pine-600">✓</span>
            Пример: бронирование 3 000 ₽ → вам 2 700 ₽, платформе 300 ₽
          </li>
        </ul>
      </div>
    </div>
  );
}
