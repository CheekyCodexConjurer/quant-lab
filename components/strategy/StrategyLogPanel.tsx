import React, { useMemo, useState } from 'react';
import { Activity, AlertCircle } from 'lucide-react';
import { StrategyLabError, StrategyLabErrorSource } from '../../types';

type StrategyLogPanelProps = {
  events: StrategyLabError[];
  onJumpToLocation?: (event: StrategyLabError) => void;
};

const SOURCE_OPTIONS: { label: string; value: StrategyLabErrorSource | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Indicators', value: 'indicator' },
  { label: 'Strategy', value: 'strategy' },
  { label: 'Lean', value: 'lean' },
  { label: 'System', value: 'system' },
];

const sourceLabel = (source: StrategyLabErrorSource) => {
  if (source === 'indicator') return 'IND';
  if (source === 'strategy') return 'STRAT';
  if (source === 'lean') return 'LEAN';
  return 'SYS';
};

const sourceColor = (source: StrategyLabErrorSource) => {
  if (source === 'indicator') return 'bg-sky-100 text-sky-700 border-sky-200';
  if (source === 'strategy') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (source === 'lean') return 'bg-violet-100 text-violet-700 border-violet-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

export const StrategyLogPanel: React.FC<StrategyLogPanelProps> = ({ events, onJumpToLocation }) => {
  const [sourceFilter, setSourceFilter] = useState<StrategyLabErrorSource | 'all'>('all');

  const filtered = useMemo(() => {
    const sorted = [...events].sort((a, b) => a.createdAt - b.createdAt);
    if (sourceFilter === 'all') return sorted;
    return sorted.filter((event) => event.source === sourceFilter);
  }, [events, sourceFilter]);

  const handleClick = (event: StrategyLabError) => {
    if (!onJumpToLocation) return;
    onJumpToLocation(event);
  };

  const hasEvents = filtered.length > 0;

  return (
    <div className="bg-slate-50 border border-slate-200 shadow-[0_6px_14px_rgba(15,23,42,0.025)] rounded-md flex flex-col">
      <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-600 tracking-widest">Strategy Lab Logs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-slate-200 bg-white/80 px-1 py-[2px] text-[10px] text-slate-500">
            {SOURCE_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setSourceFilter(item.value)}
                className={`px-2 py-[1px] rounded-full transition-colors ${
                  sourceFilter === item.value
                    ? 'bg-slate-900 text-slate-50'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="h-40 overflow-y-auto custom-scrollbar text-[11px] leading-relaxed font-mono bg-slate-900/90 px-6 py-3 rounded-b-md">
        {!hasEvents ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <AlertCircle size={18} className="mb-1 opacity-60" />
            <p className="text-[11px]">No Strategy Lab logs yet.</p>
            <p className="text-[11px] text-slate-600 mt-0.5">Errors and warnings will appear here.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.slice(-200).map((event, index) => {
              const timestamp = new Date(event.createdAt || Date.now()).toISOString().split('T')[1]?.slice(0, 8);
              const fileLabel =
                event.file && typeof event.line === 'number'
                  ? `${event.file}:${event.line}`
                  : event.file
                    ? event.file
                    : null;
              const key = `${event.source}-${event.type}-${event.message}-${event.createdAt}-${index}`;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleClick(event)}
                  className="w-full text-left group flex items-start gap-2 text-slate-100 hover:bg-slate-800/70 rounded-sm px-2 py-1 transition-colors"
                >
                  <span className="text-[10px] text-slate-500 w-[52px] shrink-0 mt-[1px]">{timestamp}</span>
                  <span
                    className={`text-[9px] px-1.5 py-[1px] border rounded-full uppercase tracking-widest ${sourceColor(
                      event.source
                    )} shrink-0 mt-[1px]`}
                  >
                    {sourceLabel(event.source)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 text-[11px]">
                      <span className="text-amber-300 font-semibold">{event.type}</span>
                      {event.phase ? (
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">
                          ({event.phase})
                        </span>
                      ) : null}
                      {fileLabel ? (
                        <span className="text-[10px] text-slate-400 truncate max-w-[220px]">{fileLabel}</span>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-slate-100 truncate">
                      {event.message || '(no message)'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

