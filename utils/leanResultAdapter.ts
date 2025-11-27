import { BacktestResult, Trade } from '../types';

type RawLeanResult = {
  totalTrades?: unknown;
  winRate?: unknown;
  totalProfit?: unknown;
  drawdown?: unknown;
  trades?: unknown;
  equityCurve?: unknown;
  rawStatistics?: unknown;
  source?: unknown;
  jobId?: unknown;
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
};

const normalizeTrades = (value: unknown): Trade[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<Trade> => !!item && typeof item === 'object')
    .map((item, index) => {
      const id = typeof item.id === 'string' && item.id.trim().length ? item.id : `TRD-${index}`;
      const entryTime = (item.entryTime ?? '') as Trade['entryTime'];
      const exitTime = (item.exitTime ?? entryTime) as Trade['exitTime'];
      const entryPrice = toNumber((item as any).entryPrice);
      const exitPrice = toNumber((item as any).exitPrice, entryPrice);
      const direction = (item as any).direction === 'short' ? 'short' : 'long';
      const profit = toNumber((item as any).profit);
      const profitPercent = toNumber((item as any).profitPercent);
      return {
        id,
        entryTime,
        exitTime,
        entryPrice,
        exitPrice,
        direction,
        profit,
        profitPercent,
      };
    });
};

const normalizeEquityCurve = (value: unknown): { time: string | number; value: number }[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((point) => !!point && typeof point === 'object')
    .map((point) => {
      const anyPoint = point as { time?: unknown; value?: unknown; x?: unknown; y?: unknown };
      const time = (anyPoint.time ?? anyPoint.x ?? '') as string | number;
      const val = toNumber(anyPoint.value ?? anyPoint.y);
      return { time, value: val };
    });
};

export const adaptLeanResult = (raw: RawLeanResult | null | undefined, jobId?: string): BacktestResult => {
  const safe = (raw || {}) as RawLeanResult;

  const totalTrades = toNumber(safe.totalTrades);
  const winRate = toNumber(safe.winRate);
  const totalProfit = toNumber(safe.totalProfit);
  const drawdown = toNumber(safe.drawdown);
  const trades = normalizeTrades(safe.trades);
  const equityCurve = normalizeEquityCurve(safe.equityCurve);

  const rawStats =
    safe.rawStatistics && typeof safe.rawStatistics === 'object' && !Array.isArray(safe.rawStatistics)
      ? (safe.rawStatistics as Record<string, string | number>)
      : undefined;

  const base: BacktestResult = {
    totalTrades,
    winRate,
    totalProfit,
    drawdown,
    trades,
    equityCurve,
  };

  return {
    ...base,
    source: 'lean',
    jobId: jobId ?? (typeof safe.jobId === 'string' ? (safe.jobId as string) : undefined),
    rawStatistics: rawStats,
  };
};

