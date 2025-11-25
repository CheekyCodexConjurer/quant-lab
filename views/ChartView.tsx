import React from 'react';
import { ChevronDown, Eye, EyeOff, X } from 'lucide-react';
import { LightweightChart } from '../components/LightweightChart';
import { AVAILABLE_ASSETS, AVAILABLE_TIMEFRAMES } from '../constants/markets';
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
}) => {
  const hasVisibleIndicator = indicators.some((indicator) => indicator.isActive && indicator.isVisible);

  return (
    <div className="h-full flex flex-col bg-white border border-slate-200 p-1 shadow-sm relative">
      <div className="absolute top-4 left-4 z-10 flex gap-2 items-center">
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

        <div className="bg-white/90 backdrop-blur border border-slate-200 shadow-sm flex items-center">
          {AVAILABLE_TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-3 py-1.5 text-xs font-mono transition-colors border-r last:border-r-0 border-slate-100 ${
                activeTimeframe === tf
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tf}
            </button>
          ))}
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
        />
      </div>
    </div>
  );
};
