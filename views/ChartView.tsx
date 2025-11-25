import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Eye, EyeOff, Star, StarOff, X } from 'lucide-react';
import { LightweightChart } from '../components/LightweightChart';
import { AVAILABLE_ASSETS } from '../constants/markets';
import { TIMEFRAME_LIBRARY } from '../constants/timeframes';
import { ChartTimezoneSelector } from '../components/chart/ChartTimezoneSelector';
import { Candle, BacktestResult, CustomIndicator } from '../types';

type ChartViewProps = {
  data: Candle[];
  backtestResult: BacktestResult | null;
  indicators: CustomIndicator[];
  indicatorData: { time: string | number; value: number }[];
  activeSymbol: string;
  onSymbolChange: (symbol: string) => void;
  activeTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  onToggleIndicator: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  timeframes: string[];
  allTimeframes: string[];
  pinnedTimeframes: string[];
  onPinnedChange: (timeframes: string[]) => void;
  chartTimezone: string;
  onTimezoneChange: (timezone: string) => void;
};

export const ChartView: React.FC<ChartViewProps> = ({
  data,
  backtestResult,
  indicators,
  indicatorData,
  activeSymbol,
  onSymbolChange,
  activeTimeframe,
  onTimeframeChange,
  onToggleIndicator,
  onToggleVisibility,
  timeframes,
  allTimeframes,
  pinnedTimeframes,
  onPinnedChange,
  chartTimezone,
  onTimezoneChange,
}) => {
  const hasVisibleIndicator = indicators.some((indicator) => indicator.isActive && indicator.isVisible);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom'>('top');

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      window.addEventListener('mousedown', handleClick);
    }
    return () => window.removeEventListener('mousedown', handleClick);
  }, [isMenuOpen]);

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

  const togglePinned = (code: string) => {
    if (pinnedTimeframes.includes(code)) {
      onPinnedChange(pinnedTimeframes.filter((tf) => tf !== code));
    } else {
      onPinnedChange([...pinnedTimeframes, code]);
    }
  };

  const isTimeframeAvailable = (code: string) => allTimeframes.includes(code);

  return (
    <div className="h-full flex flex-col bg-white border border-slate-200 p-1 shadow-sm relative">
      <div className="absolute top-4 left-4 z-20 flex gap-2 items-center">
        <div className="relative group">
          <select
            value={activeSymbol}
            onChange={(event) => onSymbolChange(event.target.value)}
            className="appearance-none bg-white/90 backdrop-blur border border-slate-200 pl-3 pr-8 py-1.5 text-xs font-mono font-bold text-slate-900 shadow-sm cursor-pointer outline-none hover:border-slate-400 transition-colors uppercase"
          >
            {AVAILABLE_ASSETS.map((asset) => (
              <option key={asset} value={asset}>
                {asset}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="bg-white/90 backdrop-blur border border-slate-200 shadow-sm flex items-center relative">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-3 py-1.5 text-xs font-mono transition-colors border-r border-slate-100 ${
                activeTimeframe === tf
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
              className={`absolute left-0 w-[260px] bg-white border border-slate-200 rounded-sm shadow-2xl p-3 text-left space-y-3 ${
                menuPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
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
                            className={`flex items-center justify-between px-2 py-1.5 text-xs ${
                              available ? 'text-slate-700' : 'text-slate-400 opacity-70'
                            }`}
                          >
                            <button
                              className={`flex-1 text-left ${
                                available ? 'hover:text-slate-900' : 'cursor-not-allowed'
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
      </div>

      {indicators
        .filter((indicator) => indicator.isActive)
        .map((indicator) => (
          <div
            key={indicator.id}
            className="absolute top-[4.5rem] left-4 z-10 flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 px-3 py-1 shadow-sm"
          >
            <span className={`w-2 h-2 rounded-full ${indicator.isVisible ? 'bg-[#2962FF]' : 'bg-slate-300'}`} />
            <span className="text-xs font-medium text-slate-700">{indicator.name}</span>
            <button onClick={() => onToggleVisibility(indicator.id)} className="ml-2 text-slate-400 hover:text-slate-900">
              {indicator.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
            <button onClick={() => onToggleIndicator(indicator.id)} className="ml-1 text-slate-400 hover:text-rose-500">
              <X size={12} />
            </button>
          </div>
        ))}

      <div className="flex-1 relative">
        <LightweightChart
          data={data}
          trades={backtestResult?.trades}
          lineData={hasVisibleIndicator ? indicatorData : undefined}
          lineColor="#2962FF"
          timezone={chartTimezone}
        />
        <ChartTimezoneSelector timezoneId={chartTimezone} onChange={onTimezoneChange} />
      </div>
    </div>
  );
};
