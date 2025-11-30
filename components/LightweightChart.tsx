import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineSeries,
  LineStyle,
  Time,
  UTCTimestamp,
  createChart,
} from 'lightweight-charts';
import type { SeriesMarker } from 'lightweight-charts';
import { Candle, Trade, ChartAppearance, IndicatorMarker } from '../types';
import { deriveMinBarSpacing, formatTickLabel, formatTooltipLabel, timeframeToMinutes, toTimestampSeconds } from '../utils/timeFormat';

interface ChartProps {
  data: Candle[];
  trades?: Trade[];
  lines?: { id: string; data: { time: string | number; value: number }[]; color?: string; style?: 'solid' | 'dashed' }[];
  indicatorMarkers?: IndicatorMarker[];
  timezone?: string;
  timeframe?: string;
  appearance: ChartAppearance;
}

export type LightweightChartHandle = {
  resetView: () => void;
  focusTime: (time: string | number) => void;
  getVisibleRange: () => { from: number; to: number } | null;
  setVisibleRange: (range: { from: number; to: number } | null) => void;
};

type CandlePoint = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
};

export const LightweightChart = forwardRef<LightweightChartHandle, ChartProps>(
  ({ data, trades, lines, indicatorMarkers, timezone = 'UTC', timeframe, appearance }, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesMapRef = useRef<Record<string, ISeriesApi<'Line'>>>({});

  const resetView = () => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    timeScale.resetTimeScale();
    timeScale.fitContent();
    try {
      chartRef.current.priceScale('right').applyOptions({ autoScale: true });
      candleSeriesRef.current?.priceScale().applyOptions({ autoScale: true });
    } catch {
      /* ignore runtime chart errors */
    }
  };

  const focusTime = (time: string | number) => {
    if (!chartRef.current) return;
    const ts = toTimestampSeconds(time);
    if (ts === null) return;
    const timeScale = chartRef.current.timeScale();
    const current = timeScale.getVisibleRange();
    const center = ts as UTCTimestamp;
    if (current && typeof current.from === 'number' && typeof current.to === 'number') {
      const span = (current.to as number) - (current.from as number);
      const from = (center - span) as UTCTimestamp;
      const to = center;
      try {
        timeScale.setVisibleRange({ from, to });
      } catch {
        /* ignore */
      }
    } else {
      try {
        timeScale.setVisibleRange({ from: center, to: center });
      } catch {
        /* ignore */
      }
    }
  };

  const getVisibleRange = () => {
    if (!chartRef.current) return null;
    const range = chartRef.current.timeScale().getVisibleRange();
    if (!range || typeof range.from !== 'number' || typeof range.to !== 'number') return null;
    return {
      from: range.from as number,
      to: range.to as number,
    };
  };

  const setVisibleRange = (range: { from: number; to: number } | null) => {
    if (!chartRef.current || !range) return;
    const timeScale = chartRef.current.timeScale();
    try {
      timeScale.setVisibleRange({
        from: range.from as UTCTimestamp,
        to: range.to as UTCTimestamp,
      });
    } catch {
      /* ignore */
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      resetView,
      focusTime,
      getVisibleRange,
      setVisibleRange,
    }),
    []
  );

  // Mount chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: appearance.backgroundColor },
        textColor: appearance.scaleTextColor,
        fontSize: appearance.scaleTextSize,
      },
      grid: {
        vertLines: { color: appearance.gridEnabled ? appearance.gridColor : '#ffffff00' },
        horzLines: { color: appearance.gridEnabled ? appearance.gridColor : '#ffffff00' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#94a3b8',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0f172a',
        },
        horzLine: {
          color: '#cbd5e1',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0f172a',
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: timeframeToMinutes(timeframe) < 1,
        tickMarkFormatter: (time: Time) => formatTickLabel(time, timezone, timeframe),
        minBarSpacing: deriveMinBarSpacing(timeframe),
        borderColor: '#e2e8f0',
      },
      localization: {
        timeFormatter: (time: Time) => formatTooltipLabel(time, timezone),
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 400,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: appearance.candleUp.body,
      downColor: appearance.candleDown.body,
      borderUpColor: appearance.candleUp.border,
      borderDownColor: appearance.candleDown.border,
      wickUpColor: appearance.candleUp.wick,
      wickDownColor: appearance.candleDown.wick,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const handleResize = () => {
      if (!chartContainerRef.current || !chartRef.current) return;
      try {
        const { width, height } = chartContainerRef.current.getBoundingClientRect();
        chartRef.current.applyOptions({ width, height });
      } catch {
        /* ignore */
      }
    };

    window.addEventListener('resize', handleResize);
    const observer = new ResizeObserver(handleResize);
    observer.observe(chartContainerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch {
          /* ignore */
        }
      }
      chartRef.current = null;
      candleSeriesRef.current = null;
      lineSeriesMapRef.current = {};
    };
  }, []);

  // Update scale / formatters on timeframe/timezone changes without recreating
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.timeScale().applyOptions({
      timeVisible: true,
      secondsVisible: timeframeToMinutes(timeframe) < 1,
      tickMarkFormatter: (time: Time) => formatTickLabel(time, timezone, timeframe),
      minBarSpacing: deriveMinBarSpacing(timeframe),
    });
    chartRef.current.applyOptions({
      localization: {
        timeFormatter: (time: Time) => formatTooltipLabel(time, timezone),
      },
    });
  }, [timeframe, timezone]);

  // Update appearance dynamically without remounting the chart
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: appearance.backgroundColor },
        textColor: appearance.scaleTextColor,
        fontSize: appearance.scaleTextSize,
      },
      grid: {
        vertLines: { color: appearance.gridEnabled ? appearance.gridColor : '#ffffff00' },
        horzLines: { color: appearance.gridEnabled ? appearance.gridColor : '#ffffff00' },
      },
    });
    candleSeriesRef.current.applyOptions({
      upColor: appearance.candleUp.body,
      downColor: appearance.candleDown.body,
      borderUpColor: appearance.candleUp.border,
      borderDownColor: appearance.candleDown.border,
      wickUpColor: appearance.candleUp.wick,
      wickDownColor: appearance.candleDown.wick,
    });
  }, [appearance]);

  // Update candle data when it changes
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const normalizedData = (data || [])
      .map((candle) => {
        const ts = toTimestampSeconds(candle.time);
        if (ts === null) return null;
        return {
          time: ts,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        };
      })
      .filter(Boolean) as CandlePoint[];
    candleSeriesRef.current.setData(normalizedData);
  }, [data]);

  // Update line series when they change
  useEffect(() => {
    if (!chartRef.current) return;
    const palette = ['#2962FF', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#0ea5e9'];
    const incoming = Array.isArray(lines) ? lines : [];

    // Remove stale series
    Object.keys(lineSeriesMapRef.current).forEach((id) => {
      const stillExists = incoming.some((line) => line?.id === id);
      if (!stillExists) {
        try {
          chartRef.current?.removeSeries(lineSeriesMapRef.current[id]);
        } catch {
          /* ignore */
        }
        delete lineSeriesMapRef.current[id];
      }
    });

    incoming.forEach((line, idx) => {
      if (!line || !Array.isArray(line.data)) return;
      const color = line.color || palette[idx % palette.length];
      const style = line.style === 'dashed' ? LineStyle.Dashed : LineStyle.Solid;
      let series = lineSeriesMapRef.current[line.id];
      if (!series) {
        series = chartRef.current!.addSeries(LineSeries, {
          color,
          lineWidth: 2,
          lineStyle: style,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        lineSeriesMapRef.current[line.id] = series;
      } else {
        series.applyOptions({ color, lineStyle: style });
      }
      const normalized = line.data
        .map((point) => {
          const ts = toTimestampSeconds(point.time);
          if (ts === null) return null;
          return { time: ts, value: point.value };
        })
        .filter(Boolean) as { time: UTCTimestamp; value: number }[];
      series.setData(normalized);
    });
  }, [lines]);

  // Update markers when trades or indicator markers change
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const series = candleSeriesRef.current as any;
    if (typeof series?.setMarkers !== 'function') {
      return;
    }

    const combined: SeriesMarker<UTCTimestamp>[] = [];

    if (trades && trades.length > 0) {
      const tradeMarkers = trades
        .map((t) => {
          const anchor = t.exitTime ?? t.entryTime;
          const ts = anchor ? toTimestampSeconds(anchor) : null;
          if (ts === null) return null;
          const profitable = t.profit >= 0;
          const isLong = t.direction === 'long';
          return {
            time: ts,
            position: isLong ? 'aboveBar' : 'belowBar',
            color: profitable ? '#26a69a' : '#ef5350',
            shape: isLong ? 'arrowDown' : 'arrowUp',
            text: t.profit.toFixed(2),
          } as SeriesMarker<UTCTimestamp>;
        })
        .filter(Boolean) as SeriesMarker<UTCTimestamp>[];
      combined.push(...tradeMarkers);
    }

    if (indicatorMarkers && indicatorMarkers.length > 0) {
      const overlayMarkers = indicatorMarkers
        .map((m) => {
          const ts = toTimestampSeconds(m.time);
          if (ts === null) return null;
          const kind = (m.kind || '').toLowerCase();
          const isBullish = /buy|long|bull|protected-low/.test(kind);
          const isBearish = /sell|short|bear|protected-high/.test(kind);
          const position = isBullish ? 'belowBar' : 'aboveBar';
          const shape = isBullish ? 'arrowUp' : isBearish ? 'arrowDown' : 'circle';
          const color = isBullish ? '#22c55e' : isBearish ? '#ef4444' : '#64748b';
          const text = kind ? kind.toUpperCase() : '';
          return {
            time: ts,
            position,
            color,
            shape,
            text,
          } as SeriesMarker<UTCTimestamp>;
        })
        .filter(Boolean) as SeriesMarker<UTCTimestamp>[];
      combined.push(...overlayMarkers);
    }

    series.setMarkers(combined);
  }, [trades, indicatorMarkers]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
});

LightweightChart.displayName = 'LightweightChart';
