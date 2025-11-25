import React from 'react';
import { Play, RefreshCw, CheckCircle2, Database } from 'lucide-react';
import { ViewState } from '../../types';

type MainHeaderProps = {
  activeView: ViewState;
  activeSymbol: string;
  activeTimeframe: string;
  repoStatus: 'disconnected' | 'syncing' | 'synced' | 'error';
  onRunBacktest: () => void;
};

const titleMap: Record<ViewState, string> = {
  [ViewState.CHART]: 'Market Analysis',
  [ViewState.CHART_INDICATOR]: 'Indicator Editor',
  [ViewState.DATA]: 'Data Sources',
  [ViewState.DATA_NORMALIZATION]: 'Normalization Rules',
  [ViewState.ANALYSIS]: 'Strategy Performance',
  [ViewState.STRATEGY]: 'Lean Strategy',
  [ViewState.API_DOCS]: 'API Documentation',
};

export const MainHeader: React.FC<MainHeaderProps> = ({
  activeView,
  activeSymbol,
  activeTimeframe,
  repoStatus,
  onRunBacktest,
}) => {
  const renderStatus = () => {
    if (repoStatus === 'synced') {
      return (
        <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-medium">
          <CheckCircle2 size={12} /> Data Ready
        </span>
      );
    }
    if (repoStatus === 'syncing') {
      return (
        <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-xs font-medium">
          <RefreshCw size={12} className="animate-spin" /> Processing...
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-slate-400 bg-slate-100 px-2 py-1 rounded-full text-xs font-medium">
        <Database size={12} /> Local Mode
      </span>
    );
  };

  return (
    <header className="h-20 bg-[#fafafa] flex items-center justify-between px-10 border-b border-transparent z-10">
      <div>
        <h2 className="text-2xl font-normal text-slate-800 tracking-tight">{titleMap[activeView]}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-slate-400">Context:</span>
          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">
            {activeSymbol} / {activeTimeframe}
          </code>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-xs font-medium">{renderStatus()}</div>
        <div className="h-6 w-px bg-slate-200" />
        <button
          onClick={onRunBacktest}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold tracking-wide uppercase transition-all shadow-xl shadow-slate-200 active:translate-y-0.5 rounded-sm"
        >
          <Play size={12} fill="currentColor" />
          <span>Run Backtest</span>
        </button>
      </div>
    </header>
  );
};
