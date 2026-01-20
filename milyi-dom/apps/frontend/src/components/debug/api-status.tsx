'use client';

import { useEffect, useState } from 'react';
import { checkApiEndpoints } from '../../lib/health-check';

interface ApiStatusProps {
  show?: boolean;
}

export function ApiStatus({ show = false }: ApiStatusProps) {
  const [status, setStatus] = useState<{
    backend: boolean;
    reviews: boolean;
    favorites: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      setLoading(true);
      const results = await checkApiEndpoints();
      setStatus(results);
      setLoading(false);
    }

    checkStatus();
  }, []);

  if (!show) return null;

  if (loading) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-blue-100 border border-blue-300 rounded-lg p-4 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-blue-800">Проверка API...</span>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-w-xs">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Статус API</h3>
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Бэкенд:</span>
          <span className={status.backend ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
            {status.backend ? '✓' : '✗'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Отзывы:</span>
          <span className={status.reviews ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
            {status.reviews ? '✓' : '⚠'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Избранное:</span>
          <span className={status.favorites ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
            {status.favorites ? '✓' : '⚠'}
          </span>
        </div>
      </div>
      {!status.backend && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          Бэкенд недоступен. Проверьте, что сервер запущен на порту 4001.
        </div>
      )}
      {status.backend && (!status.reviews || !status.favorites) && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          Некоторые API эндпоинты недоступны. Это нормально для разработки.
        </div>
      )}
    </div>
  );
}