const APPLIED_VERSIONS_KEY = 'thelab.indicators.appliedVersions';
const SELECTED_ID_KEY = 'thelab.indicators.selectedId';
const NAMES_KEY = 'thelab.indicators.names';
const ORDER_KEY = 'thelab.indicators.order';

const safeReadJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const safeWrite = (key: string, value: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    /* ignore */
  }
};

export const loadAppliedVersions = () => safeReadJson<Record<string, number>>(APPLIED_VERSIONS_KEY, {});
export const persistAppliedVersions = (versions: Record<string, number>) =>
  safeWrite(APPLIED_VERSIONS_KEY, JSON.stringify(versions));

export const loadSelectedIndicatorId = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SELECTED_ID_KEY);
  } catch {
    return null;
  }
};
export const persistSelectedIndicatorId = (id: string | null) => safeWrite(SELECTED_ID_KEY, id);

export const loadIndicatorNames = () => safeReadJson<Record<string, string>>(NAMES_KEY, {});
export const persistIndicatorNames = (names: Record<string, string>) =>
  safeWrite(NAMES_KEY, JSON.stringify(names));

export const loadIndicatorOrder = () => safeReadJson<string[]>(ORDER_KEY, []);
export const persistIndicatorOrder = (order: string[]) => safeWrite(ORDER_KEY, JSON.stringify(order));
