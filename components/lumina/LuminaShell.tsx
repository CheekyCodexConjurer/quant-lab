import React from 'react';
import { Search, Bell } from 'lucide-react';
import { ViewState } from '../../types';
import { Sidebar } from '../../lumina-edition/components/Sidebar';
import { View as LuminaView } from '../../lumina-edition/types';

type RepoStatus = 'disconnected' | 'syncing' | 'synced' | 'error';

export interface LuminaShellProps {
  activeView: ViewState;
  onChangeView: (view: ViewState) => void;
  repoStatus: RepoStatus;
  licenseMode: string;
  debugMode: boolean;
  onToggleDebugMode: () => void;
  children: React.ReactNode;
}

const mapViewStateToLumina = (view: ViewState): LuminaView => {
  switch (view) {
    case ViewState.DASHBOARD:
      return LuminaView.DASHBOARD;
    case ViewState.CHART:
      return LuminaView.CHART_VIEW;
    case ViewState.STRATEGY:
      return LuminaView.STRATEGY_LAB;
    case ViewState.DATA_NORMALIZATION:
      return LuminaView.DATA_CONFIG;
    case ViewState.API_DOCS:
      return LuminaView.DOCUMENTATION;
    case ViewState.REPOSITORY:
      return LuminaView.REPOSITORIES;
    case ViewState.ANALYSIS:
    case ViewState.DEBUG:
    default:
      return LuminaView.DASHBOARD;
  }
};

const mapLuminaToViewState = (view: LuminaView): ViewState => {
  switch (view) {
    case LuminaView.DASHBOARD:
      return ViewState.DASHBOARD;
    case LuminaView.CHART_VIEW:
      return ViewState.CHART;
    case LuminaView.STRATEGY_LAB:
      return ViewState.STRATEGY;
    case LuminaView.DATA_CONFIG:
      return ViewState.DATA_NORMALIZATION;
    case LuminaView.DOCUMENTATION:
      return ViewState.API_DOCS;
    case LuminaView.REPOSITORIES:
      return ViewState.REPOSITORY;
    default:
      return ViewState.DASHBOARD;
  }
};

const viewLabel = (view: ViewState) => {
  switch (view) {
    case ViewState.DASHBOARD:
      return 'Overview';
    case ViewState.CHART:
      return 'Market Analysis';
    case ViewState.STRATEGY:
      return 'Strategy Development';
    case ViewState.DATA_NORMALIZATION:
      return 'Configuration';
    case ViewState.API_DOCS:
      return 'Documentation';
    case ViewState.REPOSITORY:
      return 'Repositories';
    case ViewState.ANALYSIS:
      return 'Analysis';
    case ViewState.DEBUG:
      return 'Debug Console';
    default:
      return 'Overview';
  }
};

export const LuminaShell: React.FC<LuminaShellProps> = ({
  activeView,
  onChangeView,
  repoStatus,
  licenseMode,
  debugMode,
  onToggleDebugMode,
  children,
}) => {
  const currentLuminaView = mapViewStateToLumina(activeView);
  const repoLabel =
    repoStatus === 'synced'
      ? 'Synced'
      : repoStatus === 'syncing'
      ? 'Syncing'
      : repoStatus === 'error'
      ? 'Repo Error'
      : 'Disconnected';

  const debugLabel = debugMode ? 'Debug On' : 'Debug Off';

  return (
    <div className="flex h-screen bg-[#f3f5f8] font-sans text-slate-800 overflow-hidden selection:bg-sky-200 selection:text-sky-900">
      {/* Sidebar - Floating Style */}
      <div className="hidden md:block w-72 h-full p-4">
        <div className="bg-white/80 backdrop-blur-xl h-full rounded-[2.5rem] shadow-soft border border-white">
          <Sidebar
            currentView={currentLuminaView}
            onChangeView={(next) => onChangeView(mapLuminaToViewState(next))}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Bar */}
        <header className="h-24 px-8 flex items-center justify-between shrink-0">
          {/* Breadcrumbs / Page Title */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              <span>App</span>
              <span>/</span>
              <span className="text-lumina-accent">{ViewState[activeView] || 'CHART'}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">{viewLabel(activeView)}</h2>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Search Pill */}
            <div className="hidden lg:flex items-center bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 w-64 group focus-within:ring-2 focus-within:ring-sky-100 transition-all">
              <Search
                size={18}
                className="text-slate-400 group-focus-within:text-sky-500 transition-colors"
              />
              <input
                type="text"
                placeholder="Search assets..."
                className="bg-transparent border-none outline-none text-sm ml-2 w-full placeholder:text-slate-400 text-slate-700"
              />
            </div>

            <button
              type="button"
              className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-soft text-slate-500 hover:text-sky-500 hover:shadow-md transition-all relative"
            >
              <Bell size={20} />
              <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>

            <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-2xl shadow-soft border border-slate-100">
              <span className="px-3 py-1 bg-slate-100 text-[10px] font-bold text-slate-500 rounded-lg uppercase tracking-wide">
                {debugLabel}
              </span>
              <span className="px-3 py-1 bg-sky-50 text-[10px] font-bold text-sky-600 rounded-lg uppercase tracking-wide border border-sky-100">
                {licenseMode || 'Internal'}
              </span>
              <span className="px-3 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 rounded-lg uppercase tracking-wide border border-slate-100">
                {repoLabel}
              </span>
              <button
                type="button"
                onClick={onToggleDebugMode}
                className="ml-1 text-[10px] font-semibold text-sky-600 hover:text-sky-700"
              >
                Toggle Debug
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};
