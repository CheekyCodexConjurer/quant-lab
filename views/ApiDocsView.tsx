import React from 'react';

export const ApiDocsView: React.FC = () => (
  <div className="max-w-4xl mx-auto bg-white border border-slate-200 p-10 shadow-sm min-h-[600px]">
    <div className="border-b border-slate-100 pb-6 mb-8">
      <h1 className="text-3xl font-light text-slate-900 mb-2">API Documentation</h1>
      <p className="text-slate-500">Reference for building Custom Chart Indicators and Strategies.</p>
    </div>

    <div className="prose prose-slate max-w-none">
      <h3 className="text-lg font-medium text-slate-900 mb-4">Indicator Structure</h3>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed">
        Custom indicators must be written in Python and expose a specific entry point function. The engine passes a dictionary of NumPy arrays representing the market data.
      </p>

      <div className="bg-slate-50 border border-slate-200 rounded p-6 mb-8">
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

      <h3 className="text-lg font-medium text-slate-900 mb-4">Available Libraries</h3>
      <ul className="grid grid-cols-2 gap-4 mb-8">
        {['numpy (np)', 'pandas (pd)', 'talib', 'math'].map((lib) => (
          <li key={lib} className="flex items-center gap-2 p-3 border border-slate-200 rounded-sm">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <span className="text-sm font-mono text-slate-700">{lib}</span>
          </li>
        ))}
      </ul>

      <h3 className="text-lg font-medium text-slate-900 mb-4">Example: Simple Moving Average</h3>
      <div className="bg-slate-900 rounded p-6 overflow-x-auto">
        <code className="block font-mono text-sm text-slate-300 whitespace-pre-wrap">
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
    </div>
  </div>
);
