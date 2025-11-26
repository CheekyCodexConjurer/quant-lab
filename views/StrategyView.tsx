import React, { useEffect, useState, useRef } from 'react';
import { Settings, Code, RefreshCcw, Save } from 'lucide-react';
import { StrategyFile } from '../types';
import { useToast } from '../components/common/Toast';

type StrategyViewProps = {
  onRunBacktest: () => void;
  onNavigateToChart: () => void;
  activeStrategy: StrategyFile | null;
  onRefreshFromDisk: () => void;
  onSave: (code: string) => Promise<void> | void;
};

export const StrategyView: React.FC<StrategyViewProps> = ({ onRunBacktest, onNavigateToChart, activeStrategy, onRefreshFromDisk, onSave }) => {
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
      <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
        <div>
          <h3 className="text-lg font-medium text-slate-900">Strategy Configuration</h3>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
            <span>Lean Engine entry point</span>
            <span className="font-mono text-[11px] text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-sm">{activeStrategy.filePath}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasUpdate && (
            <button
              onClick={handleRefreshFromDisk}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-semibold uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
            >
              <RefreshCcw size={12} /> Update Available
            </button>
          )}
          <button className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1">
            <Settings size={14} /> Settings
          </button>
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
            <button onClick={onRunBacktest} className="px-4 py-2 bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500">
              Run Simulation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
