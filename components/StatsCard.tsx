import React from 'react';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, subValue, trend }) => {
  return (
    <div className="bg-white border border-slate-200 p-6 flex flex-col justify-between h-32 hover:border-slate-300 transition-colors">
      <div className="flex justify-between items-start">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
        {trend === 'up' && <ArrowUpRight size={16} className="text-slate-400" />}
        {trend === 'down' && <ArrowDownRight size={16} className="text-slate-400" />}
        {trend === 'neutral' && <Activity size={16} className="text-slate-400" />}
      </div>
      
      <div>
        <h3 className="text-3xl font-light text-slate-900 tracking-tight">{value}</h3>
        {subValue && (
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-medium px-1.5 py-0.5 ${
              trend === 'up' ? 'bg-slate-100 text-slate-700' : 
              trend === 'down' ? 'bg-slate-100 text-slate-700' : 
              'bg-slate-50 text-slate-500'
            }`}>
              {subValue}
            </span>
            <span className="text-[10px] text-slate-400">vs last period</span>
          </div>
        )}
      </div>
    </div>
  );
};