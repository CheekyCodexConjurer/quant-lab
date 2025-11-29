import { useCallback, useEffect, useRef, useState } from 'react';
import { Candle } from '../types';
import { apiClient } from '../services/api/client';
import { generateData } from '../utils/mockData';

const MAX_CANDLES = 12000;

type LoadParams = {
  asset: string;
  timeframe: string;
};

type IngestState = {
  loading: boolean;
  ingesting: boolean;
  error: string | null;
};

const keepLatest = (candles: Candle[]) =>
  candles.length > MAX_CANDLES ? candles.slice(-MAX_CANDLES) : candles;

type CacheEntry = {
  limit: number;
  candles: Candle[];
};

// Global cache por asset/timeframe para ser compartilhado entre
// o hook principal e prefetches em background.
const marketCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry>>();

const normalizeKey = (asset: string, timeframe: string) => {
  const a = String(asset || '').toUpperCase();
  const tf = String(timeframe || '').toUpperCase();
  return { key: `${a}-${tf}`, asset: a, timeframe: tf };
};

const getInitialLimitFor = (timeframe: string) => {
  const tf = String(timeframe || '').toUpperCase();
  if (tf === 'M1') return 500;
  if (tf === 'M5') return 500;
  if (tf === 'M15') return 400;
  if (tf === 'M30') return 400;
  if (tf === 'H1') return 300;
  if (tf === 'H4') return 300;
  if (tf === 'D1') return 200;
  return 500;
};

const ensureWindow = async (
  asset: string,
  timeframe: string,
  limit = MAX_CANDLES
): Promise<Candle[]> => {
  const { key, asset: normalizedAsset, timeframe: normalizedTf } = normalizeKey(asset, timeframe);
  const requested = limit && limit > 0 ? Math.floor(limit) : MAX_CANDLES;

  const cached = marketCache.get(key);
  if (cached && cached.candles.length && cached.limit >= requested) {
    return cached.candles;
  }

  const existing = inflight.get(key);
  if (existing) {
    const entry = await existing;
    if (entry.candles.length && entry.limit >= requested) {
      return entry.candles;
    }
    // se o inflight anterior trouxe menos candles que o solicitado, continua para buscar mais
  }

  const promise: Promise<CacheEntry> = (async () => {
    try {
      const payload = await apiClient.fetchData(normalizedAsset, normalizedTf, { limit: requested });
      const arr = Array.isArray(payload)
        ? (payload as Candle[])
        : Array.isArray(payload?.candles)
          ? (payload.candles as Candle[])
          : [];
      const limited = keepLatest(arr);
      const entry: CacheEntry = { limit: requested, candles: limited };
      marketCache.set(key, entry);
      return entry;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  const entry = await promise;
  return entry.candles;
};

export const prefetchMarketWindow = async (
  asset: string,
  timeframe: string,
  limit = MAX_CANDLES
) => {
  try {
    await ensureWindow(asset, timeframe, limit);
  } catch {
    // Prefetch em background: erros podem ser ignorados aqui.
  }
};

export const useIncrementalMarketData = () => {
  const [data, setData] = useState<Candle[]>([]);
  const [state, setState] = useState<IngestState>({
    loading: false,
    ingesting: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const cancelCurrentLoad = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setState((prev) => ({ ...prev, loading: false, ingesting: false }));
  }, []);

  useEffect(() => cancelCurrentLoad, [cancelCurrentLoad]);

  const loadData = useCallback(
    async ({ asset, timeframe }: LoadParams) => {
      const { key, asset: normalizedAsset, timeframe: normalizedTf } = normalizeKey(asset, timeframe);

      const cached = marketCache.get(key);
      if (cached && cached.candles.length) {
        setData(cached.candles);
        setState({ loading: false, ingesting: false, error: null });
        return;
      }

      cancelCurrentLoad();
      const controller = new AbortController();
      abortRef.current = controller;
      setState({ loading: true, ingesting: false, error: null });

      try {
        const initialLimit = getInitialLimitFor(normalizedTf);
        const windowCandles = await ensureWindow(normalizedAsset, normalizedTf, initialLimit);
        if (controller.signal.aborted) return;
        setData(windowCandles);
        setState({ loading: false, ingesting: false, error: null });

        if (MAX_CANDLES > initialLimit) {
          void ensureWindow(normalizedAsset, normalizedTf, MAX_CANDLES)
            .then((full) => {
              if (controller.signal.aborted) return;
              if (full.length > windowCandles.length) {
                setData(full);
              }
            })
            .catch(() => {
              // erros de prefetch silenciosos
            });
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = (err as Error)?.message || 'Failed to load data';
        setState({ loading: false, ingesting: false, error: message });
        const fallback = generateData(500, normalizedAsset, normalizedTf);
        setData(fallback);
      }
    },
    [cancelCurrentLoad]
  );

  return {
    data,
    loading: state.loading,
    ingesting: state.ingesting,
    error: state.error,
    loadData,
    cancelCurrentLoad,
  };
};
