import React from 'react';

type LeanStatus = 'idle' | 'queued' | 'running' | 'completed' | 'error';

interface LeanParams {
  cash: number;
  feeBps: number;
  slippageBps: number;
}

export interface LeanEnginePanelProps {
  status: LeanStatus;
  params: LeanParams;
  logs: string[];
  onParamChange: (field: keyof LeanParams, value: string) => void;
}

export const LeanEnginePanel: React.FC<LeanEnginePanelProps> = ({
  status,
  params,
  logs,
  onParamChange,
}) => {
  return (
    <div className="bg-slate-950/95 border border-slate-800 rounded-md flex flex-col text-[11px] text-slate-100">
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 rounded-t-md">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-semibold tracking-wide uppercase text-[10px] text-slate-200">
            Lean Engine
          </span>
        </div>
        <span className="text-[10px] text-slate-400 capitalize">{status}</span>
      </div>
      <div className="px-3 py-2 border-b border-slate-800 bg-slate-950 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">Cash</span>
          <input
            type="number"
            value={params.cash}
            onChange={(event) => onParamChange('cash', event.target.value)}
            className="w-24 px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-[10px] text-slate-100 outline-none focus:border-slate-400"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">Fee (bps)</span>
          <input
            type="number"
            step="0.1"
            value={params.feeBps}
            onChange={(event) => onParamChange('feeBps', event.target.value)}
            className="w-16 px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-[10px] text-slate-100 outline-none focus:border-slate-400"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">Slippage (bps)</span>
          <input
            type="number"
            step="0.1"
            value={params.slippageBps}
            onChange={(event) => onParamChange('slippageBps', event.target.value)}
            className="w-16 px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-[10px] text-slate-100 outline-none focus:border-slate-400"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 bg-slate-950">
        {logs && logs.length > 0 ? (
          logs.slice(-200).map((line, index) => (
            <div key={`${index}-${line}`} className="font-mono text-[11px] text-slate-200">
              {line}
            </div>
          ))
        ) : (
          <div className="text-slate-500 text-[11px]">
            Lean stdout/stderr will appear here when a backtest is running.
          </div>
        )}
      </div>
    </div>
  );
};

