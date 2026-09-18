import { useState, useCallback } from 'react';
import { fetchVideoInfo } from '../api/client';
import type { VideoInfo } from '../types';

export function useVideoInfo() {
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = useCallback(async (url: string) => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const data = await fetchVideoInfo(url);
      setInfo(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } }; message?: string })
          ?.response?.data?.detail ??
        (err as { message?: string })?.message ??
        'Failed to fetch video info.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setInfo(null);
    setError(null);
    setLoading(false);
  }, []);

  return { info, loading, error, fetchInfo, reset };
}
