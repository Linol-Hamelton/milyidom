'use client';

import { forwardRef, SelectHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={twMerge(
        'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-400',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);

Select.displayName = 'Select';
