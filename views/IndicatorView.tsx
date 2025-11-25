import React from 'react';
import { Plus, CheckCircle2, Trash2, FileCode, Upload, Save, Code, RefreshCcw } from 'lucide-react';
import { CustomIndicator } from '../types';

type IndicatorViewProps = {
  indicators: CustomIndicator[];
  selectedIndicatorId: string | null;
  setSelectedIndicatorId: (id: string | null) => void;
  activeIndicator: CustomIndicator | null;
  createIndicator: () => void;
  deleteIndicator: (id: string) => void;
  saveIndicator: (id: string, code: string, name?: string) => Promise<void> | void;
  toggleActiveIndicator: (id: string) => void;
  refreshFromDisk: (id: string) => Promise<void> | void;
};

export const IndicatorView: React.FC<IndicatorViewProps> = ({
  indicators,
  selectedIndicatorId,
  setSelectedIndicatorId,
  activeIndicator,
  createIndicator,
  deleteIndicator,
  saveIndicator,
  toggleActiveIndicator,
  refreshFromDisk,
}) => {
  const [isSaving, setIsSaving] = React.useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedIndicatorId) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          saveIndicator(selectedIndicatorId, e.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSave = async () => {
    if (!selectedIndicatorId || !activeIndicator) return;
    setIsSaving(true);
    try {
      await saveIndicator(selectedIndicatorId, activeIndicator.code, activeIndicator.name);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex gap-6">
      <div className="w-72 flex flex-col bg-white border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900">Indicators</span>
          <button
            onClick={createIndicator}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-slate-600 transition-colors"
            title="New Indicator"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {indicators.map((indicator) => (
            <div
              key={indicator.id}
              onClick={() => setSelectedIndicatorId(indicator.id)}
              className={`p-3 border-b border-slate-50 cursor-pointer transition-colors group ${
                selectedIndicatorId === indicator.id ? 'bg-slate-50 border-l-2 border-l-slate-900' : 'hover:bg-slate-50/50 border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${selectedIndicatorId === indicator.id ? 'text-slate-900' : 'text-slate-600'}`}>
                  {indicator.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleActiveIndicator(indicator.id);
                  }}
                  className={`text-slate-400 hover:text-slate-900 transition-colors ${
                    indicator.isActive ? 'text-emerald-500 hover:text-emerald-600' : ''
                  }`}
                  title={indicator.isActive ? 'Active on Chart' : 'Activate'}
                >
                  {indicator.isActive ? <CheckCircle2 size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Updated {new Date(indicator.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteIndicator(indicator.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 flex flex-col shadow-sm relative">
        {selectedIndicatorId && activeIndicator ? (
          <>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FileCode size={16} className="text-slate-400" />
                    <input
                      type="text"
                      value={activeIndicator.name}
                      onChange={(event) => saveIndicator(selectedIndicatorId, activeIndicator.code, event.target.value)}
                      className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-400 text-sm font-semibold text-slate-900 outline-none w-48 transition-colors"
                    />
                  </div>
                  {activeIndicator.filePath && (
                    <span className="px-2 py-1 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded-sm">
                      {activeIndicator.filePath}
                    </span>
                  )}
                  <div className="h-4 w-px bg-slate-200" />
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors">
                    <Upload size={14} />
                    Import
                    <input type="file" accept=".py,.txt" className="hidden" onChange={handleFileUpload} />
                  </label>
                  {activeIndicator.hasUpdate && (
                    <button
                      onClick={() => refreshFromDisk(selectedIndicatorId)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-semibold uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    >
                      <RefreshCcw size={12} /> Update Available
                    </button>
                  )}
                </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleActiveIndicator(selectedIndicatorId)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                    activeIndicator.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {activeIndicator.isActive ? <CheckCircle2 size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
                    {activeIndicator.isActive ? 'Active on Chart' : 'Add to Chart'}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase rounded-sm hover:bg-slate-800 disabled:opacity-60"
                  >
                    <Save size={14} /> {isSaving ? 'Saving...' : 'Save & Apply'}
                  </button>
                </div>
              </div>

            <div className="flex-1 relative">
              <textarea
                value={activeIndicator.code}
                onChange={(event) => saveIndicator(selectedIndicatorId, event.target.value)}
                className="w-full h-full p-6 font-mono text-sm leading-relaxed text-slate-800 bg-white outline-none resize-none"
                spellCheck={false}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Code size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">Select an indicator to edit or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
};
