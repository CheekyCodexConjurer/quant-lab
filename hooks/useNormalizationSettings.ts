import { useEffect, useState } from 'react';
import { TICK_PRESETS } from '../constants/markets';

export type BasisType = 'median' | 'regression';

export const useNormalizationSettings = (symbol: string) => {
  const [normTimezone, setNormTimezone] = useState(true);
  const [normBasis, setNormBasis] = useState<BasisType>('median');
  const [normTickSize, setNormTickSize] = useState(TICK_PRESETS[symbol] ?? 0.01);
  const [isCustomTick, setIsCustomTick] = useState(false);

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

  return {
    normTimezone,
    setNormTimezone,
    normBasis,
    setNormBasis,
    normTickSize,
    setTickFromPreset,
    overrideTickSize,
    isCustomTick,
  };
};
