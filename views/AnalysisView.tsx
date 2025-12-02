import React from 'react';
import { Code, Settings } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import { StatsCard } from '../components/StatsCard';
import { BacktestResult } from '../types';

type AnalysisViewProps = {
  backtestResult: BacktestResult | null;
  activeSymbol: string;
  onRunBacktest: () => void;
};

export const AnalysisView: React.FC<AnalysisViewProps> = ({ backtestResult, activeSymbol, onRunBacktest }) => {
  if (!backtestResult) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2">
            <Code size={24} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No Simulation Results</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            Run the backtest using the current strategy configuration from{' '}
            <span className="font-mono text-xs bg-slate-100 px-1">main.py</span>.
          </p>
          <button
            type="button"
            onClick={onRunBacktest}
            className="mt-2 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-900 underline underline-offset-4 hover:text-slate-600"
          >
            Execute Simulation
          </button>
        </div>
      </div>
    );
  }

  const sourceLabel = backtestResult.source === 'lean' ? 'Lean Engine' : 'Local Simulation';
  const sourceTone =
    backtestResult.source === 'lean'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${sourceTone}`}>{sourceLabel}</span>
          {backtestResult.jobId ? (
            <code className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              Job {backtestResult.jobId}
            </code>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onRunBacktest}
          className="text-xs font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4"
        >
          Run local simulation
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <StatsCard
          label="Net Profit"
          value={`$${backtestResult.totalProfit.toFixed(2)}`}
          subValue="+12.5%"
          trend="up"
        />
        <StatsCard
          label="Win Rate"
          value={`${(backtestResult.winRate * 100).toFixed(1)}%`}
          subValue="+0.8%"
          trend="up"
        />
        <StatsCard
          label="Total Trades"
          value={backtestResult.totalTrades.toString()}
          subValue="+8.2%"
          trend="neutral"
        />
        <StatsCard
          label="Max Drawdown"
          value={`${(backtestResult.drawdown * 100).toFixed(2)}%`}
          subValue="+5.1%"
          trend="down"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[260px]">
        <div className="bg-white p-8 border border-slate-200 rounded-2xl flex flex-col">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
            Equity Curve
          </h3>
          <div className="flex-1 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={backtestResult.equityCurve}>
                <XAxis dataKey="time" hide />
                <YAxis domain={['auto', 'auto']} hide />
                <ReTooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ display: 'none' }}
                />
                <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-[380px]">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Trade Log</h3>
            <Settings size={14} className="text-slate-400 cursor-pointer hover:text-slate-600" />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider font-semibold sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 border-b border-slate-100">Symbol</th>
                  <th className="px-6 py-3 border-b border-slate-100">Time</th>
                  <th className="px-6 py-3 border-b border-slate-100 text-right">Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {backtestResult.trades
                  .slice()
                  .reverse()
                  .map((trade) => (
                    <tr key={trade.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              trade.profit > 0 ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">
                            {activeSymbol}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-500 font-mono">{trade.exitTime}</td>
                      <td className="px-6 py-3 text-right">
                        <span
                          className={`text-xs font-mono font-medium ${
                            trade.profit > 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {trade.profit > 0 ? '+' : ''}
                          {trade.profit.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
