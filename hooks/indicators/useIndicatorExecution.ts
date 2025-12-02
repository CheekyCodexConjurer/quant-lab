import { useEffect, useRef, useState } from 'react';
import {
  Candle,
  CustomIndicator,
  IndicatorOverlay,
  IndicatorSettingsValues,
  StrategyLabError,
} from '../../types';
import { apiClient } from '../../services/api/client';

const MAX_INDICATOR_CANDLES = 1000;
const INDICATOR_DEBOUNCE_MS = 250;

export type IndicatorSeriesPoint = { time: string | number; value: number };

type CachedIndicatorResult = {
  series: IndicatorSeriesPoint[];
  overlay: IndicatorOverlay;
  error: string | null;
};

type IndicatorExecutionArgs = {
  data: Candle[];
  indicators: CustomIndicator[];
  indicatorSettings: Record<string, IndicatorSettingsValues>;
};

type IndicatorExecutionState = {
  indicatorData: Record<string, IndicatorSeriesPoint[]>;
  indicatorOverlays: Record<string, IndicatorOverlay>;
  indicatorErrors: Record<string, string | null>;
  indicatorErrorDetails: Record<string, StrategyLabError | null>;
  forceRefreshIndicator: (id: string) => void;
};

export const useIndicatorExecution = ({
  data,
  indicators,
  indicatorSettings,
}: IndicatorExecutionArgs): IndicatorExecutionState => {
  const [indicatorData, setIndicatorData] = useState<Record<string, IndicatorSeriesPoint[]>>({});
  const [indicatorOverlays, setIndicatorOverlays] = useState<Record<string, IndicatorOverlay>>({});
  const [indicatorErrors, setIndicatorErrors] = useState<Record<string, string | null>>({});
  const [indicatorErrorDetails, setIndicatorErrorDetails] = useState<
    Record<string, StrategyLabError | null>
  >({});

  const executionCacheRef = useRef<Record<string, CachedIndicatorResult>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runTokenRef = useRef(0);
  const [refreshEpochs, setRefreshEpochs] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!data.length) {
      setIndicatorData({});
      setIndicatorOverlays({});
      return;
    }

    const activeIndicators = indicators.filter((item) => item.isActive);
    if (!activeIndicators.length) {
      setIndicatorData({});
      setIndicatorOverlays({});
      return;
    }

    const cache = executionCacheRef.current;
    const windowStart = data.length > MAX_INDICATOR_CANDLES ? data.length - MAX_INDICATOR_CANDLES : 0;
    const windowCandles = data.slice(windowStart);
    const lastCandle = windowCandles[windowCandles.length - 1];
    const baseKey = lastCandle ? `${lastCandle.time}|${windowCandles.length}` : 'empty';

    let cancelled = false;
    const runToken = ++runTokenRef.current;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const timeoutHandle = setTimeout(async () => {
      const series: Record<string, IndicatorSeriesPoint[]> = {};
      const overlays: Record<string, IndicatorOverlay> = {};
      const errors: Record<string, string | null> = {};
      const details: Record<string, StrategyLabError | null> = {};

      await Promise.all(
        activeIndicators.map(async (indicator) => {
          const versionKey =
            indicator.appliedVersion || indicator.updatedAt || indicator.lastModified || 0;
          const refreshEpoch = refreshEpochs[indicator.id] || 0;
          const settingsForIndicator = indicatorSettings[indicator.id] || {};
          const settingsKey =
            settingsForIndicator && Object.keys(settingsForIndicator).length
              ? JSON.stringify(settingsForIndicator)
              : 'default';
          const cacheKey = `${indicator.id}|${versionKey}|${refreshEpoch}|${baseKey}|${settingsKey}`;
          const cached = cache[cacheKey];
          if (cached) {
            series[indicator.id] = cached.series;
            overlays[indicator.id] = cached.overlay;
            errors[indicator.id] = cached.error;
            details[indicator.id] = cached.error
              ? {
                  source: 'indicator',
                  type: 'CachedError',
                  message: cached.error,
                  createdAt: Date.now(),
                }
              : null;
            return;
          }

          try {
            const response = await apiClient.runIndicator(indicator.id, windowCandles, settingsForIndicator);
            const line = Array.isArray(response.series) ? response.series : [];
            const overlay: IndicatorOverlay = {
              series: (response.overlay && response.overlay.series) || { main: line },
              markers: (response.overlay && response.overlay.markers) || [],
              levels: (response.overlay && response.overlay.levels) || [],
              plots: (response.overlay && response.overlay.plots) || [],
            };
            const result: CachedIndicatorResult = {
              series: line,
              overlay,
              error: null,
            };
            cache[cacheKey] = result;
            series[indicator.id] = line;
            overlays[indicator.id] = overlay;
            errors[indicator.id] = null;
            details[indicator.id] = null;
          } catch (error) {
            const err = error as Error & { details?: any };
            const message = err?.message || 'Failed to run indicator';
            console.warn('[useIndicators] runIndicator failed', indicator.id, err);
            const fallbackOverlay: IndicatorOverlay = {
              series: { main: [] },
              markers: [],
              levels: [],
            };
            const result: CachedIndicatorResult = {
              series: [],
              overlay: fallbackOverlay,
              error: message,
            };
            cache[cacheKey] = result;
            series[indicator.id] = [];
            overlays[indicator.id] = fallbackOverlay;
            errors[indicator.id] = message;
            const raw = err && err.details ? err.details : undefined;
            const createdAt = Date.now();
            const base: StrategyLabError = {
              source: 'indicator',
              type: (raw && raw.type) || 'IndicatorError',
              message,
              file: raw && raw.file ? String(raw.file) : undefined,
              line: typeof raw?.line === 'number' ? raw.line : undefined,
              column: typeof raw?.column === 'number' ? raw.column : undefined,
              phase: raw && raw.phase ? String(raw.phase) : undefined,
              traceback: raw && raw.traceback ? String(raw.traceback) : undefined,
              createdAt,
            };
            details[indicator.id] = base;
          }
        })
      );

      if (!cancelled && runToken === runTokenRef.current) {
        setIndicatorData(series);
        setIndicatorOverlays(overlays);
        setIndicatorErrors(errors);
        setIndicatorErrorDetails(details);
      }
    }, INDICATOR_DEBOUNCE_MS);

    debounceRef.current = timeoutHandle;

    return () => {
      cancelled = true;
      if (debounceRef.current === timeoutHandle) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [data, indicators, indicatorSettings, refreshEpochs]);

  const forceRefreshIndicator = (id: string) => {
    setRefreshEpochs((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
    const cache = executionCacheRef.current;
    Object.keys(cache).forEach((key) => {
      if (key.startsWith(`${id}|`)) {
        delete cache[key];
      }
    });
  };

  return {
    indicatorData,
    indicatorOverlays,
    indicatorErrors,
    indicatorErrorDetails,
    forceRefreshIndicator,
  };
};
