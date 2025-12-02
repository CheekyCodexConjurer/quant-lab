import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as LightweightCharts from 'lightweight-charts';
import {
  Settings,
  RefreshCw,
  Layers,
  ChevronDown,
  Palette,
  Check,
  Monitor,
  TrendingUp,
  BarChart2,
  Eye,
  EyeOff,
  Star,
  StarOff,
} from 'lucide-react';
import {
  Candle,
  Trade,
  CustomIndicator,
  IndicatorOverlay,
  IndicatorSettingsValues,
} from '../../types';
import { formatTickLabel, formatTooltipLabel, toTimestampSeconds } from '../../utils/timeFormat';
import { IndicatorSettingsModal } from '../../components/chart/IndicatorSettingsModal';
import { buildDefaultIndicatorSettings, getIndicatorSettingsDefinition } from '../../constants/indicatorSettings';
import { ChartContextMenu } from '../../components/chart/ChartContextMenu';
import { useChartContextMenu } from '../../hooks/chart/useChartContextMenu';

type TradingChartProps = {
  activeSymbol?: string;
  onSymbolChange?: (symbol: string) => void;
  activeTimeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
  timeframes?: string[];
  allTimeframes?: string[];
  pinnedTimeframes?: string[];
  onPinnedChange?: (timeframes: string[]) => void;
  candles?: Candle[];
  trades?: Trade[];
  indicators?: CustomIndicator[];
  indicatorData?: Record<string, { time: string | number; value: number }[]>;
  indicatorOverlays?: Record<string, IndicatorOverlay>;
  indicatorOrder?: string[];
  indicatorSettings?: Record<string, IndicatorSettingsValues>;
  onToggleIndicator?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onRefreshIndicator?: (id: string) => void | Promise<void>;
  onUpdateIndicatorSettings?: (id: string, values: IndicatorSettingsValues) => void;
  onResetIndicatorSettings?: (id: string) => void;
  timezoneId?: string;
};

const MAX_DRAWINGS_PER_INDICATOR = 200;

const ORDERED_TIMEFRAMES: string[] = [
  'M1',
  'M3',
  'M5',
  'M15',
  'M30',
  'H1',
  'H2',
  'H4',
  'D1',
  'W1',
  '1M',
];

const getTimeframeOrderIndex = (code: string) => {
  const upper = String(code || '').toUpperCase();
  const idx = ORDERED_TIMEFRAMES.indexOf(upper);
  if (idx !== -1) return idx;
  return ORDERED_TIMEFRAMES.length + upper.charCodeAt(0);
};

const generateMockData = (count = 2000) => {
  const data: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }[] = [];
  let time = new Date('2023-01-01').getTime() / 1000;
  let value = 4000;
  for (let i = 0; i < count; i++) {
    time += 3600; // 1 hour
    const change = (Math.random() - 0.5) * 20;
    value += change;
    data.push({
      time,
      open: value - Math.random() * 5,
      high: value + Math.random() * 10,
      low: value - Math.random() * 10,
      close: value + Math.random() * 5,
    });
  }
  return data;
};

// Dropdown Menu Components
const Menu = ({ isOpen, onClose, children, className = "" }: any) => {
    if (!isOpen) return null;
    return (
        <div className={`absolute top-full mt-2 bg-white/90 backdrop-blur-xl border border-slate-100 shadow-xl rounded-2xl p-2 z-50 min-w-[200px] animate-in fade-in zoom-in-95 duration-200 ${className}`}>
             {children}
             {/* Backdrop for click-outside */}
             <div className="fixed inset-0 z-[-1]" onClick={onClose} />
        </div>
    );
};

