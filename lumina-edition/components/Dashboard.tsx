import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, ReferenceLine, ReferenceArea, PieChart, Pie
} from 'recharts';
import { 
  ArrowUpRight, ArrowDownRight, 
  X, ChevronDown,
  GripVertical, Maximize2,
  Edit2, ChevronRight
} from 'lucide-react';

// --- Types ---

type Preset = 'Default' | 'Intraday' | 'Swing' | 'Prop' | 'Minimal';
type CardId = 
  | 'strategyHealth'
  | 'equityCurve' 
  | 'drawdownStats' 
  | 'riskRules' 
  | 'execution' 
  | 'behavior' 
  | 'tradeProfile' 
  | 'breakdown' 
  | 'backtests' 
  | 'logs';

type LayoutRow = CardId[];
type GridState = LayoutRow[];

interface VisibilityState {
  [key: string]: boolean;
}

interface RiskConfig {
  style: string;
  dailyDDLimit: number;
  dailyDDIsPct: boolean;
  totalDDLimit: number;
  totalDDIsPct: boolean;
  minTradesPerDay: number;
  maxTradesPerDay: number;
  maxTradesAfterTarget: number;
  dailyTarget: number;
  consistencyThreshold: number;
}

type HealthDisplayMode = 'card' | 'pill';

// --- Constants & Defaults ---

const PRESET_CONFIGS: Record<Preset, { visible: VisibilityState, layout: GridState }> = {
  Default: {
    visible: {
      strategyHealth: true, equityCurve: true, drawdownStats: true, riskRules: true, 
      execution: true, behavior: true, tradeProfile: true, breakdown: true, 
      backtests: true, logs: true
    },
    layout: [
      ['strategyHealth'],
      ['equityCurve', 'drawdownStats'],
      ['riskRules'],
      ['execution', 'tradeProfile'],
      ['behavior'],
      ['breakdown'],
      ['backtests', 'logs']
    ]
  },
  Intraday: {
    visible: {
      strategyHealth: true, equityCurve: true, drawdownStats: true, riskRules: true, 
      execution: true, behavior: true, tradeProfile: false, breakdown: true, 
      backtests: true, logs: true
    },
    layout: [
      ['strategyHealth'],
      ['equityCurve', 'drawdownStats'],
      ['riskRules'],
      ['execution'],
      ['behavior'],
      ['breakdown'],
      ['backtests', 'logs']
    ]
  },
  Swing: {
    visible: {
      strategyHealth: true, equityCurve: true, drawdownStats: true, riskRules: true, 
      execution: false, behavior: true, tradeProfile: true, breakdown: true, 
      backtests: true, logs: true
    },
    layout: [
      ['strategyHealth'],
      ['equityCurve', 'drawdownStats'],
      ['riskRules'],
      ['behavior', 'tradeProfile'],
      ['breakdown'],
      ['backtests', 'logs']
    ]
  },
  Prop: {
    visible: {
      strategyHealth: true, equityCurve: true, drawdownStats: true, riskRules: true, 
      execution: true, behavior: true, tradeProfile: false, breakdown: false, 
      backtests: false, logs: false
    },
    layout: [
      ['strategyHealth'],
      ['riskRules'], 
      ['behavior'], 
      ['execution'], 
      ['equityCurve', 'drawdownStats']
    ]
  },
  Minimal: {
    visible: {
      strategyHealth: false, equityCurve: true, drawdownStats: false, riskRules: false, 
      execution: false, behavior: false, tradeProfile: false, breakdown: false, 
      backtests: false, logs: false
    },
    layout: [['equityCurve']]
  }
};

// --- Mock Data ---

const equityData = Array.from({ length: 30 }, (_, i) => {
  const pnl = (Math.random() - 0.4) * 1000;
  return {
    name: `Day ${i + 1}`,
    equity: 100000 + Math.random() * 20000 + (i * 500),
    drawdown: -Math.abs(Math.random() * 2500),
    pnl: pnl,
    trades: Math.floor(Math.random() * 8) + 1,
    streak: Math.floor(Math.random() * 5),
    isMaxDDPeriod: i >= 12 && i <= 16
  };
});

const slippageData = [
  { ticks: 0, count: 45 },
  { ticks: 1, count: 30 },
  { ticks: 2, count: 15 },
  { ticks: 3, count: 5 },
  { ticks: 4, count: 2 },
  { ticks: 5, count: 1 },
];

const instrumentData = [
  { symbol: 'ES', trades: 142, pnl: 12450, winRate: 68, dd: -1200, sharpe: 2.1 },
  { symbol: 'NQ', trades: 89, pnl: 8300, winRate: 62, dd: -2400, sharpe: 1.8 },
  { symbol: 'CL', trades: 34, pnl: -1200, winRate: 45, dd: -1500, sharpe: -0.5 },
  { symbol: 'GC', trades: 12, pnl: 450, winRate: 55, dd: -400, sharpe: 1.1 },
];

// Enhanced Mock Data for Trade Profile Analysis
const detailedTradeData = Array.from({ length: 150 }, (_, i) => {
    const isWin = Math.random() > 0.45;
    const pnl = isWin ? Math.random() * 500 : Math.random() * -400;
    const duration = Math.floor(Math.random() * 120) + 1; // 1 to 120 mins
    
    return {
        id: i,
        duration: duration,
        size: Math.floor(Math.random() * 5) + 1,
        hour: 9 + Math.floor(Math.random() * 7), // 9-16
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][Math.floor(Math.random() * 5)],
        setup: ['Rev', 'Trend', 'Breakout'][Math.floor(Math.random() * 3)],
        mae: Math.floor(Math.random() * 15),
        mfe: Math.floor(Math.random() * 40),
        pnl: pnl,
        r: pnl / 150, // rough R calc based on arbitrary risk
        returnAmt: pnl
    };
});

const backtestData = [
  { id: 1, name: 'MR_Gamma_v2', date: 'Today 14:30', profit: 4500, dd: -120, win: 65 },
  { id: 2, name: 'MR_Gamma_v1', date: 'Yesterday', profit: 2100, dd: -450, win: 58 },
  { id: 3, name: 'Trend_Alpha', date: 'Nov 28', profit: -800, dd: -1200, win: 42 },
];

const systemLogs = [
  { time: '10:42:05', type: 'INFO', msg: 'Strategy "Mean Rev Gamma" synced.' },
  { time: '10:42:01', type: 'INFO', msg: 'Data feed connected (Main).' },
  { time: '10:41:58', type: 'WARN', msg: 'High latency detected on feed B (140ms).' },
  { time: '10:41:55', type: 'INFO', msg: 'System initialized.' },
];

const rollingSharpeData = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  val: 1.5 + Math.random() * 1.5
}));

