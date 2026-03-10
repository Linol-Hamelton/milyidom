import Link from 'next/link';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export default function EmptyState({
  emoji,
  title,
  description,
  cta,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-3xl border border-dashed border-pine-200 bg-white p-10 text-center ${className}`}
    >
      {emoji && <p className="mb-3 text-4xl">{emoji}</p>}
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      )}
      {cta && (
        <div className="mt-6">
          {cta.href ? (
            <Link
              href={cta.href}
              className="inline-block rounded-full bg-pine-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-pine-500"
            >
              {cta.label}
            </Link>
          ) : (
            <button
              onClick={cta.onClick}
              className="inline-block rounded-full bg-pine-600 px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-pine-500"
            >
              {cta.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
