import React, { useState, useRef, useEffect } from 'react';
import { Globe, Layers, Sliders, ChevronDown, Check, Database, Activity } from 'lucide-react';
import { MainContent } from '../components/layout/MainContent';
import { AVAILABLE_ASSETS } from '../constants/markets';
import { BasisType } from '../hooks/useNormalizationSettings';
import { TIMEZONE_OPTIONS, getTimezoneById } from '../constants/timezones';
import { useToast } from '../components/common/Toast';
import { useAssetCoverage } from '../hooks/useAssetCoverage';
import { useHoverMenu } from '../components/ui/useHoverMenu';
import { MenuSurface } from '../components/ui/MenuSurface';

type DataNormalizationViewProps = {
  normTimezone: string;
  setNormTimezone: (value: string) => void;
  normBasis: BasisType;
  setNormBasis: (basis: BasisType) => void;
  normTickSize: number;
  setTickFromPreset: (value: number) => void;
  overrideTickSize: (value: number) => void;
  isCustomTick: boolean;
  gapQuantEnabled: boolean;
  setGapQuantEnabled: (value: boolean) => void;
  onSave: () => Promise<void> | void;
  isSaving: boolean;
  activeSymbol: string;
  onChangeSymbol: (symbol: string) => void;
};

export const DataNormalizationView: React.FC<DataNormalizationViewProps> = ({
  normTimezone,
  setNormTimezone,
  normBasis,
  setNormBasis,
  normTickSize,
  setTickFromPreset,
  overrideTickSize,
  isCustomTick,
  gapQuantEnabled,
  setGapQuantEnabled,
  onSave,
  isSaving,
  activeSymbol,
  onChangeSymbol,
}) => {
  const [isTimezoneOpen, setTimezoneOpen] = useState(false);
  const timezoneRef = useRef<HTMLDivElement>(null);
  const addToast = useToast();
  const { ranges: clRanges } = useAssetCoverage('CL1!');
  const coverageMenu = useHoverMenu({ closeDelay: 150 });
  const [isBasisOpen, setBasisOpen] = useState(false);
  const basisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (timezoneRef.current && !timezoneRef.current.contains(event.target as Node)) {
        setTimezoneOpen(false);
      }
    };
    if (isTimezoneOpen) {
      window.addEventListener('mousedown', handleClick);
    }
    return () => window.removeEventListener('mousedown', handleClick);
  }, [isTimezoneOpen]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (basisRef.current && !basisRef.current.contains(event.target as Node)) {
        setBasisOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setBasisOpen(false);
      }
    };
    if (isBasisOpen) {
      window.addEventListener('mousedown', handleClick);
      window.addEventListener('keydown', handleKey);
    }
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isBasisOpen]);

  const selectedTimezone = getTimezoneById(normTimezone);

  let coverageStart: string | undefined;
  let coverageEnd: string | undefined;
  clRanges.forEach((row) => {
    if (row.start) {
      const iso = new Date(row.start).toISOString().slice(0, 10);
      if (!coverageStart || iso < coverageStart) {
        coverageStart = iso;
      }
    }
    if (row.end) {
      const iso = new Date(row.end).toISOString().slice(0, 10);
      if (!coverageEnd || iso > coverageEnd) {
        coverageEnd = iso;
      }
    }
  });

  const coverageLabel =
    coverageStart && coverageEnd ? `${coverageStart} \u2192 ${coverageEnd}` : '\u2014';

  return (
    <MainContent className="h-auto min-h-full">
      <div className="mb-10">
        <p className="text-slate-500 text-sm mt-1">
          Configure how raw tick data is aligned, normalized, and discretized before feeding the
          engine.
        </p>
      </div>

      <div className="bg-white border border-slate-200 divide-y divide-slate-100 shadow-sm">
        <div className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
          <div className="max-w-md">
            <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Globe size={16} className="text-slate-400" /> Timezone Adjustment
            </h4>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Convert all incoming data timestamps to a unified timezone. Recommended for aligning
              futures contracts.
            </p>
          </div>
          <div className="flex items-center gap-3 w-[320px] justify-end" ref={timezoneRef}>
            <div className="relative">
              <button
                onClick={() => setTimezoneOpen(!isTimezoneOpen)}
                className="flex items-center justify-between gap-3 px-4 py-2 bg-white border border-slate-200 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900 transition-colors min-w-[260px]"
              >
                <span className="font-medium">
                  {selectedTimezone.offset} {selectedTimezone.label}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {isTimezoneOpen && (
                <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-slate-200 rounded shadow-xl py-1 max-h-[400px] overflow-y-auto custom-scrollbar z-50">
                  {TIMEZONE_OPTIONS.map((tz) => {
                    const isActive = tz.id === normTimezone;
                    return (
                      <button
                        key={tz.id}
                        onClick={() => {
                          setNormTimezone(tz.id);
                          setTimezoneOpen(false);
                        }}
                        className={`w-full text-left px-4 py-1.5 text-[13px] flex items-center justify-between transition-colors ${
                          isActive
                            ? 'bg-slate-100 text-slate-900 font-medium'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span>
                          {tz.offset} {tz.label}
                        </span>
                        {isActive && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 flex items-start justify-between hover:bg-slate-50/50 transition-colors">
          <div className="max-w-md">
            <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Activity size={16} className="text-slate-400" /> Gap Quantization
            </h4>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Re-open each candle at the previous close to remove visual gaps across the series.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 w-[320px]">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={`w-12 h-6 rounded-full p-1 transition-colors ${
                  gapQuantEnabled ? 'bg-slate-900' : 'bg-slate-200'
                }`}
                onClick={() => setGapQuantEnabled(!gapQuantEnabled)}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${
                    gapQuantEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className="text-sm font-medium text-slate-900">Gap Quantization</span>
            </label>
          </div>
        </div>

        <div className="p-8 flex items-start justify-between hover:bg-slate-50/50 transition-colors">
          <div className="max-w-md">
            <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Layers size={16} className="text-slate-400" /> Price Basis
            </h4>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Adjust the price levels of historical contracts to form a continuous series.
              <br />
              <span className="text-xs text-slate-400 italic">
                Regression aligns slope; Median aligns gaps.
              </span>
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 w-[320px]">
            <div className="w-full flex flex-col items-end" ref={basisRef}>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Price basis
              </span>
              <div className="mt-1 relative">
                <button
                  type="button"
                  onClick={() => setBasisOpen(!isBasisOpen)}
                  className="flex items-center justify-between gap-3 px-4 py-2 bg-white border border-slate-200 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900 transition-colors min-w-[260px]"
                >
                  <span className="text-sm">
                    {normBasis === 'median' ? 'Gap median alignment' : 'Linear regression (EOD)'}
                  </span>
                  <ChevronDown size={14} className="text-slate-400" />
                </button>
                {isBasisOpen && (
                  <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-slate-200 rounded shadow-xl py-1 z-40">
                    <button
                      type="button"
                      onClick={() => {
                        setNormBasis('median');
                        setBasisOpen(false);
                      }}
                      className={`w-full text-left px-4 py-1.5 text-[13px] flex items-center justify-between transition-colors ${
                        normBasis === 'median'
                          ? 'bg-slate-100 text-slate-900 font-medium'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>Gap median alignment</span>
                      {normBasis === 'median' && <Check size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNormBasis('regression');
                        setBasisOpen(false);
                      }}
                      className={`w-full text-left px-4 py-1.5 text-[13px] flex items-center justify-between transition-colors ${
                        normBasis === 'regression'
                          ? 'bg-slate-100 text-slate-900 font-medium'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>Linear regression (EOD)</span>
                      {normBasis === 'regression' && <Check size={14} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 flex items-start justify-between hover:bg-slate-50/50 transition-colors">
          <div className="max-w-md">
            <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Sliders size={16} className="text-slate-400" /> Tick Discretization
            </h4>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Snap prices to a specific grid size. Essential for consistent backtesting of futures
              instruments.
            </p>
          </div>
          <div className="w-[320px] flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Instrument
                </span>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                {AVAILABLE_ASSETS.map((asset) => {
                  const isActive = asset === activeSymbol;
                  return (
                    <button
                      key={asset}
                      type="button"
                      onClick={() => onChangeSymbol(asset)}
                      className={`px-2.5 py-1.5 text-[11px] font-mono uppercase rounded border transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {asset}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Tick size
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.0001"
                  value={normTickSize}
                  onChange={(event) => overrideTickSize(parseFloat(event.target.value))}
                  className="flex-1 bg-slate-50 border border-slate-200 px-3 py-1.5 text-sm font-mono text-slate-900 outline-none focus:border-slate-400"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 flex items-start justify-between hover:bg-slate-50/50 transition-colors">
          <div className="max-w-md">
            <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Database size={16} className="text-slate-400" /> Historical Data (CL Futures)
            </h4>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Local CL futures dataset used for charts and backtests, normalized to UTC.
            </p>
          </div>
          <div className="w-[320px] flex flex-col items-end gap-2 text-right relative">
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Base
                </span>
                <span className="text-sm text-slate-700 font-mono">
                  CL1! M1 <span className="text-slate-400">&middot;</span> continuous contract
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  Coverage
                </span>
                <span className="text-xs text-slate-700 font-mono tabular-nums">
                  {coverageLabel}
                </span>
              </div>
            </div>

            {clRanges.length > 0 && (
              <div className="mt-1" ref={coverageMenu.triggerRef as any}>
                <button
                  type="button"
                  onClick={coverageMenu.onTriggerClick}
                  className="text-[11px] text-slate-500 hover:text-slate-900 underline underline-offset-2 decoration-slate-300"
                >
                  View per-timeframe ranges
                </button>
              </div>
            )}

            {clRanges.length > 0 && coverageMenu.isOpen && (
              <div ref={coverageMenu.menuRef as any} className="absolute top-full right-0 mt-2 z-40">
                <MenuSurface className="w-72 text-xs">
                  <p className="text-[11px] font-semibold text-slate-500 mb-1">Timeframe coverage</p>
                  <div className="space-y-1">
                    {clRanges.map((row) => (
                      <div
                        key={row.timeframe}
                        className="flex items-baseline justify-end gap-3 text-[11px] text-slate-700"
                      >
                        <span className="font-mono min-w-[32px] text-left">{row.timeframe}</span>
                        <span className="text-slate-400">&middot;</span>
                        <span className="font-mono tabular-nums">
                          {row.start ? new Date(row.start).toISOString().slice(0, 10) : '\u2014'}
                        </span>
                        <span className="text-slate-400">&rarr;</span>
                        <span className="font-mono tabular-nums">
                          {row.end ? new Date(row.end).toISOString().slice(0, 10) : '\u2014'}
                        </span>
                      </div>
                    ))}
                  </div>
                </MenuSurface>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end pr-4">
        <button
          onClick={async () => {
            try {
              await onSave();
              addToast('Data settings saved.', 'success');
            } catch (error) {
              addToast('Failed to save data settings.', 'error');
              console.warn('[normalization] save failed', error);
            }
          }}
          disabled={isSaving}
          className="px-8 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-shadow shadow-lg shadow-slate-200 disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Save Rules'}
        </button>
      </div>
    </MainContent>
  );
};
