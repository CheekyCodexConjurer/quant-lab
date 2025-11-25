import { useEffect, useState } from 'react';
import { TICK_PRESETS } from '../constants/markets';
import { apiClient } from '../services/api/client';

export type BasisType = 'median' | 'regression';

export const useNormalizationSettings = (symbol: string) => {
  const [normTimezone, setNormTimezone] = useState('America/Sao_Paulo');
  const [normBasis, setNormBasis] = useState<BasisType>('median');
  const [normTickSize, setNormTickSize] = useState(TICK_PRESETS[symbol] ?? 0.01);
  const [isCustomTick, setIsCustomTick] = useState(false);
  const [gapQuantEnabled, setGapQuantEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchRemoteSettings = async () => {
      try {
        const remote = await apiClient.getNormalization();
        setNormTimezone(remote.timezone || 'America/Sao_Paulo');
        setNormBasis((remote.basis as BasisType) || 'median');
        setNormTickSize(remote.tickSize ?? TICK_PRESETS[symbol] ?? 0.01);
        const gap = remote.gapQuantization || {};
        setGapQuantEnabled(Boolean(gap.enabled));
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
        timezone: normTimezone,
        basis: normBasis,
        tickSize: normTickSize,
        gapQuantization: {
          enabled: gapQuantEnabled,
        },
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
    gapQuantEnabled,
    setGapQuantEnabled,
  };
};
