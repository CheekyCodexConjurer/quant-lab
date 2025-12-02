import React from 'react';
import { AlertCircle, Terminal } from 'lucide-react';

export type StrategyConsoleLog = { type: 'info' | 'success' | 'error'; text: string };

export interface StrategyConsoleProps {
  logs: StrategyConsoleLog[];
  onClear?: () => void;
}

export const StrategyConsole: React.FC<StrategyConsoleProps> = ({ logs, onClear }) => {
  return (
    <div className="bg-slate-900 text-slate-300 p-4 font-mono text-xs border-top-4 border-slate-800 border-t-4">
      <div className="flex justify-between items-center mb-2 text-slate-500 uppercase tracking-widest text-[10px] font-bold">
        <span className="flex items-center gap-2">
          <Terminal size={12} /> Console Output
        </span>
        <button
          type="button"
          className="hover:text-white"
          onClick={() => onClear?.()}
          aria-label="Clear console output"
        >
          <AlertCircle size={12} />
        </button>
      </div>
      <div className="space-y-1 opacity-80 h-24 overflow-y-auto custom-scrollbar">
        {logs.map((log, index) => (
          <p
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className={log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'}
          >
            {log.text}
          </p>
        ))}
        <p className="animate-pulse">_</p>
      </div>
    </div>
  );
};

