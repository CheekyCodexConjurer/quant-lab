import { useMemo } from 'react';
import { useAppState } from '../context/AppStateContext';

export type TimeframeRange = {
  timeframe: string;
  start?: string;
  end?: string;
  count?: number;
};

const CL_TIMEFRAME_ORDER = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN1'];

const sortRanges = (ranges: TimeframeRange[]) => {
  const orderIndex = (tf: string) => {
    const index = CL_TIMEFRAME_ORDER.indexOf(tf.toUpperCase());
    return index === -1 ? CL_TIMEFRAME_ORDER.length + 1 : index;
  };

  return ranges
    .slice()
    .sort((a, b) => {
      const ai = orderIndex(a.timeframe);
      const bi = orderIndex(b.timeframe);
      if (ai !== bi) return ai - bi;
      return a.timeframe.localeCompare(b.timeframe);
    });
};

export const useAssetCoverage = (asset: string) => {
  const { datasetRanges } = useAppState();
  const normalizedAsset = String(asset || '').toUpperCase();

  const ranges = useMemo(() => {
    if (!normalizedAsset) return [];
    const raw = datasetRanges[normalizedAsset] || {};
    const next: TimeframeRange[] = Object.entries(raw).map(([tf, meta]) => ({
      timeframe: String(tf).toUpperCase(),
      start: meta?.start,
      end: meta?.end,
      count: typeof meta?.count === 'number' ? meta.count : undefined,
    }));
    return sortRanges(next);
  }, [datasetRanges, normalizedAsset]);

  return { ranges, isLoading: false, error: null };
};