const rDistributionData = [
  { range: '<-2', count: 5 },
  { range: '-1to-2', count: 12 },
  { range: '-1to0', count: 25 },
  { range: '0to1', count: 15 },
  { range: '1to2', count: 28 },
  { range: '>2', count: 15 },
];

const dayOfWeekWinRate = [
  { day: 'Mon', rate: 45 },
  { day: 'Tue', rate: 62 },
  { day: 'Wed', rate: 70 },
  { day: 'Thu', rate: 55 },
  { day: 'Fri', rate: 48 },
];

// --- Sub-Components ---

const Card = ({ 
  title, children, className = '', height = 'auto', action, 
  id, isDraggable, onDragStart, onDrop, onDragOver, onClick 
}: any) => (
  <div 
    id={id}
    draggable={isDraggable}
    onDragStart={(e) => onDragStart && onDragStart(e, id)}
    onDragOver={(e) => onDragOver && onDragOver(e)}
    onDrop={(e) => onDrop && onDrop(e, id)}
    onClick={onClick}
    className={`bg-white rounded-2xl shadow-soft border border-slate-100 flex flex-col overflow-hidden transition-all duration-300 ${className} ${isDraggable ? 'cursor-grab active:cursor-grabbing hover:border-sky-300 hover:shadow-md ring-1 ring-transparent hover:ring-sky-100' : ''} ${onClick ? 'cursor-pointer hover:border-sky-200' : ''}`} 
    style={{ height }}
  >
    <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center shrink-0 bg-white relative z-10">
      <div className="flex items-center gap-3">
        {isDraggable && <GripVertical size={16} className="text-slate-400" />}
        <h3 className="font-bold text-slate-700 text-sm tracking-wide">{title}</h3>
      </div>
      {action && <div>{action}</div>}
    </div>
    
    <div className="flex-1 p-5 relative flex flex-col min-h-0">
      {children}
      {isDraggable && <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none"><span className="bg-slate-900/10 text-slate-600 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">Drag to Move</span></div>}
      {isDraggable && <div className="absolute inset-0 z-10" />}
    </div>
  </div>
);

const KpiCard = ({ title, main, sub, trend, trendUp, onDetail }: any) => (
  <div className="bg-white rounded-xl shadow-soft border border-slate-100 p-4 flex flex-col justify-center h-24 min-w-[160px] relative group transition-all duration-300 hover:shadow-md">
    <div className="flex justify-between items-start mb-1">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
      {onDetail && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDetail(); }}
          className="text-slate-300 hover:text-sky-500 hover:bg-sky-50 rounded p-0.5 transition-all opacity-100 lg:opacity-0 group-hover:opacity-100"
          title="View Details"
        >
          <Maximize2 size={12} />
        </button>
      )}
    </div>
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xl font-bold text-slate-800 font-mono tracking-tight">{main}</span>
    </div>
    <div className="flex items-center gap-2 mt-1">
      {trend && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${trendUp ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
          {trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {trend}
        </span>
      )}
      <span className="text-[10px] text-slate-400 font-medium truncate">{sub}</span>
    </div>
  </div>
);

