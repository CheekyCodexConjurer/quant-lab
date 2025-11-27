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
import { Candle, Trade, ChartAppearance } from '../types';
import { deriveMinBarSpacing, formatTickLabel, formatTooltipLabel, timeframeToMinutes, toTimestampSeconds } from '../utils/timeFormat';

interface ChartProps {
  data: Candle[];
  trades?: Trade[];
  lines?: { id: string; data: { time: string | number; value: number }[]; color?: string }[];
  timezone?: string;
  timeframe?: string;
  appearance: ChartAppearance;
}

export type LightweightChartHandle = {
  resetView: () => void;
};

type CandlePoint = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
};

export const LightweightChart = forwardRef<LightweightChartHandle, ChartProps>(({
  data,
  trades,
  lines,
  timezone = 'UTC',
  timeframe,
  appearance,
}, ref) => {
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

  useImperativeHandle(ref, () => ({
    resetView,
  }), []);

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
    resetView();
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
      let series = lineSeriesMapRef.current[line.id];
      if (!series) {
        series = chartRef.current!.addSeries(LineSeries, {
          color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        lineSeriesMapRef.current[line.id] = series;
      } else {
        series.applyOptions({ color });
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

  // Update markers when trades change
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const series = candleSeriesRef.current as any;
    if (typeof series?.setMarkers !== 'function') {
      return;
    }

    if (trades && trades.length > 0) {
      const markers = trades
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
          };
        })
        .filter(Boolean) as SeriesMarker<UTCTimestamp>[];
      series.setMarkers(markers);
    } else {
      series.setMarkers([]);
    }
  }, [trades]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
});

LightweightChart.displayName = 'LightweightChart';
