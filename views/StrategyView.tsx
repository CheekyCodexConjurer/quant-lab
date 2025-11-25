import React from 'react';
import { Settings, Code } from 'lucide-react';

type StrategyViewProps = {
  onRunBacktest: () => void;
  onNavigateToChart: () => void;
};

export const StrategyView: React.FC<StrategyViewProps> = ({ onRunBacktest, onNavigateToChart }) => (
  <div className="max-w-4xl mx-auto bg-white border border-slate-200 p-8 min-h-[500px]">
    <div className="flex items-center justify-between mb-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900">Strategy Configuration</h3>
        <p className="text-slate-500 text-sm mt-1">
          Lean Engine parameters for <span className="font-mono text-slate-700 bg-slate-100 px-1">main.py</span>
        </p>
      </div>
      <button className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1">
        <Settings size={14} /> Settings
      </button>
    </div>

    <div className="p-12 border border-dashed border-slate-300 flex flex-col items-center justify-center text-center bg-slate-50/50">
      <Code size={32} className="text-slate-300 mb-4" />
      <p className="text-slate-600 font-medium">Strategy Code Integration</p>
      <p className="text-sm text-slate-400 mt-2 max-w-md">
        The strategy logic is currently handled by the underlying Lean Engine integration. Editing parameters directly via UI is disabled in this version.
      </p>
      <div className="mt-8 flex gap-3">
        <button onClick={onNavigateToChart} className="px-4 py-2 bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:border-slate-300">
          View Chart
        </button>
        <button onClick={onRunBacktest} className="px-4 py-2 bg-slate-900 text-white text-xs font-medium hover:bg-slate-800">
          Run Simulation
        </button>
      </div>
    </div>
  </div>
);
