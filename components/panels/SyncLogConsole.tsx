import React, { useEffect, useRef } from 'react';
import { Terminal, FolderOpen } from 'lucide-react';

type SyncLogConsoleProps = {
  logs: string[];
  progress?: number;
  isRunning?: boolean;
};

const ProgressRow: React.FC<{ progress: number }> = ({ progress }) => {
  const safeProgress = Math.max(0, Math.min(1, progress));
  const percent = Math.round(safeProgress * 100);

  return (
    <div className="break-words flex items-center gap-3 py-1">
      <span className="text-slate-500">{'>'}</span>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2">Downloading data</div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 transition-[width] duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <span className="text-slate-400 font-mono text-xs w-12 text-right">{percent}%</span>
    </div>
  );
};

export const SyncLogConsole: React.FC<SyncLogConsoleProps> = ({ logs, progress = 0, isRunning = false }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, progress]);

  return (
    <div className="bg-slate-900 p-6 rounded-sm border border-slate-800 text-slate-300 font-mono text-xs flex flex-col h-[300px]">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-2">
        <Terminal size={14} className="text-slate-500" />
        <span className="font-semibold text-slate-400">Import Log Output</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-2">
        {isRunning && <ProgressRow progress={progress} />}
        {logs.length === 0 && !isRunning ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600">
            <FolderOpen size={24} className="mb-2 opacity-50" />
            <p>Waiting for import command...</p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={`${log}-${index}`} className="break-words">
              <span className="text-slate-500 mr-2">{'>'}</span>
              {log}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};
