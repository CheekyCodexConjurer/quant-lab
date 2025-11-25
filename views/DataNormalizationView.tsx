import React, { useState, useRef, useEffect } from 'react';
import { Globe, Layers, Sliders, ChevronDown, Check } from 'lucide-react';
import { TICK_PRESETS } from '../constants/markets';
import { BasisType } from '../hooks/useNormalizationSettings';
import { TIMEZONE_OPTIONS, getTimezoneById } from '../constants/timezones';

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
  onSave: () => void;
  isSaving: boolean;
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
}) => {
  const [isTimezoneOpen, setTimezoneOpen] = useState(false);
  const timezoneRef = useRef<HTMLDivElement>(null);

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

  const selectedTimezone = getTimezoneById(normTimezone);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10">
        <h3 className="text-lg font-medium text-slate-900">Data Normalization Rules</h3>
        <p className="text-slate-500 text-sm mt-1">Define how raw tick data is processed and structured for the engine.</p>
      </div>

      <div className="bg-white border border-slate-200 divide-y divide-slate-100 shadow-sm">
        <div className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
          <div className="max-w-md">
            <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Globe size={16} className="text-slate-400" /> Timezone Adjustment
            </h4>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Convert all incoming data timestamps to a unified timezone. Recommended for aligning futures contracts.
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
                          isActive ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
            <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Gap Quantization</h4>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Reabre cada candle no fechamento anterior para remover gaps em toda a série.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 w-[320px]">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={`w-12 h-6 rounded-full p-1 transition-colors ${gapQuantEnabled ? 'bg-slate-900' : 'bg-slate-200'}`}
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
              <span className="text-xs text-slate-400 italic">Regression aligns slope; Median aligns gaps.</span>
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="radio" name="basis" checked={normBasis === 'median'} onChange={() => setNormBasis('median')} className="accent-slate-900" />
              <span className="text-sm text-slate-600 group-hover:text-slate-900">Gap Median Alignment</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="radio" name="basis" checked={normBasis === 'regression'} onChange={() => setNormBasis('regression')} className="accent-slate-900" />
              <span className="text-sm text-slate-600 group-hover:text-slate-900">Linear Regression (EOD)</span>
            </label>
          </div>
        </div>

        <div className="p-8 flex items-start justify-between hover:bg-slate-50/50 transition-colors">
          <div className="max-w-md">
            <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Sliders size={16} className="text-slate-400" /> Tick Discretization
            </h4>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Snap prices to a specific grid size. Essential for consistent backtesting of futures instruments.
            </p>
          </div>
          <div className="w-[300px]">
            <div className="grid grid-cols-4 gap-2 mb-3">
              {Object.entries(TICK_PRESETS)
                .filter(([key]) => key.length <= 5)
                .map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setTickFromPreset(value)}
                    className={`px-2 py-1.5 text-xs font-mono border rounded ${
                      normTickSize === value && !isCustomTick
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {key}
                  </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Value</span>
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

      <div className="mt-8 flex justify-end pr-4">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-8 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-shadow shadow-lg shadow-slate-200 disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Save Rules'}
        </button>
      </div>
    </div>
  );
};
