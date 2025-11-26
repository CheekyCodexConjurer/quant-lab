import { useState } from 'react';
import { Candle, BacktestResult } from '../types';
import { runBacktest } from '../services/backtestEngine';

export const useBacktest = () => {
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);

  const runSimulation = (data: Candle[]) => {
    const result = { ...runBacktest(data), source: 'local' as const };
    setBacktestResult(result);
    return result;
  };

  return {
    backtestResult,
    runSimulation,
    setExternalResult: (result: BacktestResult | null) => setBacktestResult(result),
    clearBacktest: () => setBacktestResult(null),
  };
};
