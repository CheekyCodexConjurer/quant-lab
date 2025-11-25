import { useEffect, useState } from 'react';
import { TICK_PRESETS } from '../constants/markets';
import { apiClient } from '../services/api/client';

export type BasisType = 'median' | 'regression';

export const useNormalizationSettings = (symbol: string) => {
  const [normTimezone, setNormTimezone] = useState(true);
  const [normBasis, setNormBasis] = useState<BasisType>('median');
  const [normTickSize, setNormTickSize] = useState(TICK_PRESETS[symbol] ?? 0.01);
  const [isCustomTick, setIsCustomTick] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchRemoteSettings = async () => {
      try {
        const remote = await apiClient.getNormalization();
        setNormTimezone((remote.timezone || 'UTC-3') === 'UTC-3');
        setNormBasis((remote.basis as BasisType) || 'median');
        setNormTickSize(remote.tickSize ?? TICK_PRESETS[symbol] ?? 0.01);
      } catch {
        // ignore errors
      }
    };
    fetchRemoteSettings();
  }, [symbol]);

  useEffect(() => {
    if (!isCustomTick) {
      const preset = TICK_PRESETS[symbol];
      if (preset) {
        setNormTickSize(preset);
      }
    }
  }, [symbol, isCustomTick]);

  const setTickFromPreset = (value: number) => {
    setNormTickSize(value);
    setIsCustomTick(false);
  };

  const overrideTickSize = (value: number) => {
    setNormTickSize(value);
    setIsCustomTick(true);
  };

  const persistSettings = async () => {
    setIsSaving(true);
    try {
      await apiClient.updateNormalization({
        timezone: normTimezone ? 'UTC-3' : 'UTC',
        basis: normBasis,
        tickSize: normTickSize,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    normTimezone,
    setNormTimezone,
    normBasis,
    setNormBasis,
    normTickSize,
    setTickFromPreset,
    overrideTickSize,
    isCustomTick,
    persistSettings,
    isSaving,
  };
};
