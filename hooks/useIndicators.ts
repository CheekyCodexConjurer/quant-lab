import { useEffect, useMemo, useRef, useState } from 'react';
import { Candle, CustomIndicator, IndicatorOverlay, StrategyLabError } from '../types';
import { calculateEMA, NEW_INDICATOR_TEMPLATE, DEFAULT_INDICATOR_CODE } from '../utils/indicators';
import { apiClient } from '../services/api/client';
import {
  loadAppliedVersions,
  loadIndicatorNames,
  loadIndicatorOrder,
  loadSelectedIndicatorId,
  persistAppliedVersions,
  persistIndicatorNames,
  persistIndicatorOrder,
  persistSelectedIndicatorId,
} from '../utils/storage/indicatorStorage';
import { ensureRootedPath, normalizeSlashes, toRelativePath } from '../utils/path';

const INDICATOR_ROOT = 'indicators';
const FOLDERS_KEY = 'thelab.indicatorFolders';
const MAX_INDICATOR_CANDLES = 100;
const INDICATOR_DEBOUNCE_MS = 250;

type IndicatorSeriesPoint = { time: string | number; value: number };

type CachedIndicatorResult = {
  series: IndicatorSeriesPoint[];
  overlay: IndicatorOverlay;
  error: string | null;
};

const seedIndicator = (): CustomIndicator => {
  const now = Date.now();
  return {
    id: 'ema_200',
    name: 'EMA 200',
    code: DEFAULT_INDICATOR_CODE,
    filePath: `${INDICATOR_ROOT}/ema_200.py`,
    lastModified: now,
    sizeBytes: DEFAULT_INDICATOR_CODE.length,
    isActive: true,
    isVisible: true,
    appliedVersion: now,
    createdAt: now,
    updatedAt: now,
    hasUpdate: false,
  };
};

const toIndicatorRelativePath = (filePath?: string | null) => {
  if (!filePath) return undefined;
  const normalized = ensureRootedPath(INDICATOR_ROOT, filePath);
  const rel = toRelativePath(INDICATOR_ROOT, normalized);
  return rel ? `${INDICATOR_ROOT}/${rel}` : INDICATOR_ROOT;
};

const normalizeFolder = (folderPath?: string) => {
  const normalized = normalizeSlashes(folderPath || INDICATOR_ROOT);
  if (!normalized) return INDICATOR_ROOT;
  return normalized.toLowerCase().startsWith(INDICATOR_ROOT) ? normalized : `${INDICATOR_ROOT}/${normalized}`;
};

