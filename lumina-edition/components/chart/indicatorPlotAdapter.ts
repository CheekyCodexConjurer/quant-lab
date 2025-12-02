import { IndicatorOverlay, IndicatorPlot } from '../../../types';
import { toTimestampSeconds } from '../../../utils/timeFormat';

type LineStyle = 'solid' | 'dashed';

export type ChartLineInput = {
  id: string;
  color: string;
  style?: LineStyle;
  lineWidth?: number;
  data: { time: string | number; value: number }[];
};

export type ChartMarkerInput = {
  time: string | number;
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown' | 'circle';
  text?: string;
};

const DEFAULT_COLOR = '#64748b';

const buildLinesFromPlots = (plots: IndicatorPlot[], fallbackColor: string): ChartLineInput[] => {
  const lines: ChartLineInput[] = [];

  plots.forEach((plot) => {
    if (!plot || plot.type !== 'line') return;
    const color = plot.style?.color || fallbackColor || DEFAULT_COLOR;
    const lineWidth = typeof plot.style?.width === 'number' ? plot.style?.width : 2;
    const style: LineStyle = plot.style?.dashed ? 'dashed' : 'solid';
    const data = (plot.data || [])
      .map((point: any) => {
        const ts = toTimestampSeconds(point.time);
        if (ts === null || typeof point.value !== 'number') return null;
        return { time: point.time, value: point.value };
      })
      .filter(Boolean) as { time: string | number; value: number }[];
    if (!data.length) return;
    lines.push({
      id: plot.id,
      color,
      style,
      lineWidth,
      data,
    });
  });

  // hline plots -> dashed horizontal segments
  plots.forEach((plot) => {
    if (!plot || plot.type !== 'hline') return;
    const color = plot.style?.color || '#000000';
    const lineWidth = typeof plot.style?.width === 'number' ? plot.style?.width : 1;
    const style: LineStyle = plot.style?.dashed === false ? 'solid' : 'dashed';
    (plot.data || []).forEach((segment: any, idx: number) => {
      const tsStart = toTimestampSeconds(segment.timeStart);
      const tsEnd = toTimestampSeconds(segment.timeEnd);
      if (tsStart === null || tsEnd === null || typeof segment.price !== 'number') return;
      const id = `${plot.id}:${idx}`;
      lines.push({
        id,
        color,
        style,
        lineWidth,
        data: [
          { time: segment.timeStart, value: segment.price },
          { time: segment.timeEnd, value: segment.price },
        ],
      });
    });
  });

  return lines;
};

const buildMarkersFromPlots = (plots: IndicatorPlot[]): ChartMarkerInput[] => {
  const markers: ChartMarkerInput[] = [];

  plots.forEach((plot) => {
    if (!plot || (plot.type !== 'marker' && plot.type !== 'label')) return;
    const isMarker = plot.type === 'marker';
    const baseColor = plot.style?.color || (isMarker ? '#64748b' : '#0f172a');
    const defaultShape =
      (plot.style?.shape as 'arrowUp' | 'arrowDown' | 'circle' | undefined) || 'circle';

    (plot.data || []).forEach((point: any) => {
      const ts = toTimestampSeconds(point.time);
      if (ts === null) return;
      const value = point.value;
      if (value !== undefined && typeof value !== 'number') return;

      const explicitPosition =
        point.position === 'aboveBar' || point.position === 'belowBar'
          ? (point.position as 'aboveBar' | 'belowBar')
          : undefined;

      const color =
        (typeof point.color === 'string' && point.color) ||
        plot.style?.color ||
        baseColor;

      const rawKind =
        (typeof point.kind === 'string' && point.kind) || (plot.kind ? String(plot.kind) : '');
      const kind = rawKind.toLowerCase();

      const isBullish = /buy|long|bull/.test(kind);
      const isBearish = /sell|short|bear/.test(kind);

      const position: 'aboveBar' | 'belowBar' =
        explicitPosition || (isBullish ? 'belowBar' : 'aboveBar');

      const shape =
        (point.shape as 'arrowUp' | 'arrowDown' | 'circle' | undefined) ||
        defaultShape ||
        (isMarker ? 'circle' : 'circle');

      const text =
        typeof point.text === 'string' && point.text
          ? point.text
          : plot.type === 'label' && plot.kind
            ? plot.kind.toUpperCase()
            : undefined;

      markers.push({
        time: point.time,
        position,
        color,
        shape,
        text,
      });
    });
  });

  return markers;
};

export const buildChartInputsFromOverlay = (
  overlay: IndicatorOverlay | undefined,
  fallbackColor: string
): { lines: ChartLineInput[]; markers: ChartMarkerInput[] } => {
  if (!overlay) {
    return { lines: [], markers: [] };
  }

  const plots = overlay.plots || [];
  if (!plots.length) {
    return { lines: [], markers: [] };
  }

  const lines = buildLinesFromPlots(plots, fallbackColor);
  const markers = buildMarkersFromPlots(plots);
  return { lines, markers };
};
