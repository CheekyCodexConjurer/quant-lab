import React from 'react';
import { ViewState } from '../../types';

type MainHeaderProps = {
  activeView: ViewState;
  activeSymbol: string;
  activeTimeframe: string;
  repoStatus: 'disconnected' | 'syncing' | 'synced' | 'error';
  onRunBacktest: () => void;
  licenseMode?: 'internal' | 'early-access' | 'expired';
};

const titleMap: Record<ViewState, string> = {
  [ViewState.CHART]: 'Market Analysis',
  [ViewState.DATA_NORMALIZATION]: '',
  [ViewState.ANALYSIS]: 'Strategy Performance',
  [ViewState.STRATEGY]: '',
  [ViewState.API_DOCS]: 'API Documentation',
  [ViewState.REPOSITORY]: 'Repository',
  [ViewState.ROADMAP]: '',
};

export const MainHeader: React.FC<MainHeaderProps> = ({
  activeView,
  activeSymbol,
  activeTimeframe,
  repoStatus: _repoStatus,
  onRunBacktest: _onRunBacktest,
  licenseMode = 'internal',
}) => {
  const title = titleMap[activeView];

  const badgeTone =
    licenseMode === 'early-access'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : licenseMode === 'expired'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-slate-100 text-slate-600 border-slate-200';
  const badgeLabel =
    licenseMode === 'early-access' ? 'EARLY ACCESS' : licenseMode === 'expired' ? 'LICENSE EXPIRED' : 'INTERNAL MODE';

  return (
    <header className="h-20 bg-[#fafafa] flex items-center px-10 border-b border-transparent z-10">
      <div className="space-y-1 flex-1">
        {title ? <h2 className="text-2xl font-normal text-slate-800 tracking-tight">{title}</h2> : null}
        {activeView === ViewState.CHART && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Context:</span>
            <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">
              {activeSymbol} / {activeTimeframe}
            </code>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${badgeTone}`}>{badgeLabel}</span>
      </div>
    </header>
  );
};
