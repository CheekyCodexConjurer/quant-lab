import React from 'react';
import { View, NavItem } from '../types';
import {
  LayoutDashboard,
  LineChart,
  FlaskConical,
  Database,
  BookOpen,
  Github,
  LogOut,
  RefreshCw,
} from 'lucide-react';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  onRestart?: () => void;
}

const navItems: NavItem[] = [
  { id: View.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { id: View.CHART_VIEW, label: 'Chart View', icon: LineChart },
  { id: View.STRATEGY_LAB, label: 'Strategy Lab', icon: FlaskConical },
  { id: View.DATA_CONFIG, label: 'Data Config', icon: Database },
  { id: View.DOCUMENTATION, label: 'Docs', icon: BookOpen },
  { id: View.REPOSITORIES, label: 'Repos', icon: Github },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onRestart }) => {
  return (
    <div className="h-full flex flex-col justify-between py-6 pl-4 pr-2">
      {/* Brand */}
      <div className="mb-10 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            L
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">The Lab</h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Lumina Ed.</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 space-y-2">
        <p className="px-4 text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">Workspace</p>
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group
                ${isActive 
                  ? 'bg-white shadow-soft text-slate-900 font-semibold' 
                  : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                }`}
            >
              <item.icon 
                size={20} 
                className={`transition-colors duration-300 ${isActive ? 'text-lumina-accent' : 'text-slate-400 group-hover:text-slate-600'}`} 
              />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* User / Footer */}
      <div className="mt-8 space-y-2">
        <div className="p-4 rounded-3xl bg-white shadow-soft border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
              <img src="https://picsum.photos/100/100" alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center justify-between gap-2 flex-1 overflow-hidden">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">Trader Matt</p>
                <p className="text-xs text-slate-500 truncate">Lean Operator</p>
              </div>
              {onRestart && (
                <button
                  type="button"
                  onClick={onRestart}
                  title="Restart The Lab"
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition-colors"
                >
                  <RefreshCw size={16} />
                </button>
              )}
            </div>
          </div>
           <button className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-50 text-slate-500 text-xs hover:bg-slate-100 transition-colors">
             <LogOut size={14} /> Sign Out
           </button>
        </div>
      </div>
    </div>
  );
};
