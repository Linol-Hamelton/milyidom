'use client';

import { useState } from 'react';
import { ShareIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
}

export function ShareButton({ title, text, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '');

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title, text: text ?? title, url: shareUrl });
        return;
      } catch {
        // user cancelled or API unavailable — fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Ссылка скопирована');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Не удалось скопировать ссылку');
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-1.5 rounded-xl border border-sand-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-soft hover:border-pine-300 hover:text-pine-700 transition-colors"
      title="Поделиться объявлением"
    >
      {copied ? (
        <CheckIcon className="h-4 w-4 text-pine-600" />
      ) : (
        <ShareIcon className="h-4 w-4" />
      )}
      {copied ? 'Скопировано' : 'Поделиться'}
    </button>
  );
}
