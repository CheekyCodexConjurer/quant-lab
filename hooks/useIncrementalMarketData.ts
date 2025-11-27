import { useCallback, useEffect, useRef, useState } from 'react';
import { Candle } from '../types';
import { apiClient } from '../services/api/client';
import { generateData } from '../utils/mockData';

const BATCH_SIZE = 800;
const WORKER_THRESHOLD_CHARS = 250_000;
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

const scheduleIdle = (cb: () => void) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return (window as any).requestIdleCallback(cb);
  }
  return setTimeout(cb, 0);
};

const cancelIdle = (handle: any) => {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    (window as any).cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
};

const keepLatest = (candles: Candle[]) => (candles.length > MAX_CANDLES ? candles.slice(-MAX_CANDLES) : candles);

export const useIncrementalMarketData = () => {
  const [data, setData] = useState<Candle[]>([]);
  const [state, setState] = useState<IngestState>({ loading: false, ingesting: false, error: null });
  const abortRef = useRef<AbortController | null>(null);
  const idleHandleRef = useRef<any>(null);
  const cancelledRef = useRef(false);
  const workerRef = useRef<Worker | null>(null);

  const cancelCurrentLoad = useCallback(() => {
    cancelledRef.current = true;
    if (abortRef.current) {
      abortRef.current.abort();
    }
    if (idleHandleRef.current !== null) {
      cancelIdle(idleHandleRef.current);
      idleHandleRef.current = null;
    }
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setState((prev) => ({ ...prev, loading: false, ingesting: false }));
  }, []);

  useEffect(() => cancelCurrentLoad, [cancelCurrentLoad]);

  const ensureWorker = () => {
    if (typeof Worker === 'undefined') return null;
    if (workerRef.current) return workerRef.current;
    try {
      const worker = new Worker(new URL('../utils/workers/parseCandles.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      return worker;
    } catch {
      return null;
    }
  };

  const loadData = useCallback(async ({ asset, timeframe }: LoadParams) => {
    cancelCurrentLoad();
    cancelledRef.current = false;
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ loading: true, ingesting: false, error: null });
    setData([]);

    let text: string | null = null;
    try {
      text = await apiClient.fetchDataText(asset, timeframe, { signal: controller.signal });
    } catch (err) {
      if (!cancelledRef.current) {
        setState({ loading: false, ingesting: false, error: (err as Error).message || 'Failed to load data' });
        setData(generateData(500, asset, timeframe));
      }
      return;
    }

    if (cancelledRef.current || !text) return;

    const useWorker = text.length >= WORKER_THRESHOLD_CHARS;
    const worker = useWorker ? ensureWorker() : null;
    if (worker) {
      setState({ loading: false, ingesting: true, error: null });
      setData([]);
      worker.onmessage = (event: MessageEvent) => {
        if (cancelledRef.current) return;
        const payload = event.data;
        if (payload?.error) {
          setState({ loading: false, ingesting: false, error: payload.error });
          return;
        }
        if (Array.isArray(payload?.batch) && payload.batch.length) {
          setData((prev) => {
            const combined = prev.length ? prev.concat(payload.batch as Candle[]) : (payload.batch as Candle[]);
            return keepLatest(combined);
          });
        }
        if (payload?.done) {
          setState({ loading: false, ingesting: false, error: null });
        }
      };
      worker.postMessage({ text, batchSize: BATCH_SIZE, maxCandles: MAX_CANDLES });
      return;
    }

    let candles: Candle[] = [];
    try {
      const parsed = JSON.parse(text as string);
      const arr = Array.isArray(parsed) ? parsed : parsed?.candles;
      if (Array.isArray(arr)) {
        candles = keepLatest(arr as Candle[]);
      }
    } catch (err) {
      setState({ loading: false, ingesting: false, error: (err as Error).message || 'Failed to parse data' });
      setData(generateData(500, asset, timeframe));
      return;
    }

    if (!candles.length) {
      setState({ loading: false, ingesting: false, error: null });
      setData([]);
      return;
    }

    // Assumes backend returns ASC; if not, caller can sort before ingesting.
    let index = 0;
    const total = candles.length;
    setState({ loading: false, ingesting: true, error: null });

    const ingestNext = () => {
      if (cancelledRef.current) return;
      const slice = candles.slice(index, index + BATCH_SIZE);
      if (slice.length) {
        setData((prev) => {
          if (!prev.length) return slice;
          // Merge append; backend is expected to be ordered and non-duplicated.
          const merged = prev.concat(slice);
          return keepLatest(merged);
        });
      }
      index += slice.length;
      if (index < total && !cancelledRef.current) {
        idleHandleRef.current = scheduleIdle(ingestNext);
      } else {
        setState({ loading: false, ingesting: false, error: null });
      }
    };

    ingestNext();
  }, [cancelCurrentLoad]);

  return {
    data,
    loading: state.loading,
    ingesting: state.ingesting,
    error: state.error,
    loadData,
    cancelCurrentLoad,
  };
};
