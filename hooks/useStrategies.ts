import { useEffect, useMemo, useState } from 'react';
import { StrategyFile } from '../types';
import { apiClient } from '../services/api/client';

const SELECTED_STRATEGY_KEY = 'thelab.strategy.selectedId';
const APPLIED_STRATEGY_KEY = 'thelab.strategy.appliedVersion';

const loadSelectedId = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SELECTED_STRATEGY_KEY);
  } catch {
    return null;
  }
};

const persistSelectedId = (id: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      window.localStorage.setItem(SELECTED_STRATEGY_KEY, id);
    } else {
      window.localStorage.removeItem(SELECTED_STRATEGY_KEY);
    }
  } catch {
    /* ignore */
  }
};

const loadAppliedVersion = (): number => {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(APPLIED_STRATEGY_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
};

const persistAppliedVersion = (version: number) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(APPLIED_STRATEGY_KEY, String(version));
  } catch {
    /* ignore */
  }
};

export const useStrategies = () => {
  const [strategies, setStrategies] = useState<StrategyFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(loadSelectedId);
  const [appliedVersion, setAppliedVersion] = useState<number>(loadAppliedVersion);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const response = await apiClient.listStrategies();
        const items = Array.isArray(response.items) ? response.items : [];
        const hydrated = items.map((item: any) => ({
          id: item.id,
          name: item.name || item.id,
          code: '',
          filePath: item.filePath,
          lastModified: item.lastModified,
          sizeBytes: item.sizeBytes,
          appliedVersion,
        }));
        setStrategies(hydrated);
        if (!selectedId && hydrated[0]) {
          setSelectedId(hydrated[0].id);
          persistSelectedId(hydrated[0].id);
        }
      } catch {
        /* ignore */
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const fetchCode = async () => {
      try {
        const response = await apiClient.getStrategy(selectedId);
        const item = response.item;
        if (!item) return;
        setAppliedVersion(item.lastModified);
        persistAppliedVersion(item.lastModified);
        setStrategies((prev) =>
          prev.map((strategy) =>
            strategy.id === selectedId
              ? {
                  ...strategy,
                  code: item.code || '',
                  name: item.name || strategy.name,
                  filePath: item.filePath,
                  lastModified: item.lastModified,
                  sizeBytes: item.sizeBytes,
                  appliedVersion: item.lastModified,
                }
              : strategy
          )
        );
      } catch {
        /* ignore */
      }
    };

    fetchCode();
  }, [selectedId]);

  const saveStrategy = async (id: string, code: string) => {
    const response = await apiClient.saveStrategy(id, { code });
    const item = response.item;
    const version = item?.lastModified ?? Date.now();
    setAppliedVersion(version);
    persistAppliedVersion(version);
    setStrategies((prev) =>
      prev.map((strategy) =>
        strategy.id === id
          ? {
              ...strategy,
              code,
              filePath: item?.filePath ?? strategy.filePath,
              lastModified: item?.lastModified ?? strategy.lastModified,
              sizeBytes: item?.sizeBytes ?? strategy.sizeBytes,
              appliedVersion: version,
            }
          : strategy
      )
    );
  };

  const refreshFromDisk = async (id: string) => {
    try {
      const response = await apiClient.getStrategy(id);
      const item = response.item;
      if (!item) return;
      setAppliedVersion(item.lastModified);
      persistAppliedVersion(item.lastModified);
      setStrategies((prev) =>
        prev.map((strategy) =>
          strategy.id === id
            ? {
                ...strategy,
                code: item.code || '',
                name: item.name || strategy.name,
                filePath: item.filePath,
                lastModified: item.lastModified,
                sizeBytes: item.sizeBytes,
                appliedVersion: item.lastModified,
              }
            : strategy
        )
      );
    } catch {
      /* ignore */
    }
  };

  const activeStrategy = useMemo(
    () => strategies.find((item) => item.id === selectedId) ?? null,
    [strategies, selectedId]
  );

  return {
    strategies,
    activeStrategy,
    selectedId,
    setSelectedId: (id: string | null) => {
      setSelectedId(id);
      persistSelectedId(id);
    },
    saveStrategy,
    refreshFromDisk,
  };
};
