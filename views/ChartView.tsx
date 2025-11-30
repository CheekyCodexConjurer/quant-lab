import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Eye, EyeOff, Star, StarOff, X, Paintbrush, RotateCcw, Settings } from 'lucide-react';
import { LightweightChart, LightweightChartHandle } from '../components/LightweightChart';
import { AVAILABLE_ASSETS } from '../constants/markets';
import { TIMEFRAME_LIBRARY } from '../constants/timeframes';
import { Candle, BacktestResult, CustomIndicator, ChartAppearance, IndicatorOverlay, IndicatorSettingsValues } from '../types';
import { ChartStyleMenu } from '../components/chart/ChartStyleMenu';
import { DEFAULT_APPEARANCE } from '../context/AppStateContext';
import { normalizeSlashes } from '../utils/path';
import { toTimestampSeconds } from '../utils/timeFormat';
import { ChartContextMenu } from '../components/chart/ChartContextMenu';
import { useAppState } from '../context/AppStateContext';
import { IndicatorSettingsModal } from '../components/chart/IndicatorSettingsModal';
import { useChartViewportCache } from '../hooks/chart/useChartViewportCache';
import { useChartContextMenu } from '../hooks/chart/useChartContextMenu';
import { buildDefaultIndicatorSettings, getIndicatorSettingsDefinition } from '../constants/indicatorSettings';

type ChartViewProps = {
  data: Candle[];
  loading?: boolean;
  ingesting?: boolean;
  error?: string | null;
  backtestResult: BacktestResult | null;
  indicators: CustomIndicator[];
  indicatorData: Record<string, { time: string | number; value: number }[]>;
  indicatorOverlays?: Record<string, IndicatorOverlay>;
  indicatorOrder: string[];
  indicatorSettings: Record<string, IndicatorSettingsValues>;
  activeSymbol: string;
  onSymbolChange: (symbol: string) => void;
  activeTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  onToggleIndicator: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onRefreshIndicator: (id: string) => void | Promise<void>;
  onUpdateIndicatorSettings: (id: string, values: IndicatorSettingsValues) => void;
  onResetIndicatorSettings: (id: string) => void;
  timeframes: string[];
  allTimeframes: string[];
  pinnedTimeframes: string[];
  onPinnedChange: (timeframes: string[]) => void;
  chartTimezone: string;
  availableAssets: string[];
  chartAppearance: ChartAppearance;
  onAppearanceChange: (appearance: Partial<ChartAppearance>) => void;
  onCancelLoad?: () => void;
};

