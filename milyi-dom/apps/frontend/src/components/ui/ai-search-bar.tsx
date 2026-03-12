'use client';

import { useState } from 'react';
import { interpretQuery, aiParamsToFilters } from '../../services/ai-search';
import type { ListingSearchFilters } from '../../types/api';

interface AiSearchBarProps {
  onSearch: (filters: Partial<ListingSearchFilters>, interpretation: string) => void;
  className?: string;
}

export function AiSearchBar({ onSearch, className = '' }: AiSearchBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastInterpretation, setLastInterpretation] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || loading) return;

    setLoading(true);
    setError('');
    setLastInterpretation('');

    try {
      const result = await interpretQuery(q);
      const filters = aiParamsToFilters(result.params);
      setLastInterpretation(result.interpretation);
      onSearch(filters, result.interpretation);
    } catch {
      setError('Не удалось обработать запрос. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          {/* Sparkle icon */}
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg">
            ✦
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Попробуйте: "уютный домик у горного озера на 4 человека"'
            aria-label="Поиск жилья"
            className="w-full rounded-2xl border border-pine-200 bg-white py-3 pl-9 pr-4 text-sm text-slate-800 shadow-sm outline-none ring-pine-200 transition placeholder:text-slate-400 focus:border-pine-400 focus:ring-2"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          aria-label="Найти"
          className="shrink-0 rounded-2xl bg-pine-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pine-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              AI...
            </span>
          ) : (
            'AI-поиск'
          )}
        </button>
      </form>

      {lastInterpretation && (
        <p className="rounded-xl bg-pine-50 px-3 py-2 text-xs text-pine-700">
          <strong>Понял:</strong> {lastInterpretation}
        </p>
      )}
      {error && (
        <p className="text-xs text-rose-600">{error}</p>
      )}

      <p className="text-xs text-slate-400">
        Поиск по смыслу запроса — опишите идеальное жильё своими словами
      </p>
    </div>
  );
}
