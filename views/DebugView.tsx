import React, { useEffect, useState } from 'react';
import { MainContent } from '../components/layout/MainContent';
import { DebugTerminal } from '../components/debug/DebugTerminal';
import { apiClient } from '../services/api/client';
import { useAppState } from '../context/AppStateContext';

export const DebugView: React.FC = () => {
  const { activeSymbol, activeTimeframe } = useAppState();
  const [healthSummary, setHealthSummary] = useState<string>('');
  const [loadingHealth, setLoadingHealth] = useState(false);

  useEffect(() => {
    // Best-effort initial health fetch; ignore errors
    const fetchHealth = async () => {
      setLoadingHealth(true);
      try {
        const response = await apiClient.debugHealth();
        const indicators = response?.indicators || {};
        const datasets = response?.datasets || {};
        const parts = [
          `Indicators: ${indicators.total ?? 0} (active: ${indicators.active ?? 0})`,
          datasets.assets && datasets.assets.length ? `Assets: ${datasets.assets.join(', ')}` : '',
        ].filter(Boolean);
        setHealthSummary(parts.join(' • '));
      } catch {
        setHealthSummary('Debug health not available.');
      } finally {
        setLoadingHealth(false);
      }
    };
    fetchHealth();
  }, []);

  return (
    <MainContent direction="column" className="gap-3 h-full bg-transparent">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Debug & Diagnostics</h1>
          <p className="text-xs text-slate-500">
            Run high-level debug commands against the local backend, indicator engine and datasets. Active context:{' '}
            <span className="font-mono text-slate-700">
              {activeSymbol}/{activeTimeframe}
            </span>
            .
          </p>
          {healthSummary && (
            <p className="text-[11px] text-slate-500 mt-1">
              {loadingHealth ? 'Checking debug health…' : healthSummary}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 text-[11px] text-slate-500">
          <span className="font-mono text-slate-700">/api/debug/terminal</span>
          <span className="font-mono text-slate-700">/api/debug/health</span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        <div className="lg:col-span-2 min-h-[260px] h-full">
          <DebugTerminal />
        </div>
        <div className="min-h-[260px] h-full border border-slate-200 rounded-md bg-white shadow-sm p-3 text-[12px] text-slate-700 space-y-2">
          <h2 className="text-xs font-semibold text-slate-900 mb-1">Quick commands</h2>
          <ul className="space-y-1">
            <li>
              <span className="font-mono text-[11px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">health</span>
              <span className="ml-1 text-slate-500">– backend, indicators, datasets overview.</span>
            </li>
            <li>
              <span className="font-mono text-[11px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                list indicators
              </span>
              <span className="ml-1 text-slate-500">– list all indicators and their active state.</span>
            </li>
            <li>
              <span className="font-mono text-[11px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                inspect dataset {activeSymbol} {activeTimeframe}
              </span>
              <span className="ml-1 text-slate-500">– inspect the current dataset window.</span>
            </li>
            <li>
              <span className="font-mono text-[11px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                run indicator ema_100.py --asset={activeSymbol} --tf={activeTimeframe} --len=1000
              </span>
              <span className="ml-1 text-slate-500">– run EMA 100 on the current instrument/timeframe.</span>
            </li>
          </ul>
          <p className="text-[11px] text-slate-500 mt-2">
            All commands execute locally against your current environment. Use this console to debug issues like missing indicators,
            misaligned datasets or Lean integration problems without leaving The Lab.
          </p>
        </div>
      </div>
    </MainContent>
  );
};

