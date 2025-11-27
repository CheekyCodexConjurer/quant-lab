/* eslint-disable no-restricted-globals */
// Lightweight parser that slices a candle array into batches and posts them back.
export {};

self.onmessage = (event: MessageEvent) => {
  try {
    const { text, batchSize = 800, maxCandles } = event.data || {};
    const parsed = JSON.parse(text);
    const raw = Array.isArray(parsed) ? parsed : parsed?.candles;
    if (!Array.isArray(raw)) {
      (self as any).postMessage({ error: 'Invalid candle payload' });
      return;
    }
    const limit = typeof maxCandles === 'number' && maxCandles > 0 ? maxCandles : null;
    const startIndex = limit ? Math.max(raw.length - limit, 0) : 0;
    const trimmed = raw.slice(startIndex);
    let index = 0;
    const total = trimmed.length;
    while (index < total) {
      const batch = trimmed.slice(index, index + batchSize);
      (self as any).postMessage({ batch, done: false });
      index += batch.length;
    }
    (self as any).postMessage({ done: true });
  } catch (error: any) {
    (self as any).postMessage({ error: error?.message || 'Failed to parse candles' });
  }
};
