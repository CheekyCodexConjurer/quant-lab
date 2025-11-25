import { useState } from 'react';
import { Candle, BacktestResult } from '../types';
import { runBacktest } from '../services/backtestEngine';

export const useBacktest = () => {
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);

  const runSimulation = (data: Candle[]) => {
    const result = runBacktest(data);
    setBacktestResult(result);
    return result;
  };

  return {
    backtestResult,
    runSimulation,
    clearBacktest: () => setBacktestResult(null),
  };
};
