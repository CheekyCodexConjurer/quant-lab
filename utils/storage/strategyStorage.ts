const ORDER_KEY = 'thelab.strategies.order';

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

export const loadStrategyOrder = () => safeReadJson<string[]>(ORDER_KEY, []);
export const persistStrategyOrder = (order: string[]) => safeWrite(ORDER_KEY, JSON.stringify(order));
