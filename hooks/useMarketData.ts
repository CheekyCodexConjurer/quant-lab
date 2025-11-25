import { useEffect, useState } from 'react';
import { Candle } from '../types';
import { generateData } from '../utils/mockData';
import { TICK_PRESETS } from '../constants/markets';

export const useMarketData = (symbol: string, timeframe: string) => {
  const [data, setData] = useState<Candle[]>([]);

  useEffect(() => {
    setData(generateData(500, symbol, timeframe));
  }, [symbol, timeframe]);

  const refreshData = (size = 500) => {
    setData(generateData(size, symbol, timeframe));
  };

  const getPresetTick = () => TICK_PRESETS[symbol] ?? 0.01;

  return { data, refreshData, getPresetTick };
};
