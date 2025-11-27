import { useEffect, useState } from 'react';
import { apiClient } from '../services/api/client';

export const useAvailableFrames = (asset: string) => {
  const [frames, setFrames] = useState<string[]>([]);
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
        const listed = Array.isArray(res?.timeframes) ? res.timeframes : Object.keys(res?.timeframes || {});
        const normalized = Array.from(new Set(listed.map((tf) => String(tf).toUpperCase())));
        setFrames(normalized);
      } catch (err) {
        if (!cancelled) {
          setFrames([]);
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
