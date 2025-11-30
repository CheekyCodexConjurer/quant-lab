import { useEffect } from 'react';
import { LightweightChartHandle } from '../../components/LightweightChart';

const VIEWPORT_CACHE: Record<string, { from: number; to: number } | null> = {};

export const useChartViewportCache = (
  chartRef: React.RefObject<LightweightChartHandle>,
  viewportKey: string
) => {
  useEffect(() => {
    const handle = chartRef.current;
    if (handle) {
      const saved = VIEWPORT_CACHE[viewportKey];
      if (saved) {
        handle.setVisibleRange(saved);
      } else {
        handle.resetView();
      }
    }

    return () => {
      const latest = chartRef.current?.getVisibleRange();
      VIEWPORT_CACHE[viewportKey] = latest || null;
    };
  }, [chartRef, viewportKey]);
};

