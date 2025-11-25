import { Candle } from '../types';

export type GapQuantizationOptions = {
  enabled: boolean;
};

// Adjust all candles so each open equals the previous close (gapless view).
export function applyGapQuantization(candles: Candle[], { enabled }: GapQuantizationOptions): Candle[] {
  if (!enabled || !candles || candles.length === 0) return candles;
  const result: Candle[] = [];
  let prevClose = candles[0].close;
  result.push({ ...candles[0] });

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const open = prevClose;
    const close = current.close;
    const high = Math.max(open, current.high, current.low, current.close);
    const low = Math.min(open, current.high, current.low, current.close);

    result.push({
      ...current,
      open,
      high,
      low,
      close,
    });
    prevClose = close;
  }

  return result;
}
