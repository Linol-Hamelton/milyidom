interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  itemCount?: number;
  itemLabel?: string;
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function Pagination({
  page,
  totalPages,
  total,
  itemCount,
  itemLabel = 'записей',
  loading = false,
  onPrev,
  onNext,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-8 flex items-center justify-between">
      {total !== undefined && itemCount !== undefined ? (
        <p className="text-sm text-gray-600">
          Показано {itemCount} из {total} {itemLabel}
        </p>
      ) : (
        <p className="text-sm text-gray-600">
          Страница {page} из {totalPages}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={onPrev}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Назад
        </button>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={onNext}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Далее
        </button>
      </div>
    </div>
  );
}
