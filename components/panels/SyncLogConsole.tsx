import React, { useEffect, useRef } from 'react';
import { Terminal, FolderOpen } from 'lucide-react';

type SyncLogConsoleProps = {
  logs: string[];
  progress?: number;
  isRunning?: boolean;
  lastUpdated?: string | null;
  onClearLogs?: () => void;
  frameStatus?: {
    currentFrame?: string | null;
    frameIndex?: number;
    frameCount?: number;
    frameProgress?: number;
    frameStage?: string;
  };
  onCancel?: () => void;
};

const formatStage = (stage?: string) => {
  switch ((stage || '').toLowerCase()) {
    case 'resolving-range':
      return 'Resolving date range';
    case 'range-resolved':
      return 'Range resolved';
    case 'downloading':
      return 'Downloading data';
    case 'downloaded':
      return 'Download finished';
    case 'persisted':
      return 'Saving to disk';
    case 'completed':
      return 'Timeframe completed';
    case 'skipped':
      return 'Skipped (no data)';
    default:
      return stage || undefined;
  }
};

const ProgressRow: React.FC<{ progress: number; label: string; stage?: string }> = ({ progress, label, stage }) => {
  const safeProgress = Math.max(0, Math.min(1, progress));
  const percent = Math.round(safeProgress * 100);

  return (
    <div className="break-words flex items-center gap-3 py-1">
      <span className="text-slate-500">{'>'}</span>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-1">{label}</div>
        {stage && <div className="text-[10px] text-slate-400 mb-1">{stage}</div>}
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 transition-[width] duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <span className="text-slate-400 font-mono text-xs w-12 text-right">{percent}%</span>
    </div>
  );
};

export const SyncLogConsole: React.FC<SyncLogConsoleProps> = ({
  logs,
  progress = 0,
  isRunning = false,
  frameStatus,
  onClearLogs,
  lastUpdated,
  onCancel,
}) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, progress, frameStatus]);

  const hasFrame = Boolean(frameStatus?.currentFrame);
  const frameLabel = hasFrame
    ? `Timeframe ${String(frameStatus?.currentFrame || '').toUpperCase()} (${(frameStatus?.frameIndex ?? 0) + 1}/${
        frameStatus?.frameCount ?? '?'
      })`
    : '';
  const frameStage = formatStage(frameStatus?.frameStage);
  const frameProgress = typeof frameStatus?.frameProgress === 'number' ? frameStatus.frameProgress : undefined;
  const overallStage = isRunning ? 'Downloading data' : undefined;
  const canClear = Boolean(onClearLogs) && !isRunning && logs.length > 0;
  const statusLabel = isRunning ? 'Running' : logs.length > 0 ? 'Idle' : 'Waiting';
  const canCancel = Boolean(onCancel) && isRunning;

  return (
    <div className="bg-slate-900 p-6 rounded-sm border border-slate-800 text-slate-300 font-mono text-xs flex flex-col min-h-[320px] max-h-[520px] md:max-h-[560px] overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-slate-500" />
          <span className="font-semibold text-slate-400">Import Log Output</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className={`px-2 py-0.5 rounded-full border ${isRunning ? 'border-amber-400 text-amber-300' : 'border-slate-500 text-slate-300'}`}>
              {statusLabel}
            </span>
            {lastUpdated && <span>Updated {new Date(lastUpdated).toLocaleTimeString()}</span>}
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={!canCancel}
              className="text-[11px] px-2 py-1 border border-slate-700 rounded-sm text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-40"
            >
              Cancel
            </button>
          )}
          {onClearLogs && (
            <button
              onClick={onClearLogs}
              disabled={!canClear}
              className="text-[11px] px-2 py-1 border border-slate-700 rounded-sm text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-40"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      {isRunning && (
        <div className="space-y-1 py-3 sticky top-0 z-10 bg-slate-900">
          <ProgressRow label="Overall progress" progress={progress} stage={overallStage} />
          {hasFrame && (
            <ProgressRow
              label={frameLabel}
              progress={frameProgress ?? progress}
              stage={frameStage || 'In progress'}
            />
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-2 mt-2">
        {logs.length === 0 && !isRunning ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600">
            <FolderOpen size={24} className="mb-2 opacity-50" />
            <p>Waiting for import command...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600">
            <p>No logs yet.</p>
          </div>
        ) : (
          <>
            {logs.map((log, index) => (
              <div key={`${log}-${index}`} className="break-words">
                <span className="text-slate-500 mr-2">{'>'}</span>
                {log}
              </div>
            ))}
          </>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};
