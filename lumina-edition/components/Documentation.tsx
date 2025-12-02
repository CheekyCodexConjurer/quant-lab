import React, { useState } from 'react';
import { BookOpen, Code, Terminal, ChevronRight, Copy, Layers, Cpu, Server } from 'lucide-react';

const DocSection = ({ title, children, active, onClick }: { title: string, children?: React.ReactNode, active?: boolean, onClick: () => void }) => (
    <button 
        onClick={onClick}
        className={`w-full text-left p-4 rounded-xl cursor-pointer transition-all duration-300 group ${active ? 'bg-sky-50 text-sky-900 shadow-sm' : 'hover:bg-slate-50 text-slate-600'}`}
    >
        <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm">{title}</span>
            {active && <ChevronRight size={14} className="text-sky-500 animate-in fade-in slide-in-from-left-1" />}
        </div>
        {children && <div className="text-xs opacity-70">{children}</div>}
    </button>
);

const CodeBlock = ({ code, language = 'python' }: { code: string, language?: string }) => (
    <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg my-4 group relative">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-white/5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language}</span>
            <button className="text-slate-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100 duration-300">
                <Copy size={14} />
            </button>
        </div>
        <pre className="p-4 overflow-x-auto text-sm font-mono text-slate-300 leading-relaxed custom-scrollbar">
            {code}
        </pre>
    </div>
);

export const Documentation: React.FC = () => {
    const [activeSection, setActiveSection] = useState('indicator-api');

    const renderContent = () => {
        switch (activeSection) {
            case 'overview':
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h1 className="text-4xl font-bold text-slate-800 mb-6">Overview</h1>
                        <p className="text-lg text-slate-500 leading-relaxed mb-8">
                            The Lab is a next-generation quantitative backtesting and research platform designed for modern algorithmic traders.
                            It bridges the gap between local Python research and high-performance cloud execution.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center text-sky-500 shadow-sm mb-4">
                                    <Terminal size={24} />
                                </div>
                                <h3 className="font-bold text-slate-800 mb-2">Local Execution</h3>
                                <p className="text-sm text-slate-500">Run indicators and strategies on your machine using your local Python environment.</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center text-emerald-500 shadow-sm mb-4">
                                    <Server size={24} />
                                </div>
                                <h3 className="font-bold text-slate-800 mb-2">Cloud Scale</h3>
                                <p className="text-sm text-slate-500">Deploy validated strategies to the cloud for optimization across terabytes of tick data.</p>
                            </div>
                        </div>
                    </div>
                );
            case 'architecture':
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h1 className="text-4xl font-bold text-slate-800 mb-6">System Architecture</h1>
                        <p className="text-slate-600 mb-6">
                            The Lab uses a hybrid architecture. The frontend (React) communicates with a local Node.js bridge, which in turn orchestrates Python child processes for calculation.
                        </p>
                        <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden mb-8 shadow-xl">
                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-center">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-blue-500/20 rounded-2xl border border-blue-400/30 flex items-center justify-center mx-auto mb-3">
                                        <Layers size={32} className="text-blue-400"/>
                                    </div>
                                    <span className="font-bold text-sm">React UI</span>
                                </div>
                                <div className="h-0.5 w-16 bg-slate-700 hidden md:block"></div>
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-purple-500/20 rounded-2xl border border-purple-400/30 flex items-center justify-center mx-auto mb-3">
                                        <Cpu size={32} className="text-purple-400"/>
                                    </div>
                                    <span className="font-bold text-sm">Electron/Node</span>
                                </div>
                                <div className="h-0.5 w-16 bg-slate-700 hidden md:block"></div>
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-yellow-500/20 rounded-2xl border border-yellow-400/30 flex items-center justify-center mx-auto mb-3">
                                        <Code size={32} className="text-yellow-400"/>
                                    </div>
                                    <span className="font-bold text-sm">Python Engine</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'indicator-api':
                return (
                     <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h1 className="text-4xl font-bold text-slate-800 mb-6">Indicator API</h1>
                        <p className="text-lg text-slate-500 leading-relaxed mb-8">
                            The Indicator API allows you to build custom overlays and studies for The Lab using standard Python. 
                            Scripts are executed locally by the Indicator Execution Engine.
                        </p>

                        <hr className="border-slate-100 mb-8" />

                        <h2 className="text-2xl font-bold text-slate-800 mb-4">Entry Point</h2>
                        <p className="text-slate-600 mb-4">
                            Every indicator must define a <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-bold text-slate-700">calculate(inputs)</code> function.
                            This function receives a dictionary of NumPy arrays containing OHLCV data.
                        </p>

                        <CodeBlock code={`def calculate(inputs, settings=None):
    """
    Main entry point.
    :param inputs: dict containing 'open', 'high', 'low', 'close', 'volume' as numpy arrays
    :param settings: optional dict containing UI configuration values
    """
    
    # Access close prices
    closes = inputs['close']
    
    # Simple Moving Average Example
    import pandas as pd
    series = pd.Series(closes)
    sma = series.rolling(window=20).mean()
    
    return {
        "series": {
            "main": sma.to_list()
        },
        "markers": [],
        "levels": []
    }`} />
                    </div>
                );
            case 'market-structure':
                return (
                     <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h1 className="text-4xl font-bold text-slate-800 mb-6">Market Structure</h1>
                        <p className="text-slate-600 mb-6">
                            The <code className="text-sm font-bold bg-slate-100 px-1 rounded">market_structure</code> library provides utility functions for identifying pivots, swings, and liquidity levels.
                        </p>
                        <CodeBlock code={`from market_structure import pivots

# Find high/low pivots
highs_lows = pivots.find_swings(high, low, length=5)

# Identify order blocks
obs = pivots.find_order_blocks(open, high, low, close)`} />
                    </div>
                );
            default:
                return <div>Select a section</div>;
        }
    };

    return (
        <div className="h-full flex gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Sidebar */}
            <div className="w-64 bg-white rounded-[2rem] shadow-soft p-6 hidden lg:flex flex-col">
                <div className="flex items-center gap-2 mb-6 px-2 text-slate-800">
                    <BookOpen size={20} className="text-sky-500" />
                    <h3 className="font-bold text-lg">Docs Explorer</h3>
                </div>
                
                <div className="space-y-1">
                    <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2">Core Concepts</p>
                    <DocSection title="Overview" active={activeSection === 'overview'} onClick={() => setActiveSection('overview')}>Intro</DocSection>
                    <DocSection title="Architecture" active={activeSection === 'architecture'} onClick={() => setActiveSection('architecture')}>System Design</DocSection>

                    <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6">References</p>
                    <DocSection title="Indicator API" active={activeSection === 'indicator-api'} onClick={() => setActiveSection('indicator-api')}>Python Engine</DocSection>
                    <DocSection title="Market Structure" active={activeSection === 'market-structure'} onClick={() => setActiveSection('market-structure')}>Lib Ref</DocSection>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-white rounded-[2rem] shadow-soft p-8 md:p-12 overflow-y-auto custom-scrollbar">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-bold uppercase tracking-wide">
                            v1.0 Stable
                        </span>
                        <span className="text-slate-400 text-sm">Updated 2 days ago</span>
                    </div>
                    
                    {renderContent()}
                    
                </div>
            </div>
        </div>
    );
};