'use client';

import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import { AxiosRequestConfig } from 'axios';
import { api, parseError } from '../lib/api-client';

type FetcherConfig<T> = AxiosRequestConfig<T> & { url: string };

type ErrorShape = ReturnType<typeof parseError>;

export function useApi<T = unknown>(
  key: string | null,
  config: FetcherConfig<T>,
  options?: SWRConfiguration<T, ErrorShape>,
): SWRResponse<T, ErrorShape> {
  return useSWR<T, ErrorShape>(
    key,
    async () => {
      try {
        const { data } = await api.request<T>({ ...config, url: config.url });
        return data;
      } catch (error) {
        throw parseError(error);
      }
    },
    {
      revalidateOnFocus: false,
      ...(options ?? {}),
    },
  );
}
