import { useEffect, useMemo, useState } from 'react';
import { Candle, CustomIndicator, IndicatorOverlay, IndicatorSettingsValues, StrategyLabError } from '../types';
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
import { normalizeSlashes } from '../utils/path';
import { INDICATOR_ROOT, toIndicatorRelativePath } from '../utils/indicators/indicatorPaths';
import { useIndicatorWorkspaceFolders } from './indicators/useIndicatorWorkspaceFolders';
import { useIndicatorExecution } from './indicators/useIndicatorExecution';
import { useIndicatorSettingsState } from './indicators/useIndicatorSettingsState';
import { useIndicatorActivation } from './indicators/useIndicatorActivation';

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

export const useIndicators = (data: Candle[]) => {
  const [indicators, setIndicators] = useState<CustomIndicator[]>([]);
  const [selectedIndicatorId, setSelectedIndicatorIdState] = useState<string | null>(loadSelectedIndicatorId);
  const [appliedVersions, setAppliedVersions] = useState<Record<string, number>>(loadAppliedVersions);
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>(loadIndicatorNames);
  const [indicatorOrder, setIndicatorOrder] = useState<string[]>(loadIndicatorOrder);
  const { indicatorSettings, updateIndicatorSettings, resetIndicatorSettings } = useIndicatorSettingsState();
  const {
    indicatorFolders,
    addIndicatorFolder,
    removeIndicatorFolder,
    ensureIndicatorFolder,
  } = useIndicatorWorkspaceFolders();
  const {
    indicatorData,
    indicatorOverlays,
    indicatorErrors,
    indicatorErrorDetails,
    forceRefreshIndicator,
  } = useIndicatorExecution({
    data,
    indicators,
    indicatorSettings,
  });

  const setSelectedIndicatorId = (id: string | null) => {
    setSelectedIndicatorIdState(id);
    persistSelectedIndicatorId(id);
  };

  const updateOrder = (next: string[]) => {
    setIndicatorOrder(next);
    persistIndicatorOrder(next);
  };

  const { setIndicatorActive, toggleActiveIndicator: toggleActiveIndicatorInternal } = useIndicatorActivation({
    indicators,
    setIndicators,
  });

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

  const createIndicator = (folderPath?: string) => {
    const now = Date.now();
    const baseName = 'New_Indicator';
    const id = `${baseName}_${now}`;
    const normalizedFolder = ensureIndicatorFolder(folderPath);
    const filePath = `${normalizedFolder}/${baseName}.py`;
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
    await toggleActiveIndicatorInternal(id);
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
      // Invalida cache de execução para este indicador, garantindo que
      // o próximo ciclo após o refresh reavalie o código atualizado.
      forceRefreshIndicator(id);
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
    indicatorFolders,
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
    indicatorSettings,
    updateIndicatorSettings,
    resetIndicatorSettings,
    setIndicatorActive,
  };
};
