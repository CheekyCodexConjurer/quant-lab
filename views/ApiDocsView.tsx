import React, { useEffect, useState } from 'react';
import { MainContent } from '../components/layout/MainContent';

const navItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'lean', label: 'Lean Engine (local)' },
  { id: 'code', label: 'Code Layout' },
  { id: 'data', label: 'Data Paths' },
  { id: 'indicator', label: 'Indicator API' },
  { id: 'examples', label: 'Examples' },
];

export const ApiDocsView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('overview');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: '-40% 0px -50% 0px',
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
      }
    );

    navItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleNavClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <MainContent className="bg-white border border-slate-200 p-8 shadow-sm min-h-[600px] h-auto min-h-full">
      <div className="border-b border-slate-100 pb-3 mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-slate-900 mb-2">API Documentation</h1>
          <p className="text-slate-500">Reference for building custom chart indicators and strategies.</p>
        </div>
        <nav className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`px-2.5 py-1 border-b-2 uppercase tracking-widest transition-colors ${activeSection === item.id
                ? 'border-slate-300 text-slate-900 bg-slate-50'
                : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50/50'
                }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-5 pb-10">
        {/* Overview */}
        <section id="overview" className="bg-white border border-slate-200 rounded p-5 shadow-sm">
          <h3 className="text-lg font-medium text-slate-900 mb-3">Overview</h3>
          <p className="text-sm text-slate-600 leading-relaxed mb-2">
            How to run Lean locally, where to place indicator/strategy code, how data is stored, and how the indicator entry point and libraries work.
          </p>
          <p className="text-sm text-slate-600">Prerequisites: Python 3.x, Lean CLI installed ('lean' in PATH), .NET runtime for Lean CLI.</p>
        </section>

        {/* Lean Engine */}
        <section id="lean" className="bg-white border border-slate-200 rounded p-5 shadow-sm">
          <h3 className="text-lg font-medium text-slate-900 mb-3">QuantConnect Lean (local)</h3>
          <div className="space-y-4 text-sm text-slate-700">
            <div className="flex flex-wrap gap-3 items-center text-xs">
              <a className="text-slate-800 underline" href="https://github.com/QuantConnect/Lean" target="_blank" rel="noreferrer">
                GitHub: QuantConnect/Lean
              </a>
              <a className="text-slate-800 underline" href="https://www.lean.io/docs/v2/lean-cli" target="_blank" rel="noreferrer">
                Docs: Lean CLI
              </a>
              <a className="text-slate-800 underline" href="https://www.lean.io/docs/v2/lean-cli/tutorials/getting-started" target="_blank" rel="noreferrer">
                Tutorial: Getting Started
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[13px]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Workspace root</span>
                <span className="font-mono bg-slate-50 px-2 py-1 border border-slate-200 rounded">lean_workspace/</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Algorithm</span>
                <span className="font-mono bg-slate-50 px-2 py-1 border border-slate-200 rounded">lean_workspace/algorithms/Algorithm.py</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Data export target</span>
                <span className="font-mono bg-slate-50 px-2 py-1 border border-slate-200 rounded">lean_workspace/data/</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Backtest results</span>
                <span className="font-mono bg-slate-50 px-2 py-1 border border-slate-200 rounded">lean_workspace/results/&lt;jobId&gt;/</span>
              </div>
            </div>

            <div>
              <p className="font-semibold text-slate-800 mb-2">CLI quick start</p>
              <div className="bg-slate-100 rounded border border-slate-200 p-3 text-slate-800 font-mono text-[13px] whitespace-pre-wrap">
                {`# install lean cli (requires dotnet/python)
lean --version
# backtest using current workspace + Algorithm.py
lean backtest --config lean_workspace/results/<jobId>/config.json`}
              </div>
            </div>
          </div>
        </section>

        {/* Code Layout */}
        <section id="code" className="bg-white border border-slate-200 rounded p-5 shadow-sm">
          <h3 className="text-lg font-medium text-slate-900 mb-3">Local Code Locations</h3>
          <p className="text-sm text-slate-600 mb-3">Use these folders as the root for editing indicator and strategy code.</p>
          <div className="flex flex-wrap gap-3 text-sm text-slate-700">
            <span className="font-semibold text-slate-800">Indicators:</span>
            <span className="font-mono text-[13px] bg-slate-50 px-2 py-1 border border-slate-200 rounded">indicators/</span>
            <span className="font-semibold text-slate-800 ml-2">Strategies:</span>
            <span className="font-mono text-[13px] bg-slate-50 px-2 py-1 border border-slate-200 rounded">strategies/</span>
          </div>
        </section>

        {/* Data Paths */}
        <section id="data" className="bg-white border border-slate-200 rounded p-5 shadow-sm">
          <h3 className="text-lg font-medium text-slate-900 mb-3">Local Data Paths (Dukascopy)</h3>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Ticks (raw):</span>
                <span className="font-mono text-[13px] bg-slate-50 px-2 py-1 border border-slate-200 rounded">server/data/raw/&lt;asset&gt;-ticks.json</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Candles:</span>
                <span className="font-mono text-[13px] bg-slate-50 px-2 py-1 border border-slate-200 rounded">server/data/&lt;asset&gt;-&lt;timeframe&gt;.json</span>
                <span className="text-slate-500 text-xs">(m1, m5, m15, m30, h1, h4, d1, mn1)</span>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Imports are chunked and persisted per chunk (with safe swap) to allow resuming: if interrupted, use "Continue" and it will download only the missing span, rewriting the last chunk for integrity.
            </p>
          </div>
        </section>

        {/* Indicator API */}
        <section id="indicator" className="space-y-4">
          <div className="bg-white border border-slate-200 rounded p-5 shadow-sm">
            <h3 className="text-lg font-medium text-slate-900 mb-3">Indicator Structure</h3>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Custom indicators are Python functions with a fixed entry point. The engine passes a dictionary of NumPy arrays representing market data.
            </p>
            <div className="bg-slate-100 border border-slate-200 rounded p-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Entry Point</h4>
              <code className="block font-mono text-sm text-slate-800 whitespace-pre-wrap">
                {`def calculate(inputs):
    """
    Main entry point for indicator calculation.
    """
    # inputs['close'] = np.array([...])
    # inputs['open'] = np.array([...])
    # inputs['high'] = np.array([...])
    # inputs['low'] = np.array([...])

    return result_array`}
              </code>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-5 shadow-sm">
            <h3 className="text-lg font-medium text-slate-900 mb-3">Available Libraries</h3>
            <div className="flex flex-wrap gap-2">
              {['numpy (np)', 'pandas (pd)', 'talib', 'math'].map((lib) => (
                <span
                  key={lib}
                  className="inline-flex items-center gap-1 px-2 py-1 border border-slate-200 rounded-full text-[12px] text-slate-700 bg-white"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="font-mono">{lib}</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Examples */}
        <section id="examples" className="bg-white border border-slate-200 rounded p-5 shadow-sm">
          <h3 className="text-lg font-medium text-slate-900 mb-2">Example: Simple Moving Average</h3>
          <div className="bg-slate-100 rounded border border-slate-200 p-4 overflow-x-auto">
            <code className="block font-mono text-sm text-slate-800 whitespace-pre-wrap">
              {`import numpy as np

def calculate(inputs):
    data = inputs['close']
    window_size = 20

    weights = np.repeat(1.0, window_size) / window_size
    smas = np.convolve(data, weights, 'valid')

    # Pad beginning to match length
    padding = np.full(window_size - 1, np.nan)
    return np.concatenate((padding, smas))`}
            </code>
          </div>
        </section>
      </div>
    </MainContent>
  );
};
