import React from 'react';
import { Activity } from 'lucide-react';

type LeanLogPanelProps = {
  status: 'idle' | 'queued' | 'running' | 'completed' | 'error';
  jobId?: string | null;
  logs: string[];
};

export const LeanLogPanel: React.FC<LeanLogPanelProps> = ({ status, jobId, logs }) => {
  const statusLabel =
    status === 'running'
      ? 'Running backtest...'
      : status === 'queued'
        ? 'Queued in Lean...'
        : status === 'completed'
          ? 'Completed'
          : status === 'error'
            ? 'Error'
            : 'Idle';

  return (
    <div className="bg-slate-50 border border-slate-200 shadow-[0_6px_14px_rgba(15,23,42,0.025)] rounded-md flex flex-col">
      <div className="px-6 py-3 flex items-center justify-between border-b border-slate-50 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-600 tracking-widest">Logs</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span>{statusLabel}</span>
          {jobId ? <span className="text-slate-400">|</span> : null}
          {jobId ? <span className="font-mono text-slate-500">{jobId}</span> : null}
        </div>
      </div>
      <pre className="h-40 overflow-y-auto custom-scrollbar text-[11px] leading-relaxed font-mono text-slate-100 bg-slate-900/85 px-6 py-3 border-t border-slate-200 rounded-b-md transition-colors duration-150 hover:bg-slate-900/80">
        {logs && logs.length ? logs.slice(-200).join('\n') : 'No Lean logs yet. Start a Lean run to stream output.'}
      </pre>
    </div>
  );
};
