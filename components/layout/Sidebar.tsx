import React from 'react';
import { LayoutGrid, BarChart2, Code, Database, Sliders, BookOpen, Github, User, ChevronRight } from 'lucide-react';
import { ViewState } from '../../types';

type SidebarProps = {
  activeView: ViewState;
  onChange: (view: ViewState) => void;
};

const SidebarItem = ({
  icon,
  label,
  isActive,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 mb-1 ${
      isActive ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
    }`}
  >
    {icon}
    <span className="text-sm tracking-wide whitespace-nowrap">{label}</span>
    {isActive && <ChevronRight size={14} className="ml-auto text-slate-400" />}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onChange }) => (
  <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-50">
    <div className="p-8 pb-12">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 bg-slate-900 rounded-sm" />
        <span className="font-semibold text-lg tracking-tight text-slate-900">The Lab</span>
      </div>
    </div>

    <nav className="flex-1 px-6 space-y-1 overflow-y-auto custom-scrollbar">
      <SidebarItem icon={<LayoutGrid size={18} />} label="Overview" isActive={activeView === ViewState.ANALYSIS} onClick={() => onChange(ViewState.ANALYSIS)} />
      <SidebarItem icon={<BarChart2 size={18} />} label="Chart" isActive={activeView === ViewState.CHART} onClick={() => onChange(ViewState.CHART)} />
      <SidebarItem
        icon={<Code size={18} />}
        label="Chart Indicator"
        isActive={activeView === ViewState.CHART_INDICATOR}
        onClick={() => onChange(ViewState.CHART_INDICATOR)}
      />
      <SidebarItem
        icon={<Code size={18} />}
        label="Lean Strategy"
        isActive={activeView === ViewState.STRATEGY}
        onClick={() => onChange(ViewState.STRATEGY)}
      />

      <div className="pt-4 mt-4 border-t border-slate-100">
        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Data</p>
        <SidebarItem icon={<Database size={18} />} label="Data Sources" isActive={activeView === ViewState.DATA} onClick={() => onChange(ViewState.DATA)} />
        <SidebarItem
          icon={<Sliders size={18} />}
          label="Data Settings"
          isActive={activeView === ViewState.DATA_NORMALIZATION}
          onClick={() => onChange(ViewState.DATA_NORMALIZATION)}
        />
      </div>

      <div className="pt-4 mt-4 border-t border-slate-100">
        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">External</p>
        <SidebarItem icon={<BookOpen size={18} />} label="API Docs" isActive={activeView === ViewState.API_DOCS} onClick={() => onChange(ViewState.API_DOCS)} />
        <a
          href="https://github.com/CheekyCodexConjurer/trader-matthews-lean-lab"
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200"
        >
          <Github size={18} />
          <span className="text-sm tracking-wide">Repository</span>
        </a>
      </div>
    </nav>

    <div className="p-6 mt-auto border-t border-slate-100">
      <div className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-50 cursor-pointer transition-colors">
        <div className="w-8 h-8 bg-slate-100 flex items-center justify-center rounded-sm">
          <User size={14} className="text-slate-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">trader.matthews</p>
          <p className="text-xs text-slate-500">Lean Operator</p>
        </div>
      </div>
    </div>
  </aside>
);
