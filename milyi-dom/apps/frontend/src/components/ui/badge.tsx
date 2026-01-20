'use client';

import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  color?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function Badge({ children, color = 'default', className }: BadgeProps) {
  const styles = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-rose-100 text-rose-700',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[color],
        className,
      )}
    >
      {children}
    </span>
  );
}
