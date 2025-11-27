import { useEffect, useMemo, useState } from 'react';
import { StrategyFile } from '../types';
import { apiClient } from '../services/api/client';
import { loadStrategyOrder, persistStrategyOrder } from '../utils/storage/strategyStorage';

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

  const updateOrder = (next: string[]) => {
    setStrategyOrder(next);
    persistStrategyOrder(next);
  };

const normalizeFolder = (folderPath?: string) => {
  const raw = String(folderPath || 'strategies')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  if (!raw) return 'strategies';
  return raw.toLowerCase().startsWith('strategies') ? raw : `strategies/${raw}`;
};

const normalizePath = (value?: string | null) =>
  String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

export const useStrategies = () => {
  const [strategies, setStrategies] = useState<StrategyFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(loadSelectedId);
  const [appliedVersion, setAppliedVersion] = useState<number>(loadAppliedVersion);
  const [strategyOrder, setStrategyOrder] = useState<string[]>(loadStrategyOrder);

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
        if (strategyOrder.length === 0) {
          const paths = hydrated.map((s) => normalizePath(s.filePath));
          updateOrder(paths);
        }
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
    const strategy = strategies.find((s) => s.id === id);
    const response = await apiClient.saveStrategy(id, { code, filePath: strategy?.filePath });
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

  const createStrategy = async (folderPath?: string, nameOverride?: string, code: string = '') => {
    const now = Date.now();
    const baseName = nameOverride || 'New_Strategy';
    const id = `${baseName}_${now}`;
    const folder = normalizeFolder(folderPath);
    const filePath = `${folder}/${baseName}.py`;
    try {
      const response = await apiClient.saveStrategy(id, { code, filePath });
      const item = response.item;
      const version = item?.lastModified ?? now;
      const newStrategy: StrategyFile = {
        id,
        name: baseName,
        code,
        filePath: item?.filePath || filePath,
        lastModified: item?.lastModified || now,
        sizeBytes: item?.sizeBytes || code.length,
        appliedVersion: version,
      };
      setStrategies((prev) => [...prev, newStrategy]);
      setSelectedId(id);
      persistSelectedId(id);
      setAppliedVersion(version);
      persistAppliedVersion(version);
      updateOrder([...strategyOrder, normalizePath(newStrategy.filePath)]);
    } catch {
      /* ignore */
    }
  };

  const importStrategy = async (filePath: string, code: string) => {
    const response = await apiClient.uploadStrategy({ code, filePath });
    const item = response.item;
    const id = item?.id || filePath;
    const version = item?.lastModified || Date.now();
    setStrategies((prev) => {
      const exists = prev.find((s) => s.id === id);
      if (exists) {
        return prev.map((s) =>
          s.id === id
            ? { ...s, code, filePath: item?.filePath || filePath, lastModified: version, sizeBytes: code.length, appliedVersion: version }
            : s
        );
      }
      return [
        ...prev,
        {
          id,
          name: item?.name || filePath.split('/').pop() || id,
          code,
          filePath: item?.filePath || filePath,
          lastModified: version,
          sizeBytes: code.length,
          appliedVersion: version,
        },
      ];
    });
    const normalized = normalizePath(item?.filePath || filePath);
    if (normalized) {
      const nextOrder = strategyOrder.includes(normalized) ? strategyOrder : [...strategyOrder, normalized];
      updateOrder(nextOrder);
    }
    setSelectedId(id);
    persistSelectedId(id);
    setAppliedVersion(version);
    persistAppliedVersion(version);
  };

  const deleteStrategy = async (id: string) => {
    try {
      await apiClient.deleteStrategy(id);
    } catch {
      /* ignore delete errors */
    }
    setStrategies((prev) => prev.filter((s) => s.id !== id));
    setSelectedId((current) => {
      if (current === id) {
        const remaining = strategies.filter((s) => s.id !== id);
        const next = remaining[0]?.id || null;
        if (next) persistSelectedId(next);
        else persistSelectedId(null);
        return next;
      }
      return current;
    });
    const remainingPaths = strategies.filter((s) => s.id !== id).map((s) => normalizePath(s.filePath));
    updateOrder(strategyOrder.filter((path) => remainingPaths.includes(normalizePath(path))));
  };

  const updateStrategyPath = async (id: string, nextPath: string) => {
    const strategy = strategies.find((s) => s.id === id);
    if (!strategy) return;
    const code = strategy.code || '';
    const response = await apiClient.saveStrategy(id, { code, filePath: nextPath });
    const item = response.item;
    const version = item?.lastModified || Date.now();
    const newId = item?.id || id;
    setStrategies((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              id: newId,
              code,
              filePath: item?.filePath || nextPath,
              lastModified: version,
              sizeBytes: code.length,
              appliedVersion: version,
            }
          : s
      )
    );
    setSelectedId(newId);
    persistSelectedId(newId);
    setAppliedVersion(version);
    persistAppliedVersion(version);
    const prevPath = normalizePath(strategy.filePath);
    const nextNorm = normalizePath(item?.filePath || nextPath);
    if (nextNorm) {
      const reordered = strategyOrder.length
        ? strategyOrder.map((path) => (normalizePath(path) === prevPath ? nextNorm : path))
        : [nextNorm];
      if (!reordered.includes(nextNorm)) reordered.push(nextNorm);
      updateOrder(reordered);
    }
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
    createStrategy,
    importStrategy,
    deleteStrategy,
    updateStrategyPath,
    strategyOrder,
    setStrategyOrder: updateOrder,
  };
};
