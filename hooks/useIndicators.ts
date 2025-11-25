import { useEffect, useMemo, useState } from 'react';
import { Candle, CustomIndicator } from '../types';
import { calculateEMA, NEW_INDICATOR_TEMPLATE, DEFAULT_INDICATOR_CODE } from '../utils/indicators';
import { apiClient } from '../services/api/client';

const APPLIED_VERSIONS_KEY = 'thelab.indicators.appliedVersions';
const SELECTED_ID_KEY = 'thelab.indicators.selectedId';

const loadAppliedVersions = (): Record<string, number> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(APPLIED_VERSIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const persistAppliedVersions = (versions: Record<string, number>) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(APPLIED_VERSIONS_KEY, JSON.stringify(versions));
  } catch {
    /* ignore */
  }
};

const persistSelectedId = (id: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      window.localStorage.setItem(SELECTED_ID_KEY, id);
    } else {
      window.localStorage.removeItem(SELECTED_ID_KEY);
    }
  } catch {
    /* ignore */
  }
};

const loadSelectedId = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SELECTED_ID_KEY);
  } catch {
    return null;
  }
};

export const useIndicators = (data: Candle[]) => {
  const [indicators, setIndicators] = useState<CustomIndicator[]>([]);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(loadSelectedId);
  const [indicatorData, setIndicatorData] = useState<{ time: string | number; value: number }[]>([]);
  const [appliedVersions, setAppliedVersions] = useState<Record<string, number>>(loadAppliedVersions);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const response = await apiClient.listIndicators();
        const items = Array.isArray(response.items) ? response.items : [];
        if (items.length === 0) {
          // Fallback: seed a default indicator client-side if API returned empty.
          const now = Date.now();
          const seed: CustomIndicator = {
            id: 'ema_200',
            name: 'EMA 200',
            code: DEFAULT_INDICATOR_CODE,
            filePath: 'indicators/ema_200.py',
            lastModified: now,
            sizeBytes: DEFAULT_INDICATOR_CODE.length,
            isActive: true,
            isVisible: true,
            appliedVersion: now,
            createdAt: now,
            updatedAt: now,
            hasUpdate: false,
          };
          setIndicators([seed]);
          setSelectedIndicatorId('ema_200');
          persistSelectedId('ema_200');
          setAppliedVersions({ ema_200: now });
          persistAppliedVersions({ ema_200: now });
          return;
        }

        const nextIndicators: CustomIndicator[] = items.map((item: any, index: number) => {
          const appliedVersion = appliedVersions[item.id] ?? 0;
          const hasUpdate = appliedVersion ? item.lastModified > appliedVersion : false;
          return {
            id: item.id,
            name: item.name || item.id,
            code: '',
            filePath: item.filePath,
            lastModified: item.lastModified,
            sizeBytes: item.sizeBytes,
            isActive: index === 0,
            isVisible: true,
            appliedVersion,
            createdAt: item.lastModified,
            updatedAt: item.lastModified,
            hasUpdate,
          };
        });

        setIndicators(nextIndicators);
        if (!selectedIndicatorId && nextIndicators[0]) {
          setSelectedIndicatorId(nextIndicators[0].id);
          persistSelectedId(nextIndicators[0].id);
        }
      } catch (error) {
        console.warn('[useIndicators] Failed to load indicators from API, using local seed', error);
        const now = Date.now();
        const seed: CustomIndicator = {
          id: 'ema_200',
          name: 'EMA 200',
          code: DEFAULT_INDICATOR_CODE,
          filePath: 'indicators/ema_200.py',
          lastModified: now,
          sizeBytes: DEFAULT_INDICATOR_CODE.length,
          isActive: true,
          isVisible: true,
          appliedVersion: now,
          createdAt: now,
          updatedAt: now,
          hasUpdate: false,
        };
        setIndicators([seed]);
        setSelectedIndicatorId('ema_200');
        persistSelectedId('ema_200');
        setAppliedVersions({ ema_200: now });
        persistAppliedVersions({ ema_200: now });
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
        if (!item) return;
        const appliedVersion = item.lastModified;
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
                  code: item.code || '',
                  name: item.name || indicator.name,
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
        /* ignore load errors */
      }
    };

    fetchCode();
  }, [selectedIndicatorId]);

  useEffect(() => {
    const active = indicators.find((item) => item.isActive);
    if (data.length > 0 && active) {
      const period = active.name.includes('50') ? 50 : 200;
      setIndicatorData(calculateEMA(data, period));
    } else {
      setIndicatorData([]);
    }
  }, [data, indicators]);

  const createIndicator = () => {
    const now = Date.now();
    const id = now.toString();
    const newIndicator: CustomIndicator = {
      id,
      name: 'New Indicator',
      code: NEW_INDICATOR_TEMPLATE,
      filePath: '',
      lastModified: now,
      sizeBytes: 0,
      isActive: false,
      isVisible: true,
      appliedVersion: 0,
      createdAt: now,
      updatedAt: now,
      hasUpdate: false,
    };
    setIndicators((prev) => [...prev, newIndicator]);
    setSelectedIndicatorId(id);
    persistSelectedId(id);
  };

  const deleteIndicator = (id: string) => {
    setIndicators((prev) => prev.filter((indicator) => indicator.id !== id));
    setSelectedIndicatorId((current) => {
      const next = current === id ? null : current;
      persistSelectedId(next);
      return next;
    });
  };

  const saveIndicator = async (id: string, code: string, name?: string) => {
    const response = await apiClient.saveIndicator(id, { code });
    const item = response.item;
    const appliedVersion = item?.lastModified ?? Date.now();
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
              name: name ?? indicator.name,
              filePath: item?.filePath ?? indicator.filePath,
              lastModified: item?.lastModified ?? indicator.lastModified,
              sizeBytes: item?.sizeBytes ?? indicator.sizeBytes,
              updatedAt: Date.now(),
              appliedVersion,
              hasUpdate: false,
            }
          : indicator
      )
    );
  };

  const toggleActiveIndicator = (id: string) => {
    setIndicators((prev) =>
      prev.map((indicator) =>
        indicator.id === id ? { ...indicator, isActive: !indicator.isActive } : indicator
      )
    );
  };

  const toggleVisibility = (id: string) => {
    setIndicators((prev) =>
      prev.map((indicator) =>
        indicator.id === id ? { ...indicator, isVisible: !indicator.isVisible } : indicator
      )
    );
  };

  const refreshFromDisk = async (id: string) => {
    try {
      const response = await apiClient.getIndicator(id);
      const item = response.item;
      if (!item) return;
      const appliedVersion = item.lastModified;
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
                code: item.code || '',
                name: item.name || indicator.name,
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
    selectedIndicatorId,
    setSelectedIndicatorId: (id: string | null) => {
      setSelectedIndicatorId(id);
      persistSelectedId(id);
    },
    activeIndicator,
    createIndicator,
    deleteIndicator,
    saveIndicator,
    toggleActiveIndicator,
    toggleVisibility,
    refreshFromDisk,
  };
};