export const ChartView: React.FC<ChartViewProps> = ({
  data,
  backtestResult,
  indicators,
  indicatorData,
  indicatorOverlays,
  indicatorOrder,
  indicatorSettings,
  activeSymbol,
  onSymbolChange,
  activeTimeframe,
  onTimeframeChange,
  onToggleIndicator,
  onToggleVisibility,
  onRefreshIndicator,
  onUpdateIndicatorSettings,
  onResetIndicatorSettings,
  timeframes,
  allTimeframes,
  pinnedTimeframes,
  onPinnedChange,
  chartTimezone,
  availableAssets,
  chartAppearance,
  onAppearanceChange,
  loading = false,
  ingesting = false,
  error = null,
  onCancelLoad,
}) => {
  const MAX_DRAWINGS_PER_INDICATOR = 200;
  const { debugMode } = useAppState();
  const visibleIndicators = indicators
    .filter((indicator) => indicator.isActive && indicator.isVisible)
    .sort((a, b) => {
      const idxA = indicatorOrder.findIndex((p) => normalizeSlashes(p) === normalizeSlashes(a.filePath || ''));
      const idxB = indicatorOrder.findIndex((p) => normalizeSlashes(p) === normalizeSlashes(b.filePath || ''));
      const wa = idxA >= 0 ? idxA : Number.MAX_SAFE_INTEGER;
      const wb = idxB >= 0 ? idxB : Number.MAX_SAFE_INTEGER;
      if (wa !== wb) return wa - wb;
      return (a.name || a.id).localeCompare(b.name || b.id);
    });
  const hasVisibleIndicator = visibleIndicators.length > 0;
  const [isMenuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom'>('top');
  const [isStyleMenuOpen, setStyleMenuOpen] = useState(false);
  const chartRef = useRef<LightweightChartHandle>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);
  const viewportKey = `${String(activeSymbol || '').toUpperCase()}::${String(activeTimeframe || '').toUpperCase()}`;
  const [settingsIndicatorId, setSettingsIndicatorId] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<IndicatorSettingsValues>({});
  const [settingsActiveTab, setSettingsActiveTab] = useState<string>('Inputs');
  const {
    contextMenuOpen,
    contextMenuPos,
    contextMenuRef,
    onContextMenu,
    closeContextMenu,
  } = useChartContextMenu();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      // context menu close is handled by useChartContextMenu
    };
    if (isMenuOpen) {
      window.addEventListener('mousedown', handleClick);
    }
    if (contextMenuOpen) {
      window.addEventListener('mousedown', handleClick);
    }
    return () => window.removeEventListener('mousedown', handleClick);
  }, [isMenuOpen, contextMenuOpen]);

  useEffect(() => {
    const updatePlacement = () => {
      if (!isMenuOpen || !menuRef.current || !toggleRef.current) return;
      const menuHeight = menuRef.current.offsetHeight || 0;
      const triggerRect = toggleRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      if (spaceBelow < menuHeight + 16 && spaceAbove > spaceBelow) {
        setMenuPlacement('top');
      } else {
        setMenuPlacement('bottom');
      }
    };
    if (isMenuOpen) {
      updatePlacement();
      window.addEventListener('resize', updatePlacement);
      window.addEventListener('scroll', updatePlacement, true);
    }
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [isMenuOpen]);

  useChartViewportCache(chartRef, viewportKey);

  const togglePinned = (code: string) => {
    if (pinnedTimeframes.includes(code)) {
      onPinnedChange(pinnedTimeframes.filter((tf) => tf !== code));
    } else {
      onPinnedChange([...pinnedTimeframes, code]);
    }
  };

  const isTimeframeAvailable = (code: string) => allTimeframes.includes(code);

  const handleResetView = () => {
    chartRef.current?.resetView();
  };

  const handleMoveToLatestIndicator = () => {
    if (!hasVisibleIndicator) return;
    let latestTime: string | number | null = null;
    let latestTs = -Infinity;
    visibleIndicators.forEach((indicator) => {
      const series = indicatorData[indicator.id] || [];
      if (!series.length) return;
      const lastPoint = series[series.length - 1];
      const ts = toTimestampSeconds(lastPoint.time);
      if (ts !== null && ts > latestTs) {
        latestTs = ts;
        latestTime = lastPoint.time;
      }
    });
    if (!latestTime) return;
    chartRef.current?.focusTime(latestTime);
  };

  return (
    <div className="h-full min-h-[720px] min-w-0 flex-1 w-full flex flex-col bg-white border border-slate-200 p-1 shadow-sm relative">
      {error ? (
        <div className="absolute top-16 right-4 z-20 bg-rose-50 border border-rose-200 text-[11px] text-rose-700 px-3 py-1.5 rounded-sm shadow-sm">
          {error}
        </div>
      ) : null}
      <div className="absolute top-4 left-4 z-20 flex gap-2 items-center">
        <div className="relative group">
          <select
            value={availableAssets.includes(activeSymbol) ? activeSymbol : ''}
            onChange={(event) => onSymbolChange(event.target.value)}
            className="appearance-none bg-white/90 backdrop-blur border border-slate-200 pl-3 pr-8 py-1.5 text-xs font-mono font-bold text-slate-900 shadow-sm cursor-pointer outline-none hover:border-slate-400 transition-colors uppercase disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={availableAssets.length === 0}
          >
            {availableAssets.length === 0 ? (
              <option value="" disabled>
                No local assets
              </option>
            ) : (
              availableAssets.map((asset) => (
                <option key={asset} value={asset}>
                  {asset}
                </option>
              ))
            )}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="bg-white/90 backdrop-blur border border-slate-200 shadow-sm flex items-center relative">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-3 py-1.5 text-xs font-mono transition-colors border-r border-slate-100 ${activeTimeframe === tf
                ? 'bg-slate-900 text-white font-medium'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              {tf}
            </button>
          ))}
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="px-2 py-1.5 text-xs font-mono text-slate-500 hover:text-slate-900 flex items-center gap-1"
            aria-label="Manage timeframes"
            ref={toggleRef}
          >
            <ChevronDown size={12} />
          </button>

          {isMenuOpen && (
            <div
              ref={menuRef}
              className={`absolute left-0 w-[260px] bg-white border border-slate-200 rounded-sm shadow-2xl p-3 text-left space-y-3 ${menuPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
                }`}
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Timeframes</div>
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                {TIMEFRAME_LIBRARY.map((category) => (
                  <div key={category.id}>
                    <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest mb-1">
                      {category.label}
                    </div>
                    <div className="flex flex-col divide-y divide-slate-100 border border-slate-100 rounded-sm">
                      {category.options.map((option) => {
                        const available = isTimeframeAvailable(option.code);
                        const pinned = pinnedTimeframes.includes(option.code);
                        return (
                          <div
                            key={option.code}
                            className={`flex items-center justify-between px-2 py-1.5 text-xs ${available ? 'text-slate-700' : 'text-slate-400 opacity-70'
                              }`}
                          >
                            <button
                              className={`flex-1 text-left ${available ? 'hover:text-slate-900' : 'cursor-not-allowed'
                                } ${activeTimeframe === option.code ? 'font-semibold' : ''}`}
                              onClick={() => available && onTimeframeChange(option.code)}
                              disabled={!available}
                            >
                              {option.label}
                            </button>
                            <button
                              className={`ml-2 text-slate-400 hover:text-amber-500 ${pinned ? 'text-amber-500' : ''}`}
                              onClick={() => togglePinned(option.code)}
                              aria-label={pinned ? 'Desafixar timeframe' : 'Fixar timeframe'}
                            >
                              {pinned ? <Star size={14} fill="currentColor" /> : <StarOff size={14} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setStyleMenuOpen((prev) => !prev)}
          className="ml-3 px-2.5 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:border-slate-300 transition-colors rounded-sm flex items-center justify-center"
          aria-label="Chart style"
        >
          <Paintbrush size={14} />
        </button>
      </div>

      {indicators.some((indicator) => indicator.isActive) && (
        <div className="absolute top-[4.5rem] left-4 z-10 flex flex-col gap-2">
          {indicators
            .filter((indicator) => indicator.isActive)
            .map((indicator) => (
              <div
                key={indicator.id}
                className="flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 px-3 py-1 shadow-sm"
              >
                <span className="text-xs font-medium text-slate-700">{indicator.name}</span>
                <button onClick={() => onToggleVisibility(indicator.id)} className="ml-2 text-slate-400 hover:text-slate-900">
                  {indicator.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button
                  onClick={() => {
                    void onRefreshIndicator(indicator.id);
                  }}
                  className="ml-1 text-slate-400 hover:text-slate-900"
                  aria-label="Refresh indicator from disk"
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  onClick={() => {
                    const definition = getIndicatorSettingsDefinition(indicator.id);
                    const baseDefinition =
                      definition ?? {
                        id: indicator.id,
                        title: indicator.name,
                        fields: [],
                      };
                    const defaults = buildDefaultIndicatorSettings(baseDefinition);
                    const existing = indicatorSettings[indicator.id] || {};
                    setSettingsIndicatorId(indicator.id);
                    setSettingsDraft({ ...defaults, ...existing });
                    const firstTab =
                      (baseDefinition.tabs && baseDefinition.tabs[0]) ||
                      (baseDefinition.fields.find((field) => field.tab)?.tab as string) ||
                      'Inputs';
                    setSettingsActiveTab(firstTab);
                  }}
                  className="ml-1 text-slate-400 hover:text-slate-900"
                  aria-label="Indicator settings"
                  title="Indicator settings"
                >
                  <Settings size={12} />
                </button>
                <button onClick={() => onToggleIndicator(indicator.id)} className="ml-1 text-slate-400 hover:text-rose-500">
                  <X size={12} />
                </button>
              </div>
            ))}
        </div>
      )}

      <div
        className="flex-1 relative min-h-[640px]"
        onContextMenu={onContextMenu}
        ref={chartAreaRef}
      >
        <LightweightChart
          ref={chartRef}
          data={data}
          trades={backtestResult?.trades}
          lines={
            hasVisibleIndicator
              ? (() => {
                  const palette = ['#2962FF', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#0ea5e9'];
                  const lines: { id: string; data: { time: string | number; value: number }[]; color?: string; style?: 'solid' | 'dashed' }[] =
                    [];
                  visibleIndicators.forEach((indicator, idx) => {
                    const baseColor = palette[idx % palette.length];
                    const settingsForIndicator = indicatorSettings[indicator.id] || {};
                    const lineColor =
                      typeof settingsForIndicator.lineColor === 'string' && settingsForIndicator.lineColor
                        ? (settingsForIndicator.lineColor as string)
                        : baseColor;

                    const mainSeries = indicatorData[indicator.id] || [];
                    if (mainSeries.length) {
                      lines.push({ id: indicator.id, data: mainSeries, color: lineColor, style: 'solid' });
                    }

                    const overlay = indicatorOverlays?.[indicator.id];
                    if (overlay) {
                      if (overlay.series) {
                        Object.entries(overlay.series).forEach(([key, series]) => {
                          if (key === 'main') return;
                          const dataPoints = Array.isArray(series) ? series : [];
                          if (!dataPoints.length) return;
                          lines.push({
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
                            !level.kind ||
                            !String(level.kind).toLowerCase().includes('protected')
                        );
                        const limitedOthers =
                          otherLevels.length > MAX_DRAWINGS_PER_INDICATOR
                            ? otherLevels.slice(
                                otherLevels.length - MAX_DRAWINGS_PER_INDICATOR
                              )
                            : otherLevels;
                        const levels = [...limitedOthers, ...protectedLevels];
                        levels.forEach((level, levelIdx) => {
                          const points = [
                            { time: level.timeStart, value: level.price },
                            { time: level.timeEnd, value: level.price },
                          ];
                          lines.push({
                            id: `${indicator.id}:level:${levelIdx}`,
                            data: points,
                            color: baseColor,
                            style: 'dashed',
                          });
                        });
                      }
                    }
                  });
                  return lines;
                })()
              : undefined
          }
          indicatorMarkers={
            hasVisibleIndicator && indicatorOverlays
              ? visibleIndicators
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
                  .filter((m) => m && m.time) || undefined
              : undefined
          }
          timeframe={activeTimeframe}
          timezone={chartTimezone}
          appearance={chartAppearance}
        />
        {settingsIndicatorId
          ? (() => {
              const indicator = indicators.find((item) => item.id === settingsIndicatorId) || null;
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
                    onResetIndicatorSettings(settingsIndicatorId);
                  }}
                  onCancel={() => {
                    setSettingsIndicatorId(null);
                    setSettingsDraft({});
                  }}
                  onApply={() => {
                    onUpdateIndicatorSettings(settingsIndicatorId, settingsDraft);
                    setSettingsIndicatorId(null);
                  }}
                />
              );
            })()
          : null}
        {debugMode && hasVisibleIndicator && (
          <div className="absolute bottom-4 left-4 z-30 bg-slate-900/80 text-[10px] text-slate-100 px-3 py-2 rounded border border-slate-700 space-y-1 max-w-xs">
            <div className="font-semibold text-[10px] uppercase tracking-widest text-slate-400">
              Indicator debug
            </div>
            {visibleIndicators.map((indicator) => {
              const series = indicatorData[indicator.id] || [];
              const last = series[series.length - 1];
              return (
                <div key={indicator.id} className="flex flex-col">
                  <span className="font-mono text-[10px] text-slate-200">
                    {indicator.name || indicator.id} — len={series.length}
                  </span>
                  {last && (
                    <span className="font-mono text-[10px] text-slate-400 truncate">
                      last.time={String(last.time)} value={last.value}
                    </span>
                  )}
                  {!series.length && (
                    <span className="font-mono text-[10px] text-amber-400">no series for this indicator</span>
                  )}
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
              onReset={handleResetView}
              onMoveToIndicator={hasVisibleIndicator ? handleMoveToLatestIndicator : undefined}
              onClose={closeContextMenu}
            />
          </div>
        ) : null}
      </div>

      {isStyleMenuOpen && (
        <ChartStyleMenu
          appearance={chartAppearance}
          onChange={onAppearanceChange}
          onReset={() => onAppearanceChange(DEFAULT_APPEARANCE)}
          onClose={() => setStyleMenuOpen(false)}
        />
      )}
    </div>
  );
};
