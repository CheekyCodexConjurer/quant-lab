import { ensureRootedPath, normalizeSlashes, toRelativePath } from '../path';

export const INDICATOR_ROOT = 'indicators';
export const INDICATOR_FOLDERS_KEY = 'thelab.indicatorFolders';

export const toIndicatorRelativePath = (filePath?: string | null) => {
  if (!filePath) return undefined;
  const normalized = ensureRootedPath(INDICATOR_ROOT, filePath);
  const rel = toRelativePath(INDICATOR_ROOT, normalized);
  return rel ? `${INDICATOR_ROOT}/${rel}` : INDICATOR_ROOT;
};

export const normalizeIndicatorFolder = (folderPath?: string) => {
  const normalized = normalizeSlashes(folderPath || INDICATOR_ROOT);
  if (!normalized) return INDICATOR_ROOT;
  return normalized.toLowerCase().startsWith(INDICATOR_ROOT) ? normalized : `${INDICATOR_ROOT}/${normalized}`;
};