export const TradingChart: React.FC<TradingChartProps> = ({
  activeSymbol,
  onSymbolChange,
  activeTimeframe,
  onTimeframeChange,
  timeframes,
  allTimeframes,
  pinnedTimeframes,
  onPinnedChange,
  candles,
  trades,
  indicators,
  indicatorData,
  indicatorOverlays,
  indicatorOrder,
  indicatorSettings,
  onToggleIndicator,
  onToggleVisibility,
  onRefreshIndicator,
  onUpdateIndicatorSettings,
  onResetIndicatorSettings,
  timezoneId,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<LightweightCharts.IChartApi | null>(null);
  const candleSeriesRef = useRef<LightweightCharts.ISeriesApi<"Candlestick"> | null>(null);
  const indicatorSeriesMapRef = useRef<Record<string, LightweightCharts.ISeriesApi<"Line">>>({});

  // State
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [data, setData] = useState<{ time: number; open: number; high: number; low: number; close: number }[]>(
    []
  );
  
  const [config, setConfig] = useState({
      upColor: '#10b981',
      downColor: '#ef4444',
      bg: '#ffffff',
      grid: false,
  });

  const [timeframe, setTimeframe] = useState(activeTimeframe || 'H1');
  const [settingsIndicatorId, setSettingsIndicatorId] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<IndicatorSettingsValues>({});
  const [settingsActiveTab, setSettingsActiveTab] = useState<string>('Inputs');

  useEffect(() => {
    if (activeTimeframe && activeTimeframe !== timeframe) {
      setTimeframe(activeTimeframe);
    }
  }, [activeTimeframe, timeframe]);

  const [timeframeSearch, setTimeframeSearch] = useState('');
  const [timeframeHighlightIndex, setTimeframeHighlightIndex] = useState(0);
  const timeframeSearchInputRef = useRef<HTMLInputElement | null>(null);

  const toggleMenu = (menu: string) => setActiveMenu(activeMenu === menu ? null : menu);

  const {
    contextMenuOpen,
    contextMenuPos,
    contextMenuRef,
    onContextMenu,
    closeContextMenu,
  } = useChartContextMenu();

  const resolvedPinnedTimeframes = useMemo(
    () => Array.from(new Set((pinnedTimeframes || []).map((tf) => String(tf).toUpperCase()))),
    [pinnedTimeframes]
  );

  const knownTimeframes = useMemo(() => {
    const acc = new Set<string>();
    (allTimeframes || []).forEach((tf) => acc.add(String(tf).toUpperCase()));
    (pinnedTimeframes || []).forEach((tf) => acc.add(String(tf).toUpperCase()));
    (timeframes || []).forEach((tf) => acc.add(String(tf).toUpperCase()));
    if (timeframe) acc.add(String(timeframe).toUpperCase());
    return acc;
  }, [allTimeframes, pinnedTimeframes, timeframes, timeframe]);

  const baseMenuTimeframes = useMemo(() => {
    const candidates = ORDERED_TIMEFRAMES.filter((code) => knownTimeframes.has(code));
    if (candidates.length) return candidates;
    const fromAll = Array.from(knownTimeframes);
    fromAll.sort((a, b) => getTimeframeOrderIndex(a) - getTimeframeOrderIndex(b));
    return fromAll;
  }, [knownTimeframes]);

  const visibleMenuTimeframes = useMemo(() => {
    const query = timeframeSearch.trim().toLowerCase();
    if (!query) return baseMenuTimeframes;
    return baseMenuTimeframes.filter((code) => code.toLowerCase().includes(query));
  }, [baseMenuTimeframes, timeframeSearch]);

  useEffect(() => {
    if (activeMenu === 'timeframes') {
      if (timeframeSearchInputRef.current) {
        timeframeSearchInputRef.current.focus();
        timeframeSearchInputRef.current.select();
      }
      const current = String(timeframe || '').toUpperCase();
      const idx = visibleMenuTimeframes.findIndex((code) => code === current);
      setTimeframeHighlightIndex(idx >= 0 ? idx : 0);
    } else {
      setTimeframeSearch('');
    }
  }, [activeMenu, timeframe, visibleMenuTimeframes]);

  const isTimeframeAvailable = (code: string) => {
    if (!allTimeframes || !allTimeframes.length) return true;
    const upper = String(code || '').toUpperCase();
    return allTimeframes.map((tf) => String(tf).toUpperCase()).includes(upper);
  };

  const handleSelectTimeframe = (code: string) => {
    if (!code) return;
    const upper = String(code).toUpperCase();
    if (!isTimeframeAvailable(upper)) return;
    setTimeframe(upper);
    onTimeframeChange?.(upper);
    setActiveMenu(null);
    setTimeframeSearch('');
  };

  const handleTogglePinned = (code: string) => {
    const upper = String(code || '').toUpperCase();
    if (!onPinnedChange) return;
    if (resolvedPinnedTimeframes.includes(upper)) {
      onPinnedChange(resolvedPinnedTimeframes.filter((tf) => tf !== upper));
    } else {
      const updated = [...resolvedPinnedTimeframes, upper];
      updated.sort((a, b) => getTimeframeOrderIndex(a) - getTimeframeOrderIndex(b));
      onPinnedChange(updated);
    }
  };

  // Sync incoming candles into local data series (fallback to mock if vazio)
  useEffect(() => {
    if (candles && candles.length) {
      const mapped = candles
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
        .filter(Boolean) as { time: number; open: number; high: number; low: number; close: number }[];
      setData(mapped);
    } else {
      setData(generateMockData());
    }
  }, [candles]);

  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const tz = timezoneId || 'America/Sao_Paulo';

    const chart = LightweightCharts.createChart(chartContainerRef.current, {
      layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: config.bg },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { visible: config.grid, color: 'rgba(226, 232, 240, 0.4)' },
        horzLines: { visible: config.grid, color: 'rgba(226, 232, 240, 0.4)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      autoSize: true, // v5 support? We use ResizeObserver anyway for robustness
      rightPriceScale: {
        borderColor: 'transparent',
      },
      timeScale: {
        borderColor: 'transparent',
        timeVisible: true,
        tickMarkFormatter: (time: LightweightCharts.Time) =>
          formatTickLabel(time as number, tz, timeframe),
      },
      crosshair: {
        vertLine: {
            labelBackgroundColor: '#0ea5e9',
        },
        horzLine: {
            labelBackgroundColor: '#0ea5e9',
        }
      }
    });

    chartRef.current = chart;

    // Candle Series
    const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
      upColor: config.upColor,
      downColor: config.downColor,
      borderVisible: false,
      wickUpColor: config.upColor,
      wickDownColor: config.downColor,
    });
    candleSeriesRef.current = candleSeries;

    // Fit content
    chart.timeScale().fitContent();

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
        if (entries.length === 0 || entries[0].target !== chartContainerRef.current) return;
        const { width, height } = entries[0].contentRect;
        chart.applyOptions({ width, height });
    });

    chart.applyOptions({
      localization: {
        timeFormatter: (time: LightweightCharts.Time) =>
          formatTooltipLabel(time as number, tz),
      },
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []); // Re-run only on mount, updates handled separately

  // Update scale / formatters on timeframe / timezone change
  useEffect(() => {
    if (!chartRef.current) return;
    const tz = timezoneId || 'America/Sao_Paulo';
    chartRef.current.timeScale().applyOptions({
      timeVisible: true,
      tickMarkFormatter: (time: LightweightCharts.Time) =>
        formatTickLabel(time as number, tz, timeframe),
    });
    chartRef.current.applyOptions({
      localization: {
        timeFormatter: (time: LightweightCharts.Time) =>
          formatTooltipLabel(time as number, tz),
      },
    });
  }, [timezoneId, timeframe]);

  // Update candle data when series or data mudam
  useEffect(() => {
    if (!candleSeriesRef.current || !data.length) return;
    candleSeriesRef.current.setData(data as any);
  }, [data]);

  const handleResetChart = () => {
    if (!chartRef.current) return;
    try {
      const timeScale = chartRef.current.timeScale();
      timeScale.resetTimeScale();
      timeScale.scrollToRealTime();
    } catch {
      /* ignore runtime chart errors */
    }
  };

  const handleMoveToLatestIndicator = () => {
    if (!Array.isArray(indicators) || !indicators.length || !chartRef.current) return;
    let latestTs = -Infinity;
    let latestTime: number | null = null;

    indicators
      .filter((indicator) => indicator.isActive && indicator.isVisible)
      .forEach((indicator) => {
        const series = (indicatorData || {})[indicator.id] || [];
        if (!Array.isArray(series) || !series.length) return;
        const lastPoint = series[series.length - 1];
        const ts = toTimestampSeconds(lastPoint.time);
        if (ts !== null && ts > latestTs) {
          latestTs = ts;
          latestTime = ts;
        }
      });

    if (latestTime === null) return;

    try {
      const timeScale = chartRef.current.timeScale();
      const current = timeScale.getVisibleRange();
      const center = latestTime as any;
      if (current && typeof current.from === 'number' && typeof current.to === 'number') {
        const span = (current.to as number) - (current.from as number);
        const from = (center - span) as any;
        const to = center as any;
        timeScale.setVisibleRange({ from, to });
      } else {
        timeScale.setVisibleRange({ from: center, to: center });
      }
    } catch {
      /* ignore */
    }
  };

  // Update indicator line series (main + overlay series, levels as dashed lines)
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;
    const seriesMap = indicatorSeriesMapRef.current;
    const palette = ['#2962FF', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#0ea5e9'];

    const activeIndicators = Array.isArray(indicators) ? indicators : [];
    const visibleIndicators = activeIndicators.filter((item) => item.isActive && item.isVisible);

    type IncomingLine = {
      id: string;
      color: string;
      style?: 'solid' | 'dashed';
      data: { time: string | number; value: number }[];
    };

    const incoming: IncomingLine[] = [];

    visibleIndicators.forEach((indicator, idx) => {
      const baseColor = palette[idx % palette.length];
      const settingsForIndicator = (indicatorSettings || {})[indicator.id] || {};
      const lineColor =
        typeof settingsForIndicator.lineColor === 'string' && settingsForIndicator.lineColor
          ? (settingsForIndicator.lineColor as string)
          : baseColor;

      const mainSeries = (indicatorData || {})[indicator.id] || [];
      if (mainSeries.length) {
        incoming.push({ id: indicator.id, data: mainSeries, color: lineColor, style: 'solid' });
      }

      const overlay = (indicatorOverlays || {})[indicator.id];
      if (overlay) {
        if (overlay.series) {
          Object.entries(overlay.series).forEach(([key, series]) => {
            if (key === 'main') return;
            const dataPoints = Array.isArray(series) ? series : [];
            if (!dataPoints.length) return;
            incoming.push({
              id: `${indicator.id}:${key}`,
              data: dataPoints,
              color: lineColor,
              style: 'solid',
            });
          });
        }
        if (overlay.levels && overlay.levels.length) {
          const allLevels = overlay.levels;
          const protectedLevels = allLevels.filter((level) =>
            typeof level.kind === 'string' && level.kind.toLowerCase().includes('protected')
          );
          const otherLevels = allLevels.filter(
            (level) =>
              !level.kind || !String(level.kind).toLowerCase().includes('protected')
          );
          const limitedOthers =
            otherLevels.length > MAX_DRAWINGS_PER_INDICATOR
              ? otherLevels.slice(otherLevels.length - MAX_DRAWINGS_PER_INDICATOR)
              : otherLevels;
          const levels = [...limitedOthers, ...protectedLevels];
          levels.forEach((level, levelIdx) => {
            const points = [
              { time: level.timeStart, value: level.price },
              { time: level.timeEnd, value: level.price },
            ];
            incoming.push({
              id: `${indicator.id}:level:${levelIdx}`,
              data: points,
              color: baseColor,
              style: 'dashed',
            });
          });
        }
      }
    });

    // Remove stale series
    Object.keys(seriesMap).forEach((id) => {
      const stillExists = incoming.some((line) => line.id === id);
      if (!stillExists) {
        try {
          chart.removeSeries(seriesMap[id]);
        } catch {
          /* ignore */
        }
        delete seriesMap[id];
      }
    });

    // Upsert / update series
    incoming.forEach((line) => {
      const style =
        line.style === 'dashed'
          ? LightweightCharts.LineStyle.Dashed
          : LightweightCharts.LineStyle.Solid;
      let series = seriesMap[line.id];
      if (!series) {
        series = chart.addSeries(LightweightCharts.LineSeries, {
          color: line.color,
          lineWidth: 2,
          lineStyle: style,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        seriesMap[line.id] = series;
      } else {
        series.applyOptions({ color: line.color, lineStyle: style });
      }

      const normalized = (line.data || [])
        .map((point) => {
          const ts = toTimestampSeconds(point.time);
          if (ts === null) return null;
          return { time: ts as any, value: point.value };
        })
        .filter(Boolean) as { time: number; value: number }[];
      series.setData(normalized as any);
    });
  }, [indicators, indicatorData, indicatorOverlays, indicatorSettings]);

  // Update trade markers + indicator markers from overlays
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const series: any = candleSeriesRef.current;
    if (typeof series.setMarkers !== 'function') return;

    const markers: any[] = [];

    if (Array.isArray(trades) && trades.length) {
      const tradeMarkers = trades
        .map((t) => {
          const anchor = t.exitTime ?? t.entryTime;
          const ts = anchor ? toTimestampSeconds(anchor) : null;
          if (ts === null) return null;
          const profitable = t.profit >= 0;
          const isLong = t.direction === 'long';
          return {
            time: ts as any,
            position: isLong ? 'aboveBar' : 'belowBar',
            color: profitable ? '#22c55e' : '#ef4444',
            shape: isLong ? 'arrowDown' : 'arrowUp',
            text: t.profit.toFixed(2),
          };
        })
        .filter(Boolean);
      markers.push(...tradeMarkers);
    }

    if (indicatorOverlays && Array.isArray(indicators) && indicators.length) {
      const activeIndicators = indicators.filter(
        (indicator) => indicator.isActive && indicator.isVisible
      );
      const overlayMarkers =
        activeIndicators
          .flatMap((indicator) => {
            const raw = indicatorOverlays[indicator.id]?.markers || [];
            const protectedMarkers = raw.filter(
              (m) =>
                m &&
                typeof m.kind === 'string' &&
                m.kind.toLowerCase().includes('protected')
            );
            const otherMarkers = raw.filter(
              (m) =>
                !m?.kind ||
                !String(m.kind).toLowerCase().includes('protected')
            );
            const limitedOthers =
              otherMarkers.length > MAX_DRAWINGS_PER_INDICATOR
                ? otherMarkers.slice(
                    otherMarkers.length - MAX_DRAWINGS_PER_INDICATOR
                  )
                : otherMarkers;
            return [...limitedOthers, ...protectedMarkers];
          })
          .filter((m) => m && m.time) || [];

      overlayMarkers.forEach((m) => {
        const ts = toTimestampSeconds(m.time);
        if (ts === null) return;
        const kind = (m.kind || '').toLowerCase();
        const isBullish = /buy|long|bull|protected-low/.test(kind);
        const isBearish = /sell|short|bear|protected-high/.test(kind);
        const position = isBullish ? 'belowBar' : 'aboveBar';
        const shape = isBullish ? 'arrowUp' : isBearish ? 'arrowDown' : 'circle';
        const color = isBullish ? '#22c55e' : isBearish ? '#ef4444' : '#64748b';
        const text = kind ? kind.toUpperCase() : '';
        markers.push({
          time: ts as any,
          position,
          color,
          shape,
          text,
        });
      });
    }

    series.setMarkers(markers);
  }, [trades, indicatorOverlays, indicators]);

  // Indicator settings modal
  const activeIndicators = Array.isArray(indicators) ? indicators : [];

  // Update Config Effect
  useEffect(() => {
    if (chartRef.current) {
        chartRef.current.applyOptions({
            layout: { background: { type: LightweightCharts.ColorType.Solid, color: config.bg } },
            grid: {
                vertLines: { visible: config.grid },
                horzLines: { visible: config.grid },
            }
        });
    }
    if (candleSeriesRef.current) {
        candleSeriesRef.current.applyOptions({
            upColor: config.upColor,
            downColor: config.downColor,
            wickUpColor: config.upColor,
            wickDownColor: config.downColor,
        });
    }
  }, [config]);

  return (
    <div className="h-full flex flex-col gap-4 animate-in fade-in duration-700">
      
      {/* Toolbar */}
      <div className="bg-white p-2 md:p-3 rounded-2xl shadow-soft flex flex-wrap justify-between items-center gap-4 relative z-20">
        
        {/* Left: Ticker & Timeframe */}
        <div className="flex items-center gap-2 md:gap-4">
           {/* Ticker Selector */}
           <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl">
             {['CL1!', 'ES1!', 'BTC1!'].map(ticker => (
               <button
                 key={ticker}
                 onClick={() => onSymbolChange?.(ticker)}
                 className={`px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                   (activeSymbol || 'CL1!') === ticker
                     ? 'bg-white shadow-sm text-slate-800'
                     : 'text-slate-400 hover:text-slate-600'
                 }`}
               >
                 {ticker}
               </button>
             ))}
           </div>
           
           <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
           
           {/* Timeframe Selector */}
           <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl relative">
             <div className="flex items-center gap-1">
               {Array.from(
                 new Set(
                   (timeframes && timeframes.length ? timeframes : timeframe ? [timeframe] : []).map((tf) =>
                     String(tf).toUpperCase()
                   )
                 )
               )
                 .sort((a, b) => getTimeframeOrderIndex(a) - getTimeframeOrderIndex(b))
                 .map((tf) => (
                   <button
                     key={tf}
                     onClick={() => handleSelectTimeframe(tf)}
                     className={`min-w-[2.25rem] px-2.5 h-8 rounded-lg text-xs font-bold transition-all ${
                       timeframe === tf
                         ? 'bg-slate-800 text-white shadow-md'
                         : 'text-slate-500 hover:bg-slate-200'
                     }`}
                   >
                     {tf}
                   </button>
                 ))}
             </div>

             {/* Timeframe Dropdown Trigger */}
             <div className="relative">
               <button
                 onClick={() => toggleMenu('timeframes')}
                 className={`ml-1 h-8 px-3 rounded-lg flex items-center gap-1 text-xs font-semibold transition-all ${
                   activeMenu === 'timeframes'
                     ? 'bg-sky-100 text-sky-700'
                     : 'bg-white text-slate-600 hover:bg-slate-100'
                 }`}
                 aria-haspopup="listbox"
                 aria-expanded={activeMenu === 'timeframes'}
               >
                 <span>{timeframe}</span>
                 <ChevronDown size={14} />
               </button>

               <Menu
                 isOpen={activeMenu === 'timeframes'}
                 onClose={() => setActiveMenu(null)}
                 className="right-0 w-60"
               >
                 <div
                   className="flex flex-col gap-2 p-2"
                   onKeyDown={(event) => {
                     if (!visibleMenuTimeframes.length) return;
                     if (event.key === 'ArrowDown') {
                       event.preventDefault();
                       setTimeframeHighlightIndex((prev) =>
                         prev + 1 < visibleMenuTimeframes.length ? prev + 1 : prev
                       );
                     } else if (event.key === 'ArrowUp') {
                       event.preventDefault();
                       setTimeframeHighlightIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
                     } else if (event.key === 'Enter') {
                       event.preventDefault();
                       const code = visibleMenuTimeframes[timeframeHighlightIndex];
                       if (code) {
                         handleSelectTimeframe(code);
                       }
                     } else if (event.key === 'Escape') {
                       event.preventDefault();
                       setActiveMenu(null);
                     }
                   }}
                 >
                   <div className="px-1">
                     <input
                       ref={timeframeSearchInputRef}
                       value={timeframeSearch}
                       onChange={(event) => setTimeframeSearch(event.target.value)}
                       placeholder="Search timeframe…"
                       className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-300"
                     />
                   </div>

                   <div className="max-h-64 overflow-y-auto pt-1">
                     {visibleMenuTimeframes.length === 0 ? (
                       <div className="px-2 py-2 text-xs text-slate-400">No timeframes found</div>
                     ) : (
                       <ul className="flex flex-col" role="listbox">
                         {visibleMenuTimeframes.map((code, index) => {
                           const available = isTimeframeAvailable(code);
                           const pinned = resolvedPinnedTimeframes.includes(code);
                           const isActive = String(timeframe || '').toUpperCase() === code;
                           const isHighlighted = timeframeHighlightIndex === index;
                           return (
                              <li key={code}>
                                <div
                                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors ${
                                    !available
                                      ? 'cursor-not-allowed text-slate-300'
                                      : isHighlighted
                                      ? 'bg-sky-50 text-sky-700'
                                      : isActive
                                      ? 'bg-slate-900 text-white'
                                      : 'text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleSelectTimeframe(code)}
                                    disabled={!available}
                                    className={`flex-1 text-left ${
                                      !available ? 'cursor-not-allowed' : ''
                                    }`}
                                  >
                                    {code}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleTogglePinned(code);
                                    }}
                                    className={`ml-2 text-slate-400 hover:text-amber-500 ${
                                      pinned ? 'text-amber-500' : ''
                                    }`}
                                    aria-label={pinned ? 'Unfavorite timeframe' : 'Favorite timeframe'}
                                  >
                                    {pinned ? (
                                      <Star size={14} className="fill-current" />
                                    ) : (
                                      <StarOff size={14} />
                                    )}
                                  </button>
                                </div>
                             </li>
                           );
                         })}
                       </ul>
                     )}
                   </div>
                 </div>
               </Menu>
             </div>
           </div>
        </div>

        {/* Right: Tools & Settings */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Settings / Appearance Menu */}
          <div className="relative">
              <button 
                 onClick={() => toggleMenu('settings')}
                 className={`flex items-center gap-2 px-3 md:px-4 py-2 border rounded-xl text-sm font-medium transition-all shadow-sm
                    ${activeMenu === 'settings' ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'}`}
              >
                <Palette size={16} /> 
                <span className="hidden md:inline">Style</span>
              </button>

              <Menu isOpen={activeMenu === 'settings'} onClose={() => setActiveMenu(null)} className="right-0 w-72">
                  <div className="space-y-4 p-2">
                      <div>
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Candle Colors</label>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <span className="text-xs text-slate-500">Bullish</span>
                                  <div className="flex gap-2">
                                      {['#10b981', '#3b82f6', '#8b5cf6'].map(c => (
                                          <button 
                                            key={c} 
                                            onClick={() => setConfig(prev => ({...prev, upColor: c}))}
                                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${config.upColor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                          />
                                      ))}
                                  </div>
                              </div>
                              <div className="space-y-2">
                                  <span className="text-xs text-slate-500">Bearish</span>
                                  <div className="flex gap-2">
                                      {['#ef4444', '#f97316', '#64748b'].map(c => (
                                          <button 
                                            key={c} 
                                            onClick={() => setConfig(prev => ({...prev, downColor: c}))}
                                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${config.downColor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                          />
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="border-t border-slate-100 pt-4">
                           <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Display</label>
                           <button 
                                onClick={() => setConfig(prev => ({...prev, grid: !prev.grid}))}
                                className="flex items-center justify-between w-full p-2 hover:bg-slate-50 rounded-lg text-sm text-slate-600"
                           >
                               <span>Show Grid Lines</span>
                               {config.grid && <Check size={14} className="text-emerald-500" />}
                           </button>
                      </div>
                  </div>
              </Menu>
          </div>

          <button
            type="button"
            onClick={handleResetChart}
            className="w-10 h-10 flex items-center justify-center bg-lumina-accent text-white rounded-xl shadow-glow hover:bg-lumina-accentDark transition-colors"
            aria-label="Refresh chart view"
            title="Reset zoom and move to latest bar"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Chart Canvas Area - flex-1 ensures it takes all remaining space */}
      <div className="flex-1 bg-white rounded-[2rem] shadow-soft p-1 relative overflow-hidden z-10 border border-slate-50">
        <div
          ref={chartContainerRef}
          className="w-full h-full rounded-[1.8rem] overflow-hidden"
          onContextMenu={onContextMenu}
        />
        
        {/* Floating Legend + Indicator Menu */}
        <div className="absolute top-6 left-6 bg-white/80 backdrop-blur-md p-3 rounded-xl border border-slate-100 shadow-sm text-xs z-20 animate-in fade-in slide-in-from-top-2 duration-700">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.upColor }}></div>
            <span className="font-bold text-slate-700">
              {(activeSymbol || 'CL1!') + ' - Crude Oil Futures'}
            </span>
            <span className="text-slate-400">NYMEX</span>
          </div>
          {Array.isArray(indicators) && indicators.length > 0 && (
            <div className="mt-2 space-y-1">
              {indicators
                .filter((indicator) => indicator.isActive)
                .sort((a, b) => {
                  const nameA = (a.name || a.id).toLowerCase();
                  const nameB = (b.name || b.id).toLowerCase();
                  return nameA.localeCompare(nameB);
                })
                .map((indicator) => {
                  const series = indicatorData?.[indicator.id] || [];
                  const last = series[series.length - 1];
                  const isVisible = indicator.isVisible;
                  return (
                    <div key={indicator.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        <span className="font-bold text-slate-700 truncate">
                          {indicator.name || indicator.id}
                        </span>
                        {last && (
                          <span className="text-slate-400">
                            {Number.isFinite(last.value as number)
                              ? Number(last.value).toFixed(2)
                              : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onToggleVisibility?.(indicator.id)}
                          className="text-slate-400 hover:text-slate-700"
                          aria-label="Toggle visibility"
                        >
                          {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const definition = getIndicatorSettingsDefinition(indicator.id);
                            const baseDefinition =
                              definition ?? {
                                id: indicator.id,
                                title: indicator.name,
                                fields: [],
                              };
                            const defaults = buildDefaultIndicatorSettings(baseDefinition);
                            const existing = (indicatorSettings || {})[indicator.id] || {};
                            setSettingsIndicatorId(indicator.id);
                            setSettingsDraft({ ...defaults, ...existing });
                            const firstTab =
                              (baseDefinition.tabs && baseDefinition.tabs[0]) ||
                              (baseDefinition.fields.find((field) => field.tab)?.tab as string) ||
                              'Inputs';
                            setSettingsActiveTab(firstTab);
                          }}
                          className="text-slate-400 hover:text-slate-700"
                          aria-label="Indicator settings"
                        >
                          <Settings size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleIndicator?.(indicator.id)}
                          className="text-slate-400 hover:text-rose-500"
                          aria-label="Remove indicator"
                        >
                          <Layers size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {contextMenuOpen ? (
            <div ref={contextMenuRef}>
              <ChartContextMenu
                x={contextMenuPos.x}
                y={contextMenuPos.y}
                onReset={handleResetChart}
                onMoveToIndicator={
                  Array.isArray(indicators) && indicators.some((indicator) => indicator.isActive && indicator.isVisible)
                    ? handleMoveToLatestIndicator
                    : undefined
                }
                onClose={closeContextMenu}
              />
            </div>
          ) : null}
        </div>

        {settingsIndicatorId &&
          (() => {
            const indicator = activeIndicators.find((item) => item.id === settingsIndicatorId) || null;
            const definitionFromConfig = getIndicatorSettingsDefinition(settingsIndicatorId);
            const definition =
              definitionFromConfig ??
              (indicator
                ? {
                    id: settingsIndicatorId,
                    title: indicator.name,
                    fields: [],
                  }
                : {
                    id: settingsIndicatorId,
                    title: settingsIndicatorId,
                    fields: [],
                  });
            return (
              <IndicatorSettingsModal
                indicatorName={indicator?.name || settingsIndicatorId}
                definition={definition}
                values={settingsDraft}
                activeTab={settingsActiveTab}
                onTabChange={setSettingsActiveTab}
                onChangeValue={(fieldId, value) => {
                  setSettingsDraft((prev) => ({
                    ...prev,
                    [fieldId]: value,
                  }));
                }}
                onResetDefaults={() => {
                  const defaults = buildDefaultIndicatorSettings(definition);
                  setSettingsDraft(defaults);
                  onResetIndicatorSettings?.(settingsIndicatorId);
                }}
                onCancel={() => {
                  setSettingsIndicatorId(null);
                  setSettingsDraft({});
                }}
                onApply={() => {
                  if (onUpdateIndicatorSettings && settingsIndicatorId) {
                    onUpdateIndicatorSettings(settingsIndicatorId, settingsDraft);
                  }
                  setSettingsIndicatorId(null);
                }}
              />
            );
          })()}
      </div>
    </div>
  );
};
