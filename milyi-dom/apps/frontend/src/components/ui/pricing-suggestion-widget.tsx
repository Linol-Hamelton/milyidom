'use client';

import { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { Button } from './button';
import { Skeleton } from './skeleton';
import { fetchPricingSuggestion, type PricingSuggestion } from '../../services/listings';
import { parseError } from '../../lib/api-client';
import toast from 'react-hot-toast';

interface Props {
  listingId: string;
  onApply?: (price: number) => void;
}

export function PricingSuggestionWidget({ listingId, onApply }: Props) {
  const [suggestion, setSuggestion] = useState<PricingSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);

  const load = async () => {
    setLoading(true);
    setRequested(true);
    try {
      const data = await fetchPricingSuggestion(listingId);
      setSuggestion(data);
    } catch (err) {
      toast.error(parseError(err).message);
      setRequested(false);
    } finally {
      setLoading(false);
    }
  };

  if (!requested) {
    return (
      <button
        type="button"
        onClick={load}
        className="flex items-center gap-2 rounded-xl border border-pine-200 bg-pine-50 px-4 py-2 text-sm text-pine-700 hover:bg-pine-100 transition-colors"
      >
        <SparklesIcon className="h-4 w-4" />
        Получить AI-рекомендацию по цене
      </button>
    );
  }

  if (loading) {
    return <Skeleton className="h-28 rounded-xl" />;
  }

  if (!suggestion) return null;

  return (
    <div className="rounded-xl border border-pine-200 bg-pine-50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-pine-700 font-semibold text-sm">
        <SparklesIcon className="h-4 w-4" />
        AI-рекомендация по цене
      </div>
      <div className="flex items-baseline gap-4">
        <div>
          <span className="text-2xl font-bold text-slate-900">₽{suggestion.suggestedPrice}</span>
          <span className="text-sm text-slate-500 ml-1">/ ночь</span>
        </div>
        <span className="text-xs text-slate-500">
          Диапазон: ₽{suggestion.minPrice} — ₽{suggestion.maxPrice}
        </span>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">{suggestion.rationale}</p>
      {suggestion.factors.length > 0 && (
        <ul className="text-xs text-slate-500 list-disc list-inside space-y-0.5">
          {suggestion.factors.map((factor, i) => (
            <li key={i}>{factor}</li>
          ))}
        </ul>
      )}
      {onApply && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => onApply(suggestion.suggestedPrice)}
          className="px-3 py-1 text-xs text-pine-700 hover:text-pine-900"
        >
          Применить рекомендованную цену
        </Button>
      )}
    </div>
  );
}
