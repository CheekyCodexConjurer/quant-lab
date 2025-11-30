import { useEffect, useState } from 'react';
import { INDICATOR_FOLDERS_KEY, normalizeIndicatorFolder } from '../../utils/indicators/indicatorPaths';
import { normalizeSlashes } from '../../utils/path';

export type IndicatorFoldersState = {
  indicatorFolders: string[];
  addIndicatorFolder: (folderPath: string) => void;
  removeIndicatorFolder: (folderPath: string) => void;
  ensureIndicatorFolder: (folderPath: string | undefined) => string;
};

const loadInitialFolders = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(INDICATOR_FOLDERS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((folder) => normalizeSlashes(String(folder))).filter(Boolean);
  } catch {
    return [];
  }
};

export const useIndicatorWorkspaceFolders = (): IndicatorFoldersState => {
  const [indicatorFolders, setIndicatorFolders] = useState<string[]>(loadInitialFolders);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(INDICATOR_FOLDERS_KEY, JSON.stringify(indicatorFolders));
    } catch {
      /* ignore */
    }
  }, [indicatorFolders]);

  const addIndicatorFolder = (folderPath: string) => {
    const normalized = normalizeIndicatorFolder(folderPath);
    setIndicatorFolders((prev) => {
      if (!normalized) return prev;
      return Array.from(new Set([...prev, normalized]));
    });
  };

  const removeIndicatorFolder = (folderPath: string) => {
    const normalized = normalizeIndicatorFolder(folderPath);
    setIndicatorFolders((prev) =>
      prev.filter((folder) => normalizeSlashes(folder) !== normalizeSlashes(normalized))
    );
  };

  const ensureIndicatorFolder = (folderPath: string | undefined): string => {
    const normalized = normalizeIndicatorFolder(folderPath);
    setIndicatorFolders((prev) => {
      if (prev.some((folder) => normalizeSlashes(folder) === normalizeSlashes(normalized))) {
        return prev;
      }
      return Array.from(new Set([...prev, normalized]));
    });
    return normalized;
  };

  return {
    indicatorFolders,
    addIndicatorFolder,
    removeIndicatorFolder,
    ensureIndicatorFolder,
  };
};
