type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
type ListingStatus = 'DRAFT' | 'PUBLISHED' | 'UNLISTED';
type DisputeStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';

type AnyStatus = BookingStatus | ListingStatus | DisputeStatus | string;

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  // Booking
  PENDING:   { label: 'Ожидает подтверждения', className: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: 'Подтверждено',           className: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Отменено',               className: 'bg-red-100 text-red-800' },
  COMPLETED: { label: 'Завершено',              className: 'bg-blue-100 text-blue-800' },
  // Listing
  DRAFT:     { label: 'Черновик',               className: 'bg-gray-100 text-gray-700' },
  PUBLISHED: { label: 'Опубликовано',           className: 'bg-green-100 text-green-800' },
  UNLISTED:  { label: 'Снято с публикации',     className: 'bg-slate-100 text-slate-700' },
  // Dispute
  OPEN:      { label: 'Открыт',                 className: 'bg-red-100 text-red-700' },
  IN_REVIEW: { label: 'На рассмотрении',        className: 'bg-yellow-100 text-yellow-700' },
  RESOLVED:  { label: 'Решён',                  className: 'bg-green-100 text-green-700' },
  CLOSED:    { label: 'Закрыт',                 className: 'bg-gray-100 text-gray-600' },
};

interface StatusBadgeProps {
  status: AnyStatus;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  const displayLabel = label ?? config.label;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className} ${className}`}
    >
      {displayLabel}
    </span>
  );
}
