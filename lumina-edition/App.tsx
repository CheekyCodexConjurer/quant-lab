import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TradingChart } from './components/TradingChart';
import { StrategyEditor, FileNode } from './components/StrategyEditor';
import { DataConfig } from './components/DataConfig';
import { Documentation } from './components/Documentation';
import { Repositories } from './components/Repositories';
import { View } from './types';
import { Search, Bell } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);

  const mockFiles: FileNode[] = [
    { id: 'strategies-root', name: 'strategies', type: 'folder' },
    { id: 'main', name: 'main.py', type: 'file', parentId: 'strategies-root', active: true },
  ];

  const renderView = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard />;
      case View.CHART_VIEW:
        return <TradingChart />;
      case View.STRATEGY_LAB:
        return (
          <StrategyEditor
            files={mockFiles}
            activeFileId="main"
            code="# Sample strategy code (Lumina sandbox)"
            onSelectFile={() => undefined}
            onChangeCode={() => undefined}
            onSave={() => undefined}
            onRun={() => undefined}
          />
        );
      case View.DATA_CONFIG:
        return <DataConfig />;
      case View.DOCUMENTATION:
        return <Documentation />;
      case View.REPOSITORIES:
        return <Repositories />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <p className="text-xl font-bold mb-2">404</p>
              <p className="text-sm">View not found.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#f3f5f8] font-sans text-slate-800 overflow-hidden selection:bg-sky-200 selection:text-sky-900">
      
      {/* Sidebar - Floating Style */}
      <div className="hidden md:block w-72 h-full p-4">
        <div className="bg-white/80 backdrop-blur-xl h-full rounded-[2.5rem] shadow-soft border border-white">
          <Sidebar currentView={currentView} onChangeView={setCurrentView} />
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
               <span className="text-lumina-accent">{currentView.replace('_', ' ')}</span>
             </div>
             <h2 className="text-2xl font-bold text-slate-800">
               {currentView === View.DASHBOARD ? 'Overview' : 
                currentView === View.CHART_VIEW ? 'Market Analysis' :
                currentView === View.STRATEGY_LAB ? 'Strategy Development' :
                currentView === View.DATA_CONFIG ? 'Configuration' :
                currentView === View.DOCUMENTATION ? 'Documentation' : 'Repositories'}
             </h2>
           </div>

           {/* Actions */}
           <div className="flex items-center gap-4">
             {/* Search Pill */}
             <div className="hidden lg:flex items-center bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 w-64 group focus-within:ring-2 focus-within:ring-sky-100 transition-all">
                <Search size={18} className="text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search assets..." 
                  className="bg-transparent border-none outline-none text-sm ml-2 w-full placeholder:text-slate-400 text-slate-700"
                />
             </div>

             <button className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-soft text-slate-500 hover:text-sky-500 hover:shadow-md transition-all relative">
                <Bell size={20} />
                <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
             </button>

             <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-2xl shadow-soft border border-slate-100">
                <span className="px-3 py-1 bg-slate-100 text-[10px] font-bold text-slate-500 rounded-lg uppercase tracking-wide">Debug Off</span>
                <span className="px-3 py-1 bg-sky-50 text-[10px] font-bold text-sky-600 rounded-lg uppercase tracking-wide border border-sky-100">Internal</span>
             </div>
           </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 custom-scrollbar">
           {renderView()}
        </main>

      </div>
    </div>
  );
};

export default App;
