import React, { useEffect, useState, useRef } from 'react';
import { Settings, Code, RefreshCcw, Save, Play, Activity } from 'lucide-react';
import { StrategyFile } from '../types';
import { useToast } from '../components/common/Toast';

type StrategyViewProps = {
  onRunBacktest: () => void;
  onRunLeanBacktest: () => void;
  onNavigateToChart: () => void;
  activeStrategy: StrategyFile | null;
  onRefreshFromDisk: () => void;
  onSave: (code: string) => Promise<void> | void;
  leanStatus: 'idle' | 'queued' | 'running' | 'completed' | 'error';
  leanLogs: string[];
  leanJobId: string | null;
  leanError?: string | null;
  leanParams: { cash: number; feeBps: number; slippageBps: number };
  onLeanParamsChange: (next: { cash: number; feeBps: number; slippageBps: number }) => void;
};

export const StrategyView: React.FC<StrategyViewProps> = ({
  onRunBacktest,
  onRunLeanBacktest,
  onNavigateToChart,
  activeStrategy,
  onRefreshFromDisk,
  onSave,
  leanStatus,
  leanLogs,
  leanJobId,
  leanError,
  leanParams,
  onLeanParamsChange,
}) => {
  const [codeDraft, setCodeDraft] = useState(activeStrategy?.code ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const codeOverlayRef = useRef<HTMLPreElement>(null);
  const codeInputRef = useRef<HTMLTextAreaElement>(null);
  const addToast = useToast();

  const highlightPython = (code: string) => {
    const safe = code || '';
    const escape = (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const keywords = new Set([
      'def',
      'return',
      'if',
      'elif',
      'else',
      'for',
      'while',
      'import',
      'from',
      'as',
      'pass',
      'break',
      'continue',
      'class',
      'with',
      'yield',
      'try',
      'except',
      'finally',
      'raise',
      'in',
      'is',
      'None',
      'True',
      'False',
    ]);

    const pattern =
      /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|#.*$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/gm;

    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(safe)) !== null) {
      const [token] = match;
      result += escape(safe.slice(lastIndex, match.index));

      if (token.startsWith('#')) {
        result += `<span style="color:#334155">${escape(token)}</span>`;
      } else if (token.startsWith('"') || token.startsWith("'")) {
        result += `<span style="color:#0b3b82">${escape(token)}</span>`;
      } else if (/^\d/.test(token)) {
        result += `<span style="color:#0b2a4a">${escape(token)}</span>`;
      } else if (keywords.has(token)) {
        result += `<span style="color:#0f172a;font-weight:700">${escape(token)}</span>`;
      } else {
        result += escape(token);
      }

      lastIndex = match.index + token.length;
    }

    result += escape(safe.slice(lastIndex));
    return result;
  };

  const syncScroll = () => {
    if (codeOverlayRef.current && codeInputRef.current) {
      codeOverlayRef.current.scrollTop = codeInputRef.current.scrollTop;
      codeOverlayRef.current.scrollLeft = codeInputRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    setCodeDraft(activeStrategy?.code ?? '');
  }, [activeStrategy?.code]);

  const handleSave = async () => {
    if (!activeStrategy) return;
    setIsSaving(true);
    try {
      await onSave(codeDraft);
      addToast('Strategy saved, applied, and file updated.', 'success');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshFromDisk = async () => {
    try {
      await onRefreshFromDisk();
      addToast('Strategy reloaded from disk.', 'success');
    } catch (error) {
      addToast('Failed to reload strategy from disk.', 'error');
      console.warn('[strategy] refreshFromDisk failed', error);
    }
  };

  const hasUpdate = activeStrategy ? activeStrategy.lastModified > activeStrategy.appliedVersion : false;
  const leanStatusTone =
    leanStatus === 'running' || leanStatus === 'queued'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
      : leanStatus === 'completed'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : leanStatus === 'error'
          ? 'bg-rose-50 text-rose-700 border-rose-100'
          : 'bg-slate-50 text-slate-600 border-slate-200';
  const leanStatusLabel =
    leanStatus === 'running'
      ? 'Running'
      : leanStatus === 'queued'
        ? 'Queued'
      : leanStatus === 'completed'
        ? 'Done'
        : leanStatus === 'error'
          ? 'Error'
          : 'Idle';
  const leanDotColor =
    leanStatus === 'running' || leanStatus === 'queued'
      ? 'bg-indigo-500'
      : leanStatus === 'completed'
        ? 'bg-emerald-500'
        : leanStatus === 'error'
          ? 'bg-rose-500'
          : 'bg-slate-400';

  const updateParam = (key: 'cash' | 'feeBps' | 'slippageBps', value: number) => {
    const next = { ...leanParams, [key]: value };
    onLeanParamsChange(next);
  };

  const truncatePath = (value: string, max = 34) => {
    if (!value) return '';
    if (value.length <= max) return value;
    const head = value.slice(0, Math.floor((max - 5) / 2));
    const tail = value.slice(-Math.floor((max - 5) / 2));
    return `${head}...${tail}`;
  };

  const entryPathDisplay = truncatePath(activeStrategy.filePath);

  if (!activeStrategy) {
    return (
      <div className="max-w-6xl mx-auto h-full bg-white border border-slate-200 p-12 min-h-[720px] flex flex-col items-center justify-center text-center">
        <Code size={32} className="text-slate-300 mb-4" />
        <p className="text-slate-600 font-medium">No strategy file detected</p>
        <p className="text-sm text-slate-400 mt-2 max-w-md">Add a strategy file under <span className="font-mono bg-slate-100 px-1 rounded">strategies/</span> to begin editing.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-full bg-white border border-slate-200 flex flex-col shadow-sm">
      <div className="px-8 py-4 border-b border-slate-200 bg-slate-50/80 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">Strategy Configuration</h3>
            <p className="text-xs text-slate-500">Lean Engine settings</p>
          </div>
          <div className="flex items-center gap-3">
            {hasUpdate && (
              <button
                onClick={handleRefreshFromDisk}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
              >
                <RefreshCcw size={12} /> Update Available
              </button>
            )}
            <span className={`flex items-center gap-2 px-2.5 py-1 rounded-full border ${leanStatusTone}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${leanDotColor}`} />
              <span className="text-[10px] font-semibold">{leanStatusLabel}</span>
            </span>
            {leanJobId ? (
              <code className="text-[11px] text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-sm">{leanJobId}</code>
            ) : null}
            <button className="h-8 w-8 flex items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400 bg-white">
              <Settings size={14} />
            </button>
          </div>
        </div>

        <div className="pt-1">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <label className="md:col-span-2 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Engine Entry Point</span>
              <div
                className="w-full flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 font-mono truncate"
                title={activeStrategy.filePath}
              >
                <Code size={12} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{entryPathDisplay}</span>
              </div>
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Cash</span>
              <input
                type="number"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-sm bg-white text-sm text-right text-slate-800 font-mono focus:outline-none focus:border-slate-400 focus:shadow-[0_0_0_2px_rgba(15,23,42,0.08)]"
                value={leanParams.cash}
                onChange={(e) => updateParam('cash', Number(e.target.value || 0))}
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Fee (bps)</span>
              <input
                type="number"
                placeholder="0.5"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-sm bg-white text-sm text-right text-slate-800 font-mono focus:outline-none focus:border-slate-400 focus:shadow-[0_0_0_2px_rgba(15,23,42,0.08)]"
                value={leanParams.feeBps}
                step="0.1"
                onChange={(e) => updateParam('feeBps', Number(e.target.value || 0))}
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Slippage (bps)</span>
              <input
                type="number"
                placeholder="1.0"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-sm bg-white text-sm text-right text-slate-800 font-mono focus:outline-none focus:border-slate-400 focus:shadow-[0_0_0_2px_rgba(15,23,42,0.08)]"
                value={leanParams.slippageBps}
                step="0.1"
                onChange={(e) => updateParam('slippageBps', Number(e.target.value || 0))}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="relative flex-1">
          <pre
            ref={codeOverlayRef}
            aria-hidden
            className="absolute inset-0 m-0 p-6 font-mono text-sm leading-relaxed text-slate-800 whitespace-pre-wrap overflow-auto pointer-events-none border-b border-slate-100 z-10"
            dangerouslySetInnerHTML={{ __html: highlightPython(codeDraft || '') }}
          />
          <textarea
            ref={codeInputRef}
            value={codeDraft || ''}
            onChange={(event) => setCodeDraft(event.target.value)}
            onScroll={syncScroll}
            className="absolute inset-0 w-full h-full p-6 font-mono text-sm leading-relaxed text-transparent caret-slate-900 bg-transparent outline-none border-b border-slate-100 resize-none overflow-auto selection:bg-slate-200 z-0"
            spellCheck={false}
          />
        </div>
        <div className="flex justify-between items-center px-8 py-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Last modified:</span>
            <span className="font-mono text-slate-700">{new Date(activeStrategy.lastModified).toLocaleString()}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onNavigateToChart} className="px-4 py-2 bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:border-slate-300">
              View Chart
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-60"
            >
              <Save size={14} /> {isSaving ? 'Saving...' : 'Save & Apply'}
            </button>
            <button
              onClick={onRunLeanBacktest}
              disabled={leanStatus === 'running' || leanStatus === 'queued'}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 disabled:opacity-60"
            >
              <Play size={14} /> {leanStatus === 'running' || leanStatus === 'queued' ? 'Running on Lean...' : 'Run on Lean'}
            </button>
            <button onClick={onRunBacktest} className="px-4 py-2 bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500">
              Run Simulation
            </button>
          </div>
        </div>
      </div>
      <div className="border border-t-0 border-slate-200 bg-white">
        <div className="px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-slate-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Lean Logs</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {leanStatusLabel}
            {leanJobId ? ` | ${leanJobId}` : ''}
          </div>
        </div>
        <pre className="h-32 overflow-y-auto custom-scrollbar text-xs text-slate-600 bg-slate-50 px-8 py-3 border-t border-slate-100">
          {leanLogs && leanLogs.length ? leanLogs.slice(-200).join('\n') : 'No Lean logs yet. Start a Lean run to stream output.'}
        </pre>
      </div>
    </div>
  );
};