const HealthDrawer = ({
  score,
  status,
  riskConfig,
  onClose,
}: {
  score: number;
  status: 'Excellent' | 'Good' | 'At Risk';
  riskConfig: RiskConfig;
  onClose: () => void;
}) => {
  const statusColor =
    status === 'Excellent'
      ? 'text-emerald-500 bg-emerald-50'
      : status === 'Good'
      ? 'text-amber-500 bg-amber-50'
      : 'text-red-500 bg-rose-50';

  const rows = [
    {
      label: 'Risk Rules',
      items: [
        {
          name: 'Daily drawdown limit',
          value: riskConfig.dailyDDIsPct
            ? `-${riskConfig.dailyDDLimit}%`
            : `-$${riskConfig.dailyDDLimit.toLocaleString()}`,
        },
        {
          name: 'Total drawdown limit',
          value: riskConfig.totalDDIsPct
            ? `-${riskConfig.totalDDLimit}%`
            : `-$${riskConfig.totalDDLimit.toLocaleString()}`,
        },
      ],
    },
    {
      label: 'Drawdown',
      items: [
        { name: 'Max drawdown (simulated)', value: '-$1,240' },
        { name: 'Violations (period)', value: '0' },
      ],
    },
    {
      label: 'Discipline',
      items: [
        {
          name: 'Max trades per day',
          value: String(riskConfig.maxTradesPerDay),
        },
        {
          name: 'Min trades per day',
          value: String(riskConfig.minTradesPerDay),
        },
        {
          name: 'Max trades after target',
          value: String(riskConfig.maxTradesAfterTarget),
        },
      ],
    },
    {
      label: 'Slippage',
      items: [
        { name: 'Entry slippage (avg)', value: '0.4 ticks' },
        { name: 'Exit slippage (avg)', value: '0.1 ticks' },
        { name: 'Worst slippage (simulated)', value: '4.2%' },
      ],
    },
  ];

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity animate-in fade-in"
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-slate-100 flex justify-between items-start shrink-0">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Strategy Health Monitor
            </p>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl font-mono font-bold text-slate-800">
                {score}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusColor}`}
              >
                {status}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 max-w-xs">
              Combined view of configured risk rules, drawdown profile,
              discipline limits and execution quality for the current strategy.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {rows.map((section) => (
            <div key={section.label} className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                {section.label}
              </p>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 space-y-1.5">
                {section.items.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-[11px] text-slate-600"
                  >
                    <span className="truncate">{item.name}</span>
                    <span className="font-mono text-slate-800 ml-3">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

const Select = ({ value, options, onChange, icon: Icon }: any) => (
  <div className="relative group">
    <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
      {Icon && <Icon size={12} className="text-slate-400" />}
    </div>
    <select 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none bg-white pl-8 pr-8 py-1.5 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 hover:border-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer transition-all"
    >
      {options.map((opt: string) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
    <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-slate-400">
      <ChevronDown size={12} />
    </div>
  </div>
);

// --- KPI Details Drawer Component ---

const KpiDrawer = ({ kpi, onClose }: { kpi: string | null, onClose: () => void }) => {
  if (!kpi) return null;

  const renderContent = () => {
    switch (kpi) {
      case 'Total Equity':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[10px] text-slate-400 font-bold uppercase">Initial Equity</div><div className="text-lg font-mono font-bold text-slate-700">$100,000.00</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[10px] text-slate-400 font-bold uppercase">Net P&L</div><div className="text-lg font-mono font-bold text-emerald-600">+$28,245.84</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[10px] text-slate-400 font-bold uppercase">Highest Equity</div><div className="text-lg font-mono font-bold text-slate-700">$130,120.50</div></div>
              <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[10px] text-slate-400 font-bold uppercase">Lowest Equity</div><div className="text-lg font-mono font-bold text-slate-700">$98,450.00</div></div>
            </div>
            
            <div className="h-40 bg-white rounded-xl border border-slate-100 p-2">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={equityData} margin={{ top: 5, right: 5, left: 10, bottom: 0 }}>
                   <defs>
                      <linearGradient id="gradEquity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <Area type="monotone" dataKey="equity" stroke="#0ea5e9" fill="url(#gradEquity)" strokeWidth={2} />
                 </AreaChart>
               </ResponsiveContainer>
            </div>
          </div>
        );
      case 'Net P&L':
        const sortedPnl = [...equityData].sort((a, b) => b.pnl - a.pnl);
        const top3 = sortedPnl.slice(0, 3);
        const worst3 = sortedPnl.slice(-3).reverse();
        return (
           <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
               <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[10px] text-slate-400 font-bold uppercase">Total P&L ($)</div><div className="text-lg font-mono font-bold text-emerald-600">+$4,230.50</div></div>
               <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[10px] text-slate-400 font-bold uppercase">Total P&L (Ticks)</div><div className="text-lg font-mono font-bold text-slate-700">+142</div></div>
               <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[10px] text-slate-400 font-bold uppercase">Avg P&L / Day</div><div className="text-lg font-mono font-bold text-slate-700">+$141.00</div></div>
               <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[10px] text-slate-400 font-bold uppercase">Avg P&L / Trade</div><div className="text-lg font-mono font-bold text-slate-700">+$35.25</div></div>
             </div>
             <div className="h-40 bg-white rounded-xl border border-slate-100 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={equityData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                    <Bar dataKey="pnl">
                      {equityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                    <ReferenceLine y={0} stroke="#cbd5e1" />
                  </BarChart>
                </ResponsiveContainer>
             </div>
             <div className="grid grid-cols-2 gap-6 pt-2 border-t border-slate-100">
                <div>
                   <h4 className="text-[10px] font-bold text-emerald-600 uppercase mb-2">Top 3 Days</h4>
                   <ul className="space-y-1">
                      {top3.map((d, i) => (
                         <li key={i} className="flex justify-between text-xs"><span className="text-slate-500">{d.name}</span><span className="font-mono font-bold text-emerald-600">+${Math.round(d.pnl)}</span></li>
                      ))}
                   </ul>
                </div>
                <div>
                   <h4 className="text-[10px] font-bold text-red-500 uppercase mb-2">Worst 3 Days</h4>
                   <ul className="space-y-1">
                      {worst3.map((d, i) => (
                         <li key={i} className="flex justify-between text-xs"><span className="text-slate-500">{d.name}</span><span className="font-mono font-bold text-red-500">-${Math.abs(Math.round(d.pnl))}</span></li>
                      ))}
                   </ul>
                </div>
             </div>
           </div>
        );
      case 'Max Drawdown':
        return (
          <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
               <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[10px] text-slate-400 font-bold uppercase">Max DD ($)</div><div className="text-lg font-mono font-bold text-red-500">+$1,240.00</div></div>
               <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[10px] text-slate-400 font-bold uppercase">Max DD (%)</div><div className="text-lg font-mono font-bold text-slate-700">1.4%</div></div>
               <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[10px] text-slate-400 font-bold uppercase">DD Duration</div><div className="text-lg font-mono font-bold text-slate-700">4 Days</div></div>
               <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[10px] text-slate-400 font-bold uppercase">Recovery</div><div className="text-lg font-mono font-bold text-emerald-500">Recovered</div></div>
             </div>
             <div className="h-40 bg-white rounded-xl border border-slate-100 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityData} margin={{ top: 5, right: 5, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradDD" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="url(#gradDD)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        );
      case 'Win Rate':
         return (
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                    <div>
                       <div className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Global Win Rate</div>
                       <div className="text-3xl font-mono font-bold text-emerald-700">68.4%</div>
                    </div>
                    <div className="text-right text-xs space-y-1">
                       <div className="text-emerald-700"><strong>82</strong> Wins</div>
                       <div className="text-red-500"><strong>38</strong> Losses</div>
                       <div className="text-slate-500"><strong>5</strong> Breakeven</div>
                    </div>
                 </div>
              </div>
              <div className="space-y-2">
                 <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-400 uppercase">Win Rate by Day</span></div>
                 <div className="h-40 bg-white rounded-xl border border-slate-100 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={dayOfWeekWinRate} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                          <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                             {dayOfWeekWinRate.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.rate > 50 ? '#10b981' : '#cbd5e1'} />
                             ))}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>
           </div>
         );
      case 'Avg R-Multiple':
         return (
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[10px] text-slate-400 font-bold uppercase">Avg R</div><div className="text-lg font-mono font-bold text-slate-700">1.84R</div></div>
                  <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[10px] text-slate-400 font-bold uppercase">Std Dev R</div><div className="text-lg font-mono font-bold text-slate-700">0.92</div></div>
               </div>
               <div className="h-48 bg-white rounded-xl border border-slate-100 p-2">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rDistributionData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                         <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
                         <Tooltip cursor={{fill: 'transparent'}} contentStyle={{fontSize: '12px'}} />
                         <Bar dataKey="count" fill="#94a3b8" radius={[4, 4, 0, 0]}>
                            {rDistributionData.map((e, i) => (
                               <Cell key={i} fill={e.range.includes('-') ? '#fca5a5' : '#86efac'} />
                            ))}
                         </Bar>
                      </BarChart>
                   </ResponsiveContainer>
               </div>
            </div>
         );
      case 'Sharpe Ratio':
         return (
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[10px] text-slate-400 font-bold uppercase">Sharpe</div><div className="text-lg font-mono font-bold text-slate-700">2.14</div></div>
                  <div className="p-3 bg-slate-50 rounded-xl"><div className="text-[10px] text-slate-400 font-bold uppercase">Sortino</div><div className="text-lg font-mono font-bold text-slate-700">3.20</div></div>
               </div>
               <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase">Rolling Sharpe (20 periods)</div>
                  <div className="h-40 bg-white rounded-xl border border-slate-100 p-2">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={rollingSharpeData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                           <Line type="monotone" dataKey="val" stroke="#6366f1" strokeWidth={2} dot={false} />
                           <ReferenceLine y={1} stroke="#cbd5e1" strokeDasharray="3 3" />
                        </LineChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
         );
      default:
        return <div className="p-4 text-slate-400 text-sm">Details not available.</div>;
    }
  };

  return (
    <>
      <div 
         className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity animate-in fade-in"
         onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
         <div className="p-6 border-b border-slate-100 flex justify-between items-start shrink-0">
            <div>
               <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{kpi}</h3>
               <div className="text-2xl font-bold text-slate-800 font-mono">
                  {kpi === 'Total Equity' && "$128,245.84"}
                  {kpi === 'Net P&L' && "$4,230.50"}
                  {kpi === 'Max Drawdown' && "-$1,240.00"}
                  {kpi === 'Win Rate' && "68.4%"}
                  {kpi === 'Avg R-Multiple' && "1.84R"}
                  {kpi === 'Sharpe Ratio' && "2.14"}
               </div>
               <div className="text-xs text-sky-600 font-medium mt-1 bg-sky-50 inline-block px-2 py-0.5 rounded">Nov 01 - Nov 30, 2025</div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
         </div>
         <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">{renderContent()}</div>
      </div>
    </>
  );
};


// --- Main Dashboard Component ---

export const Dashboard: React.FC = () => {
  const [filters, setFilters] = useState({
    date: 'MTD',
    account: 'All Accounts',
    strategy: 'All Strategies',
    preset: 'Default' as Preset,
  });

  const [visible, setVisible] = useState<VisibilityState>(PRESET_CONFIGS.Default.visible);
  const [layout, setLayout] = useState<GridState>(PRESET_CONFIGS.Default.layout);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [equityMode, setEquityMode] = useState<'Equity' | 'Cum P&L'>('Equity');
  const [drawdownView, setDrawdownView] = useState<'Timeline' | 'Calendar'>('Calendar');
  const [behaviorView, setBehaviorView] = useState<'Week' | 'DOTW'>('DOTW');

  // New State for Trade Profile Card
  const [profileMetric, setProfileMetric] = useState<'PnL' | 'Return' | 'R'>('PnL');
  const [profileDimension, setProfileDimension] = useState<'Duration' | 'Size' | 'Hour' | 'Day' | 'Setup' | 'MAE' | 'MFE'>('Duration');
  const [healthDisplayMode, setHealthDisplayMode] = useState<HealthDisplayMode>('card');
  const [isHealthDrawerOpen, setIsHealthDrawerOpen] = useState(false);
  
  const [selectedKpi, setSelectedKpi] = useState<string | null>(null);

  const [riskConfig, setRiskConfig] = useState<RiskConfig>({
    style: 'Intraday',
    dailyDDLimit: 1500,
    dailyDDIsPct: false,
    totalDDLimit: 3000,
    totalDDIsPct: false,
    minTradesPerDay: 1,
    maxTradesPerDay: 5,
    maxTradesAfterTarget: 0,
    dailyTarget: 1000,
    consistencyThreshold: 30
  });

  const healthMetrics = useMemo(() => {
    let score = 94;
    let status: 'Excellent' | 'Good' | 'At Risk' = 'Excellent';
    let color = 'text-emerald-500';

    if (riskConfig.dailyDDLimit < 500) score -= 15;
    if (riskConfig.maxTradesPerDay < 4) score -= 20;

    if (score < 70) {
      status = 'At Risk';
      color = 'text-red-500';
    } else if (score < 85) {
      status = 'Good';
      color = 'text-amber-500';
    }

    return { score, status, color };
  }, [riskConfig.dailyDDLimit, riskConfig.maxTradesPerDay]);

  const behaviorData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
        const base = Math.floor(Math.random() * 4); 
        const spike = Math.random() > 0.8 ? 4 : 0;
        const count = Math.max(0, base + spike);
        return { name: (i + 1).toString(), trades: count, day: i + 1 };
    });
    
    const weeks = [
        { name: 'W1', trades: days.slice(0, 7).reduce((a, b) => a + b.trades, 0) },
        { name: 'W2', trades: days.slice(7, 14).reduce((a, b) => a + b.trades, 0) },
        { name: 'W3', trades: days.slice(14, 21).reduce((a, b) => a + b.trades, 0) },
        { name: 'W4', trades: days.slice(21, 30).reduce((a, b) => a + b.trades, 0) },
    ];

    const dotw = [
        { day: 'Mon', trades: 3, winRate: 64, pf: 1.8, allowed: true, return: 450 },
        { day: 'Tue', trades: 5, winRate: 72, pf: 2.5, allowed: true, return: 820 },
        { day: 'Wed', trades: 6, winRate: 58, pf: 1.1, allowed: true, return: 120 },
        { day: 'Thu', trades: 4, winRate: 60, pf: 1.4, allowed: true, return: 350 },
        { day: 'Fri', trades: 2, winRate: 45, pf: 0.8, allowed: false, return: -150 },
    ];
    
    const mtdTrades = days.reduce((a, b) => a + b.trades, 0);
    const tradingDays = days.filter(d => d.trades > 0).length;
    const overtradingDays = days.filter(d => d.trades > riskConfig.maxTradesPerDay).length;
    const ytdTrades = mtdTrades * 11 + 42; 
    const thisWeekTrades = days.slice(-7).reduce((a, b) => a + b.trades, 0);

    return { days, weeks, dotw, mtdTrades, ytdTrades, thisWeekTrades, overtradingDays, tradingDays };
  }, [riskConfig.maxTradesPerDay]);


  useEffect(() => {
    const preset = PRESET_CONFIGS[filters.preset];
    if (preset) {
      setVisible({ ...preset.visible });
      setLayout([...preset.layout.map(row => [...row])]);
    }
  }, [filters.preset]);

  const scrollToSection = (id: CardId) => {
    const element = document.getElementById(id);
    if (element) {
      if (!visible[id]) toggleVisibility(id);
      setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: CardId) => {
    e.dataTransfer.setData('cardId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnCard = (e: React.DragEvent, targetId: CardId) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('cardId') as CardId;
    if (sourceId === targetId) return;

    let newLayout = layout.map(row => [...row]);
    let sourceRow = -1, sourceCol = -1;
    let targetRow = -1, targetCol = -1;

    newLayout.forEach((row, r) => {
      row.forEach((id, c) => {
        if (id === sourceId) { sourceRow = r; sourceCol = c; }
        if (id === targetId) { targetRow = r; targetCol = c; }
      });
    });

    if (sourceRow === -1 || targetRow === -1) return;
    const targetRowLen = newLayout[targetRow].length;

    if (targetRowLen === 2 && sourceRow !== targetRow) {
       const temp = newLayout[targetRow][targetCol];
       newLayout[targetRow][targetCol] = sourceId;
       newLayout[sourceRow][sourceCol] = temp;
    } else if (targetRowLen === 1 && sourceRow !== targetRow) {
       newLayout[sourceRow].splice(sourceCol, 1);
       if (newLayout[sourceRow].length === 0) {
         newLayout.splice(sourceRow, 1);
         if (sourceRow < targetRow) targetRow--; 
       }
       newLayout[targetRow].push(sourceId);
    } else {
       const temp = newLayout[targetRow][targetCol];
       newLayout[targetRow][targetCol] = sourceId;
       newLayout[sourceRow][sourceCol] = temp;
    }
    setLayout(newLayout);
  };

  const toggleVisibility = (key: string) => {
    setVisible(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderCardContent = (id: CardId) => {
    switch (id) {
      case 'strategyHealth':
        const { score, status, color } = healthMetrics;
        const healthChartData = [
          {
            name: 'Score',
            value: score,
            fill:
              color === 'text-emerald-500'
                ? '#10b981'
                : color === 'text-amber-500'
                ? '#f59e0b'
                : '#ef4444',
          },
          { name: 'Remaining', value: 100 - score, fill: '#f1f5f9' },
        ];

        if (healthDisplayMode === 'pill') {
          return (
            <div
              id={id}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-3 py-1.5 text-[11px] cursor-pointer hover:bg-slate-800 transition-colors"
              onClick={() => setIsHealthDrawerOpen(true)}
            >
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-[11px] font-mono font-bold">
                {score}
              </span>
              <span className="font-medium">
                Health {score} · {status}
              </span>
            </div>
          );
        }

        return (
          <Card
            id={id}
            title="Strategy Health Monitor"
            className="group min-h-0"
            isDraggable={isEditMode}
            onDragStart={handleDragStart}
            onDrop={handleDropOnCard}
            onDragOver={handleDragOver}
          >
            <div className="flex items-center justify-between h-full w-full gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative w-14 h-14 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={healthChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={25}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                        paddingAngle={4}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-sm font-bold text-slate-800 tracking-tighter">
                      {score}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <div className={`text-sm font-semibold leading-tight ${color}`}>
                    {status}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium leading-tight truncate">
                    Based on configured risk & discipline limits.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHealthDrawerOpen(true)}
                className="flex items-center gap-1 text-[11px] font-semibold text-sky-500 hover:text-sky-600 transition-colors whitespace-nowrap"
              >
                View details
                <ChevronRight size={14} />
              </button>
            </div>
          </Card>
        );
      case 'equityCurve':
        return (
          <Card 
            id={id} title="Equity Curve" height="340px"
            action={
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {['Equity', 'Cum P&L'].map(m => (
                  <button key={m} onClick={() => setEquityMode(m as any)} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${equityMode === m ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>{m}</button>
                ))}
              </div>
            }
            isDraggable={isEditMode} onDragStart={handleDragStart} onDrop={handleDropOnCard} onDragOver={handleDragOver}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" hide />
                <YAxis domain={['auto', 'auto']} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(val) => `$${val/1000}k`} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
                <Area type="monotone" dataKey="equity" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        );
      case 'drawdownStats':
        return (
          <Card 
            id={id} title="Drawdown & Consistency" height="340px" 
            isDraggable={isEditMode} onDragStart={handleDragStart} onDrop={handleDropOnCard} onDragOver={handleDragOver}
            action={
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                {['Timeline', 'Calendar'].map(m => (
                  <button key={m} onClick={() => setDrawdownView(m as any)} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${drawdownView === m ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>{m}</button>
                ))}
              </div>
            }
          >
             {drawdownView === 'Timeline' ? (
                <>
                  <div className="flex-1 min-h-0 mb-2 animate-in fade-in"><ResponsiveContainer width="100%" height="100%"><LineChart data={equityData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}><Line type="step" dataKey="drawdown" stroke="#ef4444" strokeWidth={2} dot={false} /><ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" /></LineChart></ResponsiveContainer></div>
                  <div className="h-20 border-t border-slate-50 pt-2 animate-in fade-in slide-in-from-bottom-2 shrink-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={equityData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}><Bar dataKey="pnl">{equityData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />))}</Bar></BarChart></ResponsiveContainer></div>
                </>
             ) : (
                <div className="flex-1 animate-in fade-in flex flex-col pt-0 min-h-0">
                   <div className="grid grid-cols-7 gap-1 mb-2">
                      {['M','T','W','T','F','S','S'].map((d, i) => (<div key={i} className="text-center text-[10px] font-bold text-slate-300">{d}</div>))}
                   </div>
                   <div className="grid grid-cols-7 gap-2 auto-rows-fr h-full pb-1">
                      {equityData.map((day, i) => {
                         const isWin = day.pnl > 0;
                         const isLoss = day.pnl < 0;
                         const isMaxDD = day.isMaxDDPeriod;
                         return (
                            <div key={i} className={`relative group rounded-lg flex flex-col items-center justify-center cursor-help transition-all duration-200 border
                               ${isWin ? 'bg-emerald-50/80 border-emerald-100 text-emerald-600' : isLoss ? 'bg-red-50/80 border-red-100 text-red-500' : 'bg-slate-50 border-slate-100 text-slate-400'}
                               ${isMaxDD ? 'ring-1 ring-red-400 ring-offset-1 border-red-200 z-10' : 'hover:scale-105 hover:shadow-sm hover:z-10'}
                            `}>
                               <span className="text-[9px] font-bold opacity-80">{i + 1}</span>
                               {day.pnl !== 0 && <span className="text-[10px] font-bold tracking-tight">${Math.abs(Math.round(day.pnl))}</span>}
                               <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-36 bg-slate-800 text-white text-[10px] p-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                   <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-300">Day {i+1}</div>
                                   <div className="flex justify-between"><span>P&L:</span><span className={isWin ? 'text-emerald-400' : 'text-red-400'}>${Math.round(day.pnl)}</span></div>
                                   <div className="flex justify-between"><span>DD:</span><span className="text-red-400">${Math.round(day.drawdown)}</span></div>
                                   <div className="flex justify-between"><span>Trades:</span><span>{day.trades}</span></div>
                               </div>
                            </div>
                         );
                      })}
                   </div>
                   <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-100 border border-emerald-200"></div>Win</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-100 border border-red-200"></div>Loss</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded border border-red-400"></div>Max DD</div>
                   </div>
                </div>
             )}
          </Card>
        );
      case 'riskRules':
        return (
          <Card id={id} title="Risk & Prop Rules" isDraggable={isEditMode} onDragStart={handleDragStart} onDrop={handleDropOnCard} onDragOver={handleDragOver}>
             <div className="flex gap-4 mb-5 pb-4 border-b border-slate-50">
                <div><span className="text-[10px] text-slate-400 font-bold uppercase">Max DD</span><p className="text-sm font-mono font-bold text-red-500">-$2,450</p></div>
                <div><span className="text-[10px] text-slate-400 font-bold uppercase">Avg DD Time</span><p className="text-sm font-mono font-bold text-slate-700">2.4 Days</p></div>
                <div><span className="text-[10px] text-slate-400 font-bold uppercase">Positive Days</span><p className="text-sm font-mono font-bold text-emerald-500">74%</p></div>
             </div>
             <table className="w-full text-left text-sm">
               <thead><tr className="text-xs text-slate-400 border-b border-slate-100"><th className="font-semibold pb-2 pl-1">Rule</th><th className="font-semibold pb-2 text-right">Value</th><th className="font-semibold pb-2 text-right">Limit</th><th className="font-semibold pb-2 text-right pr-1">Status</th></tr></thead>
               <tbody className="text-slate-700">
                 {[
                    { name: 'Daily Drawdown', val: '-$450', lim: riskConfig.dailyDDIsPct ? `-${riskConfig.dailyDDLimit}%` : `-$${riskConfig.dailyDDLimit.toLocaleString()}`, status: 'OK' }, 
                    { name: 'Max Drawdown', val: '-$1,240', lim: riskConfig.totalDDIsPct ? `-${riskConfig.totalDDLimit}%` : `-$${riskConfig.totalDDLimit.toLocaleString()}`, status: 'OK' }
                  ].map((row, i) => (
                   <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50"><td className="py-3 pl-1 font-medium">{row.name}</td><td className="py-3 text-right font-mono text-xs">{row.val}</td><td className="py-3 text-right font-mono text-xs text-slate-400">{row.lim}</td><td className="py-3 text-right pr-1"><span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">{row.status}</span></td></tr>
                 ))}
               </tbody>
             </table>
             <div className="mt-4 pt-3 border-t border-slate-50 text-xs text-slate-400 flex justify-between"><span>Violations in period: 0</span><span className="text-sky-500 cursor-pointer hover:underline">View Rules</span></div>
          </Card>
        );
      case 'execution':
        return (
           <Card id={id} title="Execution & Slippage" isDraggable={isEditMode} onDragStart={handleDragStart} onDrop={handleDropOnCard} onDragOver={handleDragOver}>
              <div className="grid grid-cols-4 gap-2 mb-2">
                 <div className="bg-slate-50 p-2 rounded-lg text-center"><span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Entry Slip</span><span className="font-mono font-bold text-slate-700 text-xs">0.4t</span></div>
                 <div className="bg-slate-50 p-2 rounded-lg text-center"><span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Exit Slip</span><span className="font-mono font-bold text-slate-700 text-xs">0.1t</span></div>
                 <div className="bg-slate-50 p-2 rounded-lg text-center"><span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">High Slip</span><span className="font-mono font-bold text-slate-700 text-xs">4.2%</span></div>
                 <div className="bg-slate-50 p-2 rounded-lg text-center"><span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Avg Cost</span><span className="font-mono font-bold text-slate-700 text-xs">$3.50</span></div>
              </div>
              <div className="h-28 w-full min-h-0 mt-1">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={slippageData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="ticks" tick={{fontSize: 9, fill: '#94a3b8'}} tickLine={false} axisLine={false} />
                      <YAxis tick={{fontSize: 9, fill: '#94a3b8'}} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ fontSize: '11px', borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} itemStyle={{ color: '#fff' }}/>
                      <Bar dataKey="count" fill="#94a3b8" radius={[2, 2, 0, 0]} barSize={16}>
                        {slippageData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.ticks <= 1 ? '#10b981' : entry.ticks <= 3 ? '#cbd5e1' : '#f87171'} />))}
                      </Bar>
                   </BarChart>
                 </ResponsiveContainer>
              </div>
           </Card>
        );
      case 'behavior':
        const { mtdTrades, ytdTrades, thisWeekTrades, overtradingDays, tradingDays, weeks: weeklyTrades, dotw: dotwTrades } = behaviorData;
        const maxDaily = riskConfig.maxTradesPerDay;
        const minDaily = riskConfig.minTradesPerDay;
        const targetMin = behaviorView === 'Week' ? minDaily * 5 : minDaily;
        const targetMax = behaviorView === 'Week' ? maxDaily * 5 : maxDaily;

        const MiniKPI = ({ label, val, min, max, sub }: any) => (
            <div className="bg-slate-50 p-2 rounded-xl flex flex-col justify-between">
                <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider mb-1">{label}</span>
                <div className="flex items-baseline justify-between">
                    <span className="text-sm font-mono font-bold text-slate-700">{val}</span>
                    {sub && <span className={`text-[9px] font-bold px-1.5 rounded ${sub === 'OK' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{sub}</span>}
                </div>
                {(min !== undefined || max !== undefined) && <span className="text-[9px] text-slate-400 mt-1">Target: {min ?? 0}–{max ?? '∞'}</span>}
            </div>
        );

        const CustomTooltip = ({ active, payload }: any) => {
            if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                    <div className="bg-slate-800 text-white p-2 rounded-lg text-xs shadow-xl border border-slate-700">
                        <div className="font-bold border-b border-slate-600 pb-1 mb-1 text-slate-200">{data.name || data.day}</div>
                        <div className="flex justify-between gap-6 mb-0.5"><span className="text-slate-400">Trades:</span><span className="font-mono font-bold text-white">{data.trades}</span></div>
                    </div>
                );
            }
            return null;
        };

        return (
           <Card 
             id={id} title="Overtrading & Discipline" 
             isDraggable={isEditMode} onDragStart={handleDragStart} onDrop={handleDropOnCard} onDragOver={handleDragOver}
             action={
                 <div className="flex bg-slate-100 rounded-lg p-0.5">
                    {['Week', 'DOTW'].map(v => (
                        <button key={v} onClick={() => setBehaviorView(v as any)} className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${behaviorView === v ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>{v}</button>
                    ))}
                 </div>
             }
           >
             <div className="flex flex-col h-full gap-4">
                <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shrink-0">
                    <span className="text-xs font-medium text-slate-600">Style: <span className="font-bold text-slate-800">{riskConfig.style}</span> ({minDaily}–{maxDaily} trades / day)</span>
                    <button onClick={() => setIsDrawerOpen(true)} className="text-slate-400 hover:text-sky-500 transition-colors"><Edit2 size={12} /></button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
                    <MiniKPI label="YTD Trades" val={ytdTrades} min={200} max={2500} sub={ytdTrades < 2500 ? 'OK' : 'High'} />
                    <MiniKPI label="MTD Trades" val={mtdTrades} min={minDaily * 20} max={maxDaily * 20} />
                    <MiniKPI label="This Week" val={thisWeekTrades} min={minDaily * 5} max={maxDaily * 5} />
                    <div className="bg-slate-50 p-2 rounded-xl flex flex-col justify-between">
                        <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider mb-1">Overtrading (MTD)</span>
                        <div className="flex items-baseline gap-1"><span className={`text-sm font-mono font-bold ${overtradingDays > 0 ? 'text-amber-500' : 'text-slate-700'}`}>{overtradingDays}</span><span className="text-[10px] text-slate-400 font-medium">/ {tradingDays} days</span></div>
                    </div>
                </div>

                <div className="flex-1 mt-2 min-h-0 overflow-hidden relative">
                    {behaviorView === 'Week' ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyTrades} margin={{ top: 5, right: 0, left: -25, bottom: 0 }} barSize={6}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{fontSize: 9, fill: '#94a3b8'}} tickLine={false} axisLine={false} dy={4} />
                                <YAxis tick={{fontSize: 9, fill: '#94a3b8'}} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                                <ReferenceArea y1={targetMin} y2={targetMax} fill="#10b981" fillOpacity={0.08} />
                                <Bar dataKey="trades" radius={[2, 2, 0, 0]}>
                                    {weeklyTrades.map((entry: any, index: number) => {
                                        const isOver = entry.trades > targetMax;
                                        return <Cell key={`cell-${index}`} fill={isOver ? '#fbbf24' : '#cbd5e1'} className={isOver ? 'fill-amber-400' : 'fill-slate-300 hover:fill-slate-400 transition-colors'} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full overflow-y-auto custom-scrollbar pr-1">
                            <table className="w-full text-xs text-left">
                                <thead className="text-[10px] uppercase text-slate-400 font-bold sticky top-0 bg-white">
                                    <tr>
                                        <th className="pb-2 font-bold pl-2">Day</th>
                                        <th className="pb-2 text-center">Tradable</th>
                                        <th className="pb-2 text-right">Cases</th>
                                        <th className="pb-2 text-right">Win Rate</th>
                                        <th className="pb-2 text-right">Return</th>
                                        <th className="pb-2 text-right pr-2">PF</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-700">
                                    {dotwTrades.map((d, i) => (
                                        <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                            <td className="py-2.5 pl-2 font-bold text-slate-500">{d.day}</td>
                                            <td className="py-2.5 text-center"><span className={`px-2 py-0.5 rounded text-[9px] font-bold ${d.allowed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{d.allowed ? 'Allowed' : 'Not Allowed'}</span></td>
                                            <td className="py-2.5 text-right font-mono">{Math.round(d.trades)}</td>
                                            <td className="py-2.5 text-right font-mono">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span>{d.winRate}%</span>
                                                    <div className="w-6 h-1 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${d.winRate}%` }}></div></div>
                                                </div>
                                            </td>
                                            <td className={`py-2.5 text-right font-mono font-bold ${d.return >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>${d.return}</td>
                                            <td className="py-2.5 text-right pr-2 font-mono text-slate-500">{d.pf}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
             </div>
           </Card>
        );
      case 'tradeProfile':
         const chartData = useMemo(() => {
            if (['Duration', 'Size', 'MAE', 'MFE'].includes(profileDimension)) {
                return detailedTradeData.map(t => ({
                    x: t[profileDimension.toLowerCase() as keyof typeof t],
                    y: profileMetric === 'PnL' ? t.pnl : profileMetric === 'Return' ? t.returnAmt : t.r,
                    z: 1
                }));
            } else {
                const agg = detailedTradeData.reduce((acc, curr) => {
                    const key = curr[profileDimension.toLowerCase() as keyof typeof curr];
                    if (!acc[key]) acc[key] = { name: key, value: 0, count: 0 };
                    acc[key].value += profileMetric === 'PnL' ? curr.pnl : profileMetric === 'Return' ? curr.returnAmt : curr.r;
                    acc[key].count += 1;
                    return acc;
                }, {} as any);
                let arr = Object.values(agg);
                if (profileDimension === 'Hour') arr.sort((a: any, b: any) => a.name - b.name);
                if (profileDimension === 'Day') {
                    const order = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5 };
                    arr.sort((a: any, b: any) => (order[a.name as keyof typeof order] || 0) - (order[b.name as keyof typeof order] || 0));
                }
                return arr;
            }
         }, [profileDimension, profileMetric]);

         const isScatter = ['Duration', 'Size', 'MAE', 'MFE'].includes(profileDimension);

         return (
             <Card 
                id={id} title="Trade Profile" 
                isDraggable={isEditMode} onDragStart={handleDragStart} onDrop={handleDropOnCard} onDragOver={handleDragOver}
             >
                 <div className="flex h-full gap-4 -ml-2">
                    <div className="w-28 flex flex-col gap-1 pr-2 border-r border-slate-50 py-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Dimensions</span>
                        {['Duration', 'Size', 'Hour', 'Day', 'Setup', 'MAE', 'MFE'].map((dim) => (
                            <button key={dim} onClick={() => setProfileDimension(dim as any)} className={`text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${profileDimension === dim ? 'bg-sky-50 text-sky-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>{dim}</button>
                        ))}
                    </div>

                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="flex justify-end mb-2">
                            <div className="flex bg-slate-50 p-0.5 rounded-lg">
                                {['PnL', 'Return', 'R'].map(m => (
                                    <button key={m} onClick={() => setProfileMetric(m as any)} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${profileMetric === m ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>{m}</button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                {isScatter ? (
                                    <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis type="number" dataKey="x" name={profileDimension} unit={profileDimension === 'Duration' ? 'm' : ''} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={5} />
                                        <YAxis type="number" dataKey="y" name={profileMetric} unit={profileMetric === 'PnL' ? '$' : ''} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{fontSize: '11px', borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff'}} />
                                        <Scatter name="Trades" data={chartData} fill="#0ea5e9">
                                            {chartData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.y > 0 ? '#10b981' : '#ef4444'} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                ) : (
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }} barSize={24}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={5} />
                                        <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} contentStyle={{fontSize: '11px', borderRadius: '8px', border: 'none', backgroundColor: '#1e293b', color: '#fff'}} />
                                        <ReferenceLine y={0} stroke="#cbd5e1" />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {chartData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#10b981' : '#ef4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                 </div>
             </Card>
         );
      case 'breakdown':
         return (
             <Card id={id} title="Performance Breakdown" isDraggable={isEditMode} onDragStart={handleDragStart} onDrop={handleDropOnCard} onDragOver={handleDragOver}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-xs text-slate-400 border-b border-slate-100">
                                <th className="font-semibold pb-2 pl-1">Symbol</th>
                                <th className="font-semibold pb-2 text-right">Trades</th>
                                <th className="font-semibold pb-2 text-right">PnL</th>
                                <th className="font-semibold pb-2 text-right">Win%</th>
                                <th className="font-semibold pb-2 text-right">Sharpe</th>
                                <th className="font-semibold pb-2 text-right pr-1">DD</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-700">
                            {instrumentData.map((inst, i) => (
                                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                    <td className="py-3 pl-1 font-bold text-slate-600">{inst.symbol}</td>
                                    <td className="py-3 text-right font-mono text-xs">{inst.trades}</td>
                                    <td className={`py-3 text-right font-mono text-xs font-bold ${inst.pnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>${inst.pnl.toLocaleString()}</td>
                                    <td className="py-3 text-right font-mono text-xs">{inst.winRate}%</td>
                                    <td className="py-3 text-right font-mono text-xs">{inst.sharpe}</td>
                                    <td className="py-3 text-right font-mono text-xs text-red-500 pr-1">${Math.abs(inst.dd)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </Card>
         );
      case 'backtests':
        return (
            <Card id={id} title="Recent Backtests" isDraggable={isEditMode} onDragStart={handleDragStart} onDrop={handleDropOnCard} onDragOver={handleDragOver}>
                 <div className="space-y-3">
                     {backtestData.map((bt) => (
                         <div key={bt.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-sky-200 transition-colors cursor-pointer group">
                             <div>
                                 <div className="font-bold text-slate-700 text-sm group-hover:text-sky-600 transition-colors">{bt.name}</div>
                                 <div className="text-[10px] text-slate-400 font-medium">{bt.date}</div>
                             </div>
                             <div className="text-right">
                                 <div className={`font-mono text-sm font-bold ${bt.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{bt.profit >= 0 ? '+' : ''}${bt.profit}</div>
                                 <div className="text-[10px] text-slate-500">Win {bt.win}%</div>
                             </div>
                         </div>
                     ))}
                 </div>
                 <button className="w-full mt-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors border border-dashed border-slate-200">View All History</button>
            </Card>
        );
      case 'logs':
        return (
            <Card id={id} title="System Logs" isDraggable={isEditMode} onDragStart={handleDragStart} onDrop={handleDropOnCard} onDragOver={handleDragOver}>
                 <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] space-y-1.5 p-1">
                     {systemLogs.map((log, i) => (
                         <div key={i} className="flex gap-2 text-slate-600">
                             <span className="text-slate-400 select-none">{log.time}</span>
                             <span className={`font-bold ${log.type === 'WARN' ? 'text-amber-500' : log.type === 'ERROR' ? 'text-red-500' : 'text-sky-500'}`}>[{log.type}]</span>
                             <span className="text-slate-700">{log.msg}</span>
                         </div>
                     ))}
                 </div>
            </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full animate-in fade-in duration-500">
      <KpiDrawer kpi={selectedKpi} onClose={() => setSelectedKpi(null)} />

      {isHealthDrawerOpen && (
        <HealthDrawer
          score={healthMetrics.score}
          status={healthMetrics.status}
          riskConfig={riskConfig}
          onClose={() => setIsHealthDrawerOpen(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 shrink-0">
        <KpiCard
          title="Total Equity"
          main="$128,245.84"
          sub="+2.4% vs last month"
          trend="+28%"
          trendUp
          onDetail={() => setSelectedKpi('Total Equity')}
        />
        <KpiCard
          title="Net P&L (MTD)"
          main="+$4,230.50"
          sub="142 trades executed"
          trend="+12%"
          trendUp
          onDetail={() => setSelectedKpi('Net P&L')}
        />
        <KpiCard
          title="Sharpe Ratio"
          main="2.14"
          sub="Top 5% percentile"
          trend="+0.2"
          trendUp
          onDetail={() => setSelectedKpi('Sharpe Ratio')}
        />
        <KpiCard
          title="Win Rate"
          main="68.4%"
          sub="Avg R: 1.84"
          trend="-2.1%"
          trendUp={false}
          onDetail={() => setSelectedKpi('Win Rate')}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 p-1">
        <div className="flex flex-wrap items-center gap-4 mb-2">
          <Select
            value={filters.date}
            options={['Today', 'Yesterday', 'WTD', 'MTD', 'YTD']}
            onChange={(v: string) => setFilters((prev) => ({ ...prev, date: v }))}
          />
          <Select
            value={filters.account}
            options={['All Accounts', 'Personal', 'Fund A', 'Fund B']}
            onChange={(v: string) => setFilters((prev) => ({ ...prev, account: v }))}
          />
          <Select
            value={filters.strategy}
            options={['All Strategies', 'Mean Rev Gamma', 'Trend Alpha', 'Breakout X']}
            onChange={(v: string) => setFilters((prev) => ({ ...prev, strategy: v }))}
          />
          {healthDisplayMode === 'pill' && visible.strategyHealth && (
            <div className="h-6 w-px bg-slate-200" />
          )}
          {healthDisplayMode === 'pill' && visible.strategyHealth && renderCardContent('strategyHealth')}
          <div className="h-4 w-px bg-slate-200" />
          <Select
            value={filters.preset}
            options={['Default', 'Intraday', 'Swing', 'Prop', 'Minimal']}
            onChange={(v: string) =>
              setFilters((prev) => ({ ...prev, preset: v as Preset }))
            }
          />
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Health:</span>
            <button
              type="button"
              onClick={() =>
                setHealthDisplayMode((prev) => (prev === 'card' ? 'pill' : 'card'))
              }
              className="px-2 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-medium"
            >
              {healthDisplayMode === 'card' ? 'Compact pill' : 'Full card'}
            </button>
          </div>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`ml-auto px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2
                  ${
                    isEditMode
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                  }`}
          >
            {isEditMode ? (
              <>
                <X size={14} /> Done
              </>
            ) : (
              <>
                <Edit2 size={14} /> Customize Layout
              </>
            )}
          </button>
        </div>

        <div className="space-y-6 pb-8">
          {layout.map((row, rowIndex) => {
            const enabledCards = row.filter((cardId) => visible[cardId]);
            if (!enabledCards.length) return null;

            const isHealthRow =
              enabledCards.includes('strategyHealth') &&
              enabledCards.includes('equityCurve');

            return (
              <div
                key={rowIndex}
                className={`grid gap-6 ${
                  isHealthRow
                    ? 'grid-cols-12'
                    : enabledCards.length === 1
                    ? 'grid-cols-1'
                    : enabledCards.length === 2
                    ? 'grid-cols-1 lg:grid-cols-2'
                    : 'grid-cols-1 lg:grid-cols-3'
                }`}
              >
                {enabledCards.map((cardId) => {
                  if (cardId === 'strategyHealth' && healthDisplayMode === 'pill') {
                    return null;
                  }

                  const content = renderCardContent(cardId);

                  if (isHealthRow) {
                    if (cardId === 'strategyHealth') {
                      return (
                        <div
                          key={cardId}
                          className="col-span-12 lg:col-span-3 xl:col-span-3"
                        >
                          {content}
                        </div>
                      );
                    }
                    if (cardId === 'equityCurve') {
                      return (
                        <div
                          key={cardId}
                          className="col-span-12 lg:col-span-9 xl:col-span-9"
                        >
                          {content}
                        </div>
                      );
                    }
                  }

                  return (
                    <div key={cardId} className="col-span-12">
                      {content}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