export const useIndicators = (data: Candle[]) => {
  const [indicators, setIndicators] = useState<CustomIndicator[]>([]);
  const [selectedIndicatorId, setSelectedIndicatorIdState] = useState<string | null>(loadSelectedIndicatorId);
  const [indicatorData, setIndicatorData] = useState<Record<string, IndicatorSeriesPoint[]>>({});
  const [indicatorOverlays, setIndicatorOverlays] = useState<Record<string, IndicatorOverlay>>({});
  const [indicatorErrors, setIndicatorErrors] = useState<Record<string, string | null>>({});
  const [indicatorErrorDetails, setIndicatorErrorDetails] = useState<Record<string, StrategyLabError | null>>({});
  const [appliedVersions, setAppliedVersions] = useState<Record<string, number>>(loadAppliedVersions);
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>(loadIndicatorNames);
  const [indicatorOrder, setIndicatorOrder] = useState<string[]>(loadIndicatorOrder);
  const [folders, setFolders] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(FOLDERS_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) return parsed.map((f) => normalizeSlashes(f)).filter(Boolean);
    } catch {
      /* ignore */
    }
    return [];
  });
  const executionCacheRef = useRef<Record<string, CachedIndicatorResult>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runTokenRef = useRef(0);

  const setSelectedIndicatorId = (id: string | null) => {
    setSelectedIndicatorIdState(id);
    persistSelectedIndicatorId(id);
  };

  const updateOrder = (next: string[]) => {
    setIndicatorOrder(next);
    persistIndicatorOrder(next);
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const response = await apiClient.listIndicators();
    const items = Array.isArray(response.items) ? response.items : [];
        if (items.length === 0) {
          const seed = seedIndicator();
          setIndicators([seed]);
          setSelectedIndicatorId(seed.id);
          persistSelectedIndicatorId(seed.id);
          setAppliedVersions({ [seed.id]: seed.appliedVersion });
          persistAppliedVersions({ [seed.id]: seed.appliedVersion });
          return;
        }

    const nextIndicators: CustomIndicator[] = items.map((item: any, index: number) => {
          const appliedVersion = appliedVersions[item.id] ?? 0;
          const hasUpdate = appliedVersion ? item.lastModified > appliedVersion : false;
      return {
        id: item.id,
        name: nameOverrides[item.id] || item.name || item.id,
        code: '',
        filePath: item.filePath,
        lastModified: item.lastModified,
        sizeBytes: item.sizeBytes,
        isActive: Boolean(item.active),
        isVisible: true,
        appliedVersion,
        createdAt: item.lastModified,
        updatedAt: item.lastModified,
        hasUpdate,
      };
    });

        setIndicators(nextIndicators);
        if (indicatorOrder.length === 0) {
          const paths = nextIndicators.map((ind) => normalizeSlashes(ind.filePath || ''));
          updateOrder(paths);
        }
        if (!selectedIndicatorId && nextIndicators[0]) {
          setSelectedIndicatorId(nextIndicators[0].id);
          persistSelectedIndicatorId(nextIndicators[0].id);
        }
      } catch (error) {
        console.warn('[useIndicators] Failed to load indicators from API, using local seed', error);
        const seed = seedIndicator();
        setIndicators([seed]);
        setSelectedIndicatorId(seed.id);
        persistSelectedIndicatorId(seed.id);
        setAppliedVersions({ [seed.id]: seed.appliedVersion });
        persistAppliedVersions({ [seed.id]: seed.appliedVersion });
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedIndicatorId) return;
    const fetchCode = async () => {
      try {
        const response = await apiClient.getIndicator(selectedIndicatorId);
        const item = response.item;
        if (!item) {
          setIndicators((prev) =>
            prev.map((indicator) =>
              indicator.id === selectedIndicatorId
                ? { ...indicator, code: DEFAULT_INDICATOR_CODE, updatedAt: Date.now(), hasUpdate: false }
                : indicator
            )
          );
          return;
        }
        const appliedVersion = item.lastModified;
        const code = item.code || DEFAULT_INDICATOR_CODE;
        setAppliedVersions((prev) => {
          const updated = { ...prev, [selectedIndicatorId]: appliedVersion };
          persistAppliedVersions(updated);
          return updated;
        });
        setIndicators((prev) =>
          prev.map((indicator) =>
            indicator.id === selectedIndicatorId
              ? {
                  ...indicator,
                  code,
                  name: nameOverrides[selectedIndicatorId] || item.name || indicator.name,
                  filePath: item.filePath,
                  lastModified: item.lastModified,
                  sizeBytes: item.sizeBytes,
                  updatedAt: Date.now(),
                  appliedVersion,
                  isActive: typeof item.active === 'boolean' ? item.active : indicator.isActive,
                  hasUpdate: false,
                }
              : indicator
          )
        );
      } catch {
        setIndicators((prev) =>
          prev.map((indicator) =>
            indicator.id === selectedIndicatorId
              ? { ...indicator, code: DEFAULT_INDICATOR_CODE, updatedAt: Date.now(), hasUpdate: false }
              : indicator
          )
        );
      }
    };

    fetchCode();
  }, [selectedIndicatorId, nameOverrides]);

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
          const versionKey = indicator.appliedVersion || indicator.updatedAt || indicator.lastModified || 0;
          const cacheKey = `${indicator.id}|${versionKey}|${baseKey}`;
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
            const response = await apiClient.runIndicator(indicator.id, windowCandles);
            const line = Array.isArray(response.series) ? response.series : [];
            const overlay: IndicatorOverlay = {
              series: (response.overlay && response.overlay.series) || { main: line },
              markers: (response.overlay && response.overlay.markers) || [],
              levels: (response.overlay && response.overlay.levels) || [],
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
  }, [data, indicators]);

  const createIndicator = (folderPath?: string) => {
    const now = Date.now();
    const baseName = 'New_Indicator';
    const id = `${baseName}_${now}`;
    const normalizedFolder = normalizeFolder(folderPath);
    const filePath = `${normalizedFolder}/${baseName}.py`;
    const nextFolders = Array.from(new Set([...folders, normalizedFolder]));
    setFolders(nextFolders);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(FOLDERS_KEY, JSON.stringify(nextFolders));
      } catch {
        /* ignore */
      }
    }
    const newIndicator: CustomIndicator = {
      id,
      name: 'New Indicator',
      code: '',
      filePath,
      lastModified: now,
      sizeBytes: NEW_INDICATOR_TEMPLATE.length,
      isActive: false,
      isVisible: true,
      appliedVersion: 0,
      createdAt: now,
      updatedAt: now,
      hasUpdate: false,
    };
    setIndicators((prev) => [...prev, newIndicator]);
    setSelectedIndicatorId(id);
    persistSelectedIndicatorId(id);
    updateOrder([...indicatorOrder, filePath]);
    setNameOverrides((prev) => {
      const next = { ...prev, [id]: newIndicator.name };
      persistIndicatorNames(next);
      return next;
    });
    saveIndicator(id, newIndicator.code, newIndicator.name, filePath).catch(() => {
      /* ignore initial save errors */
    });
  };

  const addIndicatorFolder = (folderPath: string) => {
    const normalized = normalizeFolder(folderPath);
    setFolders((prev) => {
      const next = Array.from(new Set([...prev, normalized]));
      try {
        window.localStorage.setItem(FOLDERS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const removeIndicatorFolder = (folderPath: string) => {
    const normalized = normalizeFolder(folderPath);
    setFolders((prev) => {
      const next = prev.filter((f) => normalizeSlashes(f) !== normalizeSlashes(normalized));
      try {
        window.localStorage.setItem(FOLDERS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const deleteIndicator = async (id: string) => {
    try {
      await apiClient.deleteIndicator(id);
    } catch (error) {
      /* keep going even if backend delete fails */
      console.warn('[indicator] delete failed', error);
    }
    setIndicators((prev) => prev.filter((indicator) => indicator.id !== id));
    setSelectedIndicatorId((current) => {
      const next = current === id ? null : current;
      persistSelectedIndicatorId(next);
      return next;
    });
    setNameOverrides((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      persistIndicatorNames(next);
      return next;
    });
    const remaining = indicators.filter((indicator) => indicator.id !== id).map((indicator) => normalizeSlashes(indicator.filePath || ''));
    updateOrder(indicatorOrder.filter((path) => remaining.includes(normalizeSlashes(path))));
  };

  const saveIndicator = async (id: string, code: string, name?: string, filePathOverride?: string) => {
    const currentIndicator = indicators.find((indicator) => indicator.id === id);
    const resolvedPath = toIndicatorRelativePath(filePathOverride || currentIndicator?.filePath);
    const payload = resolvedPath ? { code, filePath: resolvedPath } : { code };
    const response = await apiClient.saveIndicator(id, payload);
    const item = response.item;
    const appliedVersion = item?.lastModified ?? Date.now();
    const newId = item?.id || id;
    const nextName = name || nameOverrides[id] || item?.name || currentIndicator?.name;
    const nextFilePath = item?.filePath ?? resolvedPath ?? currentIndicator?.filePath ?? filePathOverride;

    setAppliedVersions((prev) => {
      const updated = { ...prev, [newId]: appliedVersion };
      if (newId !== id) {
        delete updated[id];
      }
      persistAppliedVersions(updated);
      return updated;
    });

    setIndicators((prev) =>
      prev.map((indicator) =>
        indicator.id === id
          ? {
              ...indicator,
              id: newId,
              code,
              name: nextName,
              filePath: nextFilePath,
              lastModified: item?.lastModified ?? indicator.lastModified,
              sizeBytes: item?.sizeBytes ?? indicator.sizeBytes,
              updatedAt: Date.now(),
              appliedVersion,
              hasUpdate: false,
            }
          : indicator
      )
    );

    if (currentIndicator) {
      const prevPath = normalizeSlashes(currentIndicator.filePath || '');
      const nextPath = normalizeSlashes(nextFilePath);
      if (nextPath) {
        const reordered = indicatorOrder.length
          ? indicatorOrder.map((path) => (normalizeSlashes(path) === prevPath ? nextPath : path))
          : [nextPath];
        if (!reordered.includes(nextPath)) {
          reordered.push(nextPath);
        }
        updateOrder(reordered);
      }
    }

    setNameOverrides((prev) => {
      const next = { ...prev, [newId]: nextName || prev[newId] || prev[id] };
      if (newId !== id) {
        delete next[id];
      }
      persistIndicatorNames(next);
      return next;
    });

    setSelectedIndicatorId((current) => {
      if (current === id || current === newId) {
        persistSelectedIndicatorId(newId);
        return newId;
      }
      return current;
    });
  };

  const renameIndicator = async (id: string, nextWorkspacePath: string, name: string) => {
    const currentIndicator = indicators.find((indicator) => indicator.id === id);
    if (!currentIndicator) return;
    const resolvedPath = toIndicatorRelativePath(nextWorkspacePath);
    const payload = resolvedPath ? { filePath: resolvedPath } : { filePath: nextWorkspacePath };
    const response = await apiClient.renameIndicator(id, payload);
    const item = response.item;
    if (!item) return;
    const newId = item.id || id;
    const nextFilePath = item.filePath || currentIndicator.filePath;
    const appliedVersion = item.lastModified ?? currentIndicator.appliedVersion;

    setAppliedVersions((prev) => {
      const updated = { ...prev, [newId]: appliedVersion };
      if (newId !== id) {
        delete updated[id];
      }
      persistAppliedVersions(updated);
      return updated;
    });

    setIndicators((prev) =>
      prev.map((indicator) =>
        indicator.id === id
          ? {
              ...indicator,
              id: newId,
              name,
              filePath: nextFilePath,
              lastModified: item.lastModified ?? indicator.lastModified,
              sizeBytes: item.sizeBytes ?? indicator.sizeBytes,
              updatedAt: Date.now(),
              appliedVersion,
              hasUpdate: false,
            }
          : indicator
      )
    );

    const prevPath = normalizeSlashes(currentIndicator.filePath || '');
    const nextPath = normalizeSlashes(nextFilePath || '');
    if (nextPath) {
      const reordered = indicatorOrder.length
        ? indicatorOrder.map((path) => (normalizeSlashes(path) === prevPath ? nextPath : path))
        : [nextPath];
      if (!reordered.includes(nextPath)) {
        reordered.push(nextPath);
      }
      updateOrder(reordered);
    }

    setNameOverrides((prev) => {
      const next = { ...prev, [newId]: name || prev[newId] || prev[id] };
      if (newId !== id) {
        delete next[id];
      }
      persistIndicatorNames(next);
      return next;
    });

    setSelectedIndicatorId((current) => {
      if (current === id || current === newId) {
        const nextSelected = newId;
        persistSelectedIndicatorId(nextSelected);
        return nextSelected;
      }
      return current;
    });
  };

  const toggleActiveIndicator = async (id: string) => {
    const current = indicators.find((indicator) => indicator.id === id);
    const nextValue = !current?.isActive;
    setIndicators((prev) => prev.map((indicator) => (indicator.id === id ? { ...indicator, isActive: nextValue } : indicator)));
    try {
      await apiClient.setIndicatorActive(id, nextValue);
    } catch (error) {
      setIndicators((prev) => prev.map((indicator) => (indicator.id === id ? { ...indicator, isActive: !nextValue } : indicator)));
      console.warn('[useIndicators] toggleActive failed', error);
    }
  };

  const toggleVisibility = (id: string) => {
    setIndicators((prev) =>
      prev.map((indicator) => (indicator.id === id ? { ...indicator, isVisible: !indicator.isVisible } : indicator))
    );
  };

  const updateIndicatorName = (id: string, name: string) => {
    const safeName = name?.trim() || id;
    setIndicators((prev) =>
      prev.map((indicator) => (indicator.id === id ? { ...indicator, name: safeName, updatedAt: Date.now() } : indicator))
    );
    setNameOverrides((prev) => {
      const next = { ...prev, [id]: safeName };
      persistIndicatorNames(next);
      return next;
    });
  };

  const refreshFromDisk = async (id: string) => {
    try {
      const response = await apiClient.getIndicator(id);
      const item = response.item;
      if (!item) return;
      const appliedVersion = item.lastModified;
      const code = item.code || DEFAULT_INDICATOR_CODE;
      setAppliedVersions((prev) => {
        const updated = { ...prev, [id]: appliedVersion };
        persistAppliedVersions(updated);
        return updated;
      });
      setIndicators((prev) =>
        prev.map((indicator) =>
          indicator.id === id
            ? {
                ...indicator,
                code,
                name: nameOverrides[id] || item.name || indicator.name,
                filePath: item.filePath,
                lastModified: item.lastModified,
                sizeBytes: item.sizeBytes,
                updatedAt: Date.now(),
                appliedVersion,
                hasUpdate: false,
              }
            : indicator
        )
      );
    } catch {
      /* ignore refresh errors */
    }
  };

  const activeIndicator = useMemo(
    () => indicators.find((indicator) => indicator.id === selectedIndicatorId) ?? null,
    [indicators, selectedIndicatorId]
  );

  return {
    indicators,
    indicatorData,
    indicatorOverlays,
    indicatorOrder,
    setIndicatorOrder: updateOrder,
    indicatorFolders: folders,
    addIndicatorFolder,
    removeIndicatorFolder,
    selectedIndicatorId,
    setSelectedIndicatorId,
    activeIndicator,
    createIndicator,
    deleteIndicator,
    saveIndicator,
    toggleActiveIndicator,
    toggleVisibility,
    refreshFromDisk,
    renameIndicator,
    updateIndicatorName,
    indicatorErrors,
    indicatorErrorDetails,
  };
};
