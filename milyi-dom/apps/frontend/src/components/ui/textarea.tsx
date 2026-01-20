'use client';

import { forwardRef, TextareaHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={twMerge(
        'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-400',
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';
