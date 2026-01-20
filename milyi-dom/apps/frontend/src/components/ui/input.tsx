'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={twMerge(
        'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-400',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
