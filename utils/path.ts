export const normalizeSlashes = (value: string) =>
  String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

export const ensureRootedPath = (root: string, value?: string) => {
  const cleanRoot = normalizeSlashes(root || '');
  if (!cleanRoot) return '';
  const normalized = normalizeSlashes(value || '');
  if (!normalized) return cleanRoot;
  const segments = normalized.split('/').filter(Boolean);
  const rootLower = cleanRoot.toLowerCase();
  if (segments.some((segment) => segment.toLowerCase() === rootLower)) {
    return normalized;
  }
  if (normalized.toLowerCase().startsWith(rootLower)) {
    return normalized;
  }
  return `${cleanRoot}/${normalized}`;
};

export const toRelativePath = (root: string, value?: string) => {
  const cleanRoot = normalizeSlashes(root || '');
  const normalized = normalizeSlashes(value || '');
  if (!normalized) return '';
  const segments = normalized.split('/').filter(Boolean);
  const reversedIndex = segments
    .slice()
    .reverse()
    .findIndex((segment) => segment.toLowerCase() === cleanRoot.toLowerCase());
  const rootIndex = reversedIndex === -1 ? -1 : segments.length - 1 - reversedIndex;
  if (rootIndex >= 0) {
    return segments.slice(rootIndex + 1).join('/');
  }
  return normalized;
};

export const truncateMiddle = (value: string, max = 42) => {
  if (!value) return '';
  if (value.length <= max) return value;
  const head = value.slice(0, Math.floor(max / 2) - 2);
  const tail = value.slice(value.length - Math.ceil(max / 2) + 2);
  return `${head}...${tail}`;
};
