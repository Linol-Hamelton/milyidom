'use client';

import { useCallback, useEffect, useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  fetchPriceOverrides,
  createPriceOverride,
  deletePriceOverride,
  type PriceOverride,
} from '../../services/listings';
import { parseError } from '../../lib/api-client';

interface Props {
  listingId: string;
}

const today = () => new Date().toISOString().slice(0, 10);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU');
}

export function PriceOverrides({ listingId }: Props) {
  const [overrides, setOverrides] = useState<PriceOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [price, setPrice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPriceOverrides(listingId);
      setOverrides(data);
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => { void load(); }, [load]);

  const handleAdd = async () => {
    if (!label.trim() || !startDate || !endDate || !price) {
      toast.error('Заполните все поля');
      return;
    }
    if (endDate < startDate) {
      toast.error('Дата окончания раньше даты начала');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createPriceOverride(listingId, {
        label: label.trim(),
        startDate,
        endDate,
        price: parseFloat(price),
      });
      setOverrides((prev) => [...prev, created]);
      setShowForm(false);
      setLabel('');
      setStartDate(today());
      setEndDate(today());
      setPrice('');
      toast.success('Специальная цена добавлена');
    } catch (err) {
      toast.error(parseError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePriceOverride(listingId, id);
      setOverrides((prev) => prev.filter((o) => o.id !== id));
      toast.success('Удалено');
    } catch (err) {
      toast.error(parseError(err).message);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-soft space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Специальные цены</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Установите повышенную или сниженную цену на выбранные даты (праздники, выходные, сезон)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-pine-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-pine-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Добавить
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-sand-200 bg-sand-50 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Название (например: Новый год, Майские)
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Праздничные дни"
                className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pine-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">С</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-pine-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">По</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-pine-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Цена за ночь (₽)</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="5000"
                className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pine-500"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-sand-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-sand-100 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={submitting}
              className="rounded-xl bg-pine-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-pine-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-sand-100" />
          ))}
        </div>
      ) : overrides.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">
          Нет специальных цен. Базовая цена применяется ко всем датам.
        </p>
      ) : (
        <div className="divide-y divide-sand-100">
          {overrides.map((o) => (
            <div key={o.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{o.label}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(o.startDate)} — {formatDate(o.endDate)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-pine-700">
                  {Number(o.price).toLocaleString('ru-RU')} ₽/ночь
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(o.id)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  aria-label="Удалить"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
