import { useEffect, useState } from 'react';
import { Candle } from '../types';
import { TICK_PRESETS } from '../constants/markets';
import { apiClient } from '../services/api/client';
import { generateData } from '../utils/mockData';

export const useMarketData = (symbol: string, timeframe: string) => {
  const [data, setData] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.fetchData(symbol, timeframe);
      setData(response.candles ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setData(generateData(500, symbol, timeframe));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe]);

  const getPresetTick = () => TICK_PRESETS[symbol] ?? 0.01;

  return { data, refreshData, getPresetTick, loading, error };
};
