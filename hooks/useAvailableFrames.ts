import { useEffect, useState } from 'react';
import { apiClient } from '../services/api/client';

export type FrameMeta = {
  range: { start: string; end: string };
  count: number;
  updatedAt: number;
};

export const useAvailableFrames = (asset: string) => {
  const [frames, setFrames] = useState<Record<string, FrameMeta>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!asset) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.listTimeframes(asset);
        if (cancelled) return;
        setFrames(res.timeframes || {});
      } catch (err) {
        if (!cancelled) {
          setFrames({});
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [asset]);

  return { frames, isLoading, error };
};

