import React from 'react';
import { Play, Save, RefreshCcw, FileCode, ArrowRight } from 'lucide-react';
import { PythonEditor } from '../editor/PythonEditor';
import { StrategyFile } from '../../types';

export interface StrategyEditorPanelProps {
  activeStrategy: StrategyFile | null;
  entryFullPath: string;
  isSaving: boolean;
  leanBusy: boolean;
  codeDraft: string;
  errorLines: number[];
  onNavigateToChart: () => void;
  onRefreshFromDisk: () => void;
  onSave: () => void;
  onRunLean: () => void;
  onChangeCode: (code: string) => void;
}

export const StrategyEditorPanel: React.FC<StrategyEditorPanelProps> = ({
  activeStrategy,
  entryFullPath,
  isSaving,
  leanBusy,
  codeDraft,
  errorLines,
  onNavigateToChart,
  onRefreshFromDisk,
  onSave,
  onRunLean,
  onChangeCode,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] shadow-soft flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-6 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileCode size={16} className="text-slate-400" />
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {activeStrategy ? activeStrategy.name || activeStrategy.id : 'No strategy selected'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {entryFullPath || 'strategies/main.py'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToChart}
            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded-full hover:bg-slate-100/80 transition-colors"
          >
            <ArrowRight size={11} />
            <span>Back to chart</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRefreshFromDisk}
            disabled={!activeStrategy}
            className="h-7 w-7 flex items-center justify-center text-[11px] font-semibold rounded-sm border border-slate-200 text-slate-600 bg-white hover:text-slate-900 hover:bg-slate-100/70 active:translate-y-[0.5px] transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-slate-300/20 disabled:opacity-60"
            title="Reload from disk"
            aria-label="Reload from disk"
          >
            <RefreshCcw size={16} />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || !activeStrategy}
            className="h-7 w-7 flex items-center justify-center text-[11px] font-semibold rounded-sm border border-slate-200 text-slate-600 bg-white hover:text-slate-900 hover:bg-slate-100/70 active:translate-y-[0.5px] transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-slate-300/20 disabled:opacity-60"
            title="Save strategy"
            aria-label="Save strategy"
          >
            <Save size={16} />
          </button>
          <button
            type="button"
            onClick={onRunLean}
            disabled={leanBusy || isSaving || !activeStrategy}
            className="h-7 px-3 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold rounded-full border border-slate-900 text-slate-50 bg-slate-900 hover:bg-slate-800 active:translate-y-[0.5px] transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-slate-300/40 disabled:opacity-60 disabled:cursor-not-allowed"
            title="Run strategy on Lean"
          >
            <Play size={13} className="mr-0.5" />
            <span>{leanBusy ? 'Running...' : 'Run Lean'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-b-[2rem] min-h-0">
        <div className="relative flex-1 min-h-0 h-full">
          {activeStrategy ? (
            <PythonEditor
              className="h-full"
              value={codeDraft}
              onChange={onChangeCode}
              placeholder="Write your Python strategy..."
              errorLines={errorLines}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
              <FileCode size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">
                Select a strategy to edit or create a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

