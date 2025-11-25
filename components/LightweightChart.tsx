import React, { useEffect, useRef } from 'react';
import {
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineStyle,
  Time,
  UTCTimestamp,
  createChart,
} from 'lightweight-charts';
import type { SeriesMarker } from 'lightweight-charts';
import { Candle, Trade } from '../types';
import { deriveMinBarSpacing, formatTickLabel, formatTooltipLabel, timeframeToMinutes, toTimestampSeconds } from '../utils/timeFormat';

interface ChartProps {
  data: Candle[];
  trades?: Trade[];
  lineData?: { time: string | number; value: number }[];
  lineColor?: string;
  timezone?: string;
  timeframe?: string;
}

type CandlePoint = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
};

export const LightweightChart: React.FC<ChartProps> = ({
  data,
  trades,
  lineData,
  lineColor = '#2962FF',
  timezone = 'UTC',
  timeframe,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Mount chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#0f172a' },
      grid: {
        vertLines: { color: '#e2e8f0' },
        horzLines: { color: '#f1f5f9' },
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

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceLineVisible: false,
    });
    const trendSeries = chart.addLineSeries({
      color: lineColor,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    lineSeriesRef.current = trendSeries;

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
      lineSeriesRef.current = null;
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
    lineSeriesRef.current?.applyOptions({ color: lineColor });
  }, [timeframe, timezone, lineColor]);

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
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  // Update line data when it changes
  useEffect(() => {
    if (!lineSeriesRef.current || !chartRef.current) return;
    if (lineData && lineData.length > 0) {
      const normalizedLine = lineData
        .map((point) => {
          const ts = toTimestampSeconds(point.time);
          if (ts === null) return null;
          return { time: ts, value: point.value };
        })
        .filter(Boolean) as { time: UTCTimestamp; value: number }[];
      lineSeriesRef.current.setData(normalizedLine);
    } else {
      lineSeriesRef.current.setData([]);
    }
  }, [lineData]);

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
};
