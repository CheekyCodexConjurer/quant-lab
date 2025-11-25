import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, Time } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, LineData } from 'lightweight-charts';
import { Candle, Trade } from '../types';

interface ChartProps {
  data: Candle[];
  trades?: Trade[];
  lineData?: { time: string | number; value: number }[];
  lineColor?: string;
  timezone?: string;
}

const toDate = (value: Time): Date => {
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  const { year, month, day } = value;
  return new Date(year, month - 1, day);
};

export const LightweightChart: React.FC<ChartProps> = ({ data, trades, lineData, lineColor = '#2962FF', timezone = 'UTC' }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Safety: Dispose existing chart if it exists (e.g. strict mode double mount)
    if (chartRef.current) {
        try {
            chartRef.current.remove();
        } catch (e) {
            // ignore error on disposal
        }
        chartRef.current = null;
    }

    const handleResize = () => {
      // Check if chart matches the current ref and is not disposed
      if (chartContainerRef.current && chartRef.current) {
        try {
             chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        } catch (e) {
            // ignore error if chart is already disposed
        }
      }
    };

    // Initialize Chart
    const timeFormatter = (timeValue: Time) => {
      const date = toDate(timeValue);
      if (Number.isNaN(date.getTime())) {
        return String(timeValue);
      }
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour12: false,
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#000000', 
      },
      grid: {
        vertLines: { visible: false }, 
        horzLines: { visible: false }, 
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 400,
      timeScale: {
        borderColor: '#e2e8f0',
      },
      localization: {
        timeFormatter,
      },
    });
    
    chartRef.current = chart;

    // Add Series using v5 API
    const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a', 
        downColor: '#ef5350', 
        borderVisible: false, 
        wickUpColor: '#26a69a', 
        wickDownColor: '#ef5350' 
    });
    
    if (data && data.length > 0) {
        candleSeries.setData(data as unknown as CandlestickData<Time>[]);
    }

    if (lineData && lineData.length > 0) {
        const lineSeries = chart.addSeries(LineSeries, { color: lineColor, lineWidth: 2 });
        lineSeries.setData(lineData as unknown as LineData<Time>[]);
    }

    if (trades && trades.length > 0) {
        const markers = trades.map(t => ({
            time: t.exitTime as Time,
            position: (t.direction === 'long' ? 'aboveBar' : 'belowBar') as "aboveBar" | "belowBar",
            color: t.profit > 0 ? '#26a69a' : '#ef5350',
            shape: (t.direction === 'long' ? 'arrowDown' : 'arrowUp') as "arrowDown" | "arrowUp",
            text: t.profit > 0 ? 'WIN' : 'LOSS',
        }));
        // @ts-ignore
        candleSeries.setMarkers(markers);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        try {
            chartRef.current.remove();
        } catch (e) {
            // ignore
        }
        chartRef.current = null; // Important: Nullify ref to prevent "Object is disposed" error
      }
    };
  }, [data, trades, lineData, lineColor, timezone]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
};
