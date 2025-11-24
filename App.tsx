import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutGrid, 
  BarChart2, 
  Settings, 
  Code,
  User,
  ChevronRight,
  RefreshCw,
  Github,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Terminal,
  FolderOpen,
  DownloadCloud,
  Database,
  FileSpreadsheet,
  Upload,
  Globe,
  Sliders,
  Play,
  Layers,
  Calendar,
  BookOpen,
  ToggleLeft,
  ToggleRight,
  Save,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  MoreHorizontal,
  FileCode,
  Pencil,
  X
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import { LightweightChart } from './components/LightweightChart';
import { StatsCard } from './components/StatsCard';
import { Candle, BacktestResult, ViewState, CustomIndicator } from './types';
import { generateData } from './utils/mockData';
import { runBacktest } from './services/backtestEngine';

const AVAILABLE_ASSETS = ['CL1!', 'NG1!', 'GC1!', 'HG1!', 'SI1!', 'ES1!', 'NQ1!', 'ZC1!', 'ZS1!', 'BTC1!', 'ETH1!'];
const AVAILABLE_TIMEFRAMES = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'];

// Tick Size Presets
const TICK_PRESETS: Record<string, number> = {
  'CL1!': 0.01,
  'NG1!': 0.001,
  'GC1!': 0.10,
  'HG1!': 0.0005,
  'SI1!': 0.005,
  'ES1!': 0.25,
  'NQ1!': 0.25,
  'ZC1!': 0.25,
  'ZS1!': 0.25,
  'BTC1!': 5.0,
  'ETH1!': 0.1
};

// Dukascopy Market Structure
type MarketAsset = { label: string; symbol: string; dukaId: string };
const DUKASCOPY_MARKETS: Record<string, MarketAsset[]> = {
  'Energy Commodities': [
    { label: 'Light Crude Oil', symbol: 'CL1!', dukaId: 'lightcmdusd' },
    { label: 'Natural Gas', symbol: 'NG1!', dukaId: 'ngascmdusd' },
  ],
  'Metals Commodities': [
    { label: 'Gold', symbol: 'GC1!', dukaId: 'xauusd' },
    { label: 'Silver', symbol: 'SI1!', dukaId: 'xagusd' },
    { label: 'High Grade Copper', symbol: 'HG1!', dukaId: 'coppercmdusd' },
  ],
  'Stock Indices': [
    { label: 'S&P 500', symbol: 'ES1!', dukaId: 'usa500idx' },
    { label: 'Nasdaq 100', symbol: 'NQ1!', dukaId: 'usatechidx' },
  ],
  'Agricultural': [
    { label: 'Corn', symbol: 'ZC1!', dukaId: 'corncmdusd' },
    { label: 'Soybean', symbol: 'ZS1!', dukaId: 'soybeancmdusd' },
  ],
  'Crypto Assets': [
    { label: 'Bitcoin', symbol: 'BTC1!', dukaId: 'btcusd' },
    { label: 'Ethereum', symbol: 'ETH1!', dukaId: 'ethusd' },
  ]
};

// Simple EMA Calculation Helper (Simulation of the Python code)
const calculateEMA = (data: Candle[], period: number) => {
  if (!data || data.length === 0) return [];
  
  const k = 2 / (period + 1);
  const emaData = [];
  let ema = data[0].close;

  for (let i = 0; i < data.length; i++) {
    const price = data[i].close;
    ema = price * k + ema * (1 - k);
    if (i >= period) {
       emaData.push({ time: data[i].time, value: ema });
    }
  }
  return emaData;
};

const DEFAULT_INDICATOR_CODE = `import talib
import numpy as np

def calculate(inputs):
    """
    Calculate EMA 200 Indicator
    :param inputs: Dictionary containing 'close', 'open', 'high', 'low' arrays
    :return: Array of indicator values
    """
    close_prices = np.array(inputs['close'])
    ema = talib.EMA(close_prices, timeperiod=200)
    
    return ema
`;

const NEW_INDICATOR_TEMPLATE = `import talib
import numpy as np

def calculate(inputs):
    """
    New Indicator Template
    """
    return inputs['close']
`;

// --- HELPER COMPONENTS (Moved to top to prevent ReferenceError) ---

// Date Picker Component
const DatePickerInput = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date()); // For navigation

  useEffect(() => {
    // Attempt to parse existing value to set initial calendar view
    if (value && value.includes('-') && value.length === 10) {
       const [d, m, y] = value.split('-').map(Number);
       if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
         setCurrentDate(new Date(y, m - 1, 1));
       }
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDayClick = (day: number) => {
    const d = day.toString().padStart(2, '0');
    const m = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const y = currentDate.getFullYear();
    onChange(`${d}-${m}-${y}`);
    setIsOpen(false);
  };

  const navMonth = (dir: 1 | -1) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + dir, 1));
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    const days = [];

    // Empty slots
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-6 h-6" />);
    }
    // Days
    for (let i = 1; i <= totalDays; i++) {
      days.push(
        <button 
          key={i} 
          onClick={() => handleDayClick(i)}
          className="w-6 h-6 flex items-center justify-center text-xs rounded-full hover:bg-slate-900 hover:text-white text-slate-700 transition-colors"
        >
          {i}
        </button>
      );
    }

    return (
      <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-sm p-4 z-50 w-56">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <button onClick={() => navMonth(-1)} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft size={14} className="text-slate-500"/></button>
          <span className="text-xs font-bold text-slate-900">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => navMonth(1)} className="p-1 hover:bg-slate-100 rounded"><ChevronRight size={14} className="text-slate-500"/></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['S','M','T','W','T','F','S'].map(d => (
            <span key={d} className="text-[10px] font-bold text-slate-400">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 place-items-center">
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full" ref={containerRef}>
       <div className="relative">
         <input 
            type="text" 
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 text-sm font-mono text-slate-700 outline-none focus:border-slate-400 placeholder:text-slate-400 transition-all"
         />
         <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
       </div>
       {isOpen && renderCalendar()}
    </div>
  );
};

// Sidebar Item Helper
const SidebarItem = ({ icon, label, isActive, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 mb-1
      ${isActive 
        ? 'bg-slate-100 text-slate-900 font-medium' 
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
      }
    `}
  >
    {icon}
    <span className="text-sm tracking-wide whitespace-nowrap">{label}</span>
    {isActive && <ChevronRight size={14} className="ml-auto text-slate-400"/>}
  </button>
);

// --- MAIN APPLICATION ---

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewState>(ViewState.CHART);
  const [data, setData] = useState<Candle[]>([]);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [repoStatus, setRepoStatus] = useState<'disconnected' | 'syncing' | 'synced' | 'error'>('disconnected');
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Selection State
  const [activeSymbol, setActiveSymbol] = useState<string>('CL1!');
  const [activeTimeframe, setActiveTimeframe] = useState<string>('H1');

  // Indicator State
  const [indicators, setIndicators] = useState<CustomIndicator[]>([
    {
       id: '1',
       name: 'EMA 200',
       code: DEFAULT_INDICATOR_CODE,
       isActive: true,
       isVisible: true,
       createdAt: Date.now(),
       updatedAt: Date.now()
    }
  ]);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>('1');
  const [indicatorData, setIndicatorData] = useState<{time: string|number, value: number}[]>([]);

  // Dukascopy Import State
  const [selectedMarket, setSelectedMarket] = useState<string>('Energy Commodities');
  const [startDate, setStartDate] = useState<string>('(Oldest Data)');
  const [endDate, setEndDate] = useState<string>('Present');

  // Normalization State
  const [normTimezone, setNormTimezone] = useState<boolean>(true); // Default UTC-3
  const [normBasis, setNormBasis] = useState<'median' | 'regression'>('median');
  const [normTickSize, setNormTickSize] = useState<number>(0.01);
  const [isCustomTick, setIsCustomTick] = useState<boolean>(false);

  // Load initial data
  useEffect(() => {
    const initialData = generateData(500, activeSymbol, activeTimeframe);
    setData(initialData);
  }, [activeSymbol, activeTimeframe]);

  // Update tick size when symbol changes (if not custom override)
  useEffect(() => {
    if (!isCustomTick) {
      const preset = TICK_PRESETS[activeSymbol];
      if (preset) {
        setNormTickSize(preset);
      }
    }
  }, [activeSymbol, isCustomTick]);

  // Recalculate Indicator when data changes OR active indicator changes
  useEffect(() => {
    const activeInd = indicators.find(i => i.isActive);
    if (data.length > 0 && activeInd) {
      // Simulate code execution - for now, if name contains "EMA", run EMA
      // In a real app this would post the code to a python backend
      const period = activeInd.name.includes('50') ? 50 : 200;
      const ema = calculateEMA(data, period);
      setIndicatorData(ema);
    } else {
      setIndicatorData([]);
    }
  }, [data, indicators]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [syncLogs]);

  const handleRunBacktest = () => {
    const results = runBacktest(data);
    setBacktestResult(results);
    setActiveView(ViewState.ANALYSIS);
  };

  const handleRepoSync = async () => {
    setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] --- SYNC STARTED ---`]);
    setRepoStatus('syncing');
    
    // Simulate steps matching the user's repository structure
    const steps = [
      `Connecting to trader-matthews-lean-lab...`,
      `Located data/normalized/futures/${activeSymbol}/${activeTimeframe}...`,
      `Fetching ${activeSymbol}_${activeTimeframe}.csv...`,
      `Parsing CSV headers (Date, Open, High, Low, Close, Volume)...`,
      `Validating tick alignment... OK`,
      `Resampling from M1 base data to ${activeTimeframe}...`,
      `Loading 500 candles into memory...`
    ];

    for (const step of steps) {
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${step}`]);
      await new Promise(r => setTimeout(r, 800)); // Simulate delay
    }

    const newData = generateData(500, activeSymbol, activeTimeframe);
    setData(newData);

    setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Sync Complete.`]);
    setRepoStatus('synced');
  };

  const handleDukascopyFetch = async () => {
    setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] --- INITIATING DUKASCOPY IMPORT ---`]);
    setRepoStatus('syncing');
    
    const steps = [
      `Initializing Leo4815162342/dukascopy-node...`,
      `Market: ${selectedMarket}`,
      `Target: ${activeSymbol} (Futures Continuous)`,
      `Date Range: ${startDate} to ${endDate}`,
      `Requesting TICK data (BID/ASK)...`,
      `Downloading .bi5 compression stream...`,
      `Decompressing binary data...`,
      `Applying Timezone: UTC-3...`,
      `Normalizing Tick Size to ${normTickSize}...`,
      `Converting to OHLC candles (${activeTimeframe})...`,
    ];

    for (const step of steps) {
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${step}`]);
      await new Promise(r => setTimeout(r, 600));
    }

    // Refresh Data
    const newData = generateData(1000, activeSymbol, activeTimeframe);
    setData(newData);

    setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Import complete. ${newData.length} candles generated.`]);
    setRepoStatus('synced');
  };

  const handleCustomImport = async () => {
     setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Opening file dialog...`]);
     await new Promise(r => setTimeout(r, 1000));
     setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Selected: user_data_export.csv`]);
     setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Parsing columns... OK`]);
     setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Data loaded into Engine.`]);
  };

  // Indicator Management Handlers
  const handleNewIndicator = () => {
    const newInd: CustomIndicator = {
      id: Date.now().toString(),
      name: 'New Indicator',
      code: NEW_INDICATOR_TEMPLATE,
      isActive: false,
      isVisible: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setIndicators(prev => [...prev, newInd]);
    setSelectedIndicatorId(newInd.id);
  };

  const handleDeleteIndicator = (id: string) => {
    setIndicators(prev => prev.filter(i => i.id !== id));
    if (selectedIndicatorId === id) setSelectedIndicatorId(null);
  };

  const handleSaveIndicator = (id: string, newCode: string, newName?: string) => {
    setIndicators(prev => prev.map(ind => {
      if (ind.id === id) {
        return { 
          ...ind, 
          code: newCode, 
          name: newName || ind.name,
          updatedAt: Date.now() 
        };
      }
      return ind;
    }));
  };

  const handleToggleIndicator = (id: string) => {
    // Toggles Active State (Loaded vs Unloaded)
    // For simplicity, enforce radio behavior (only one active at a time for visual clarity in this demo)
    // Or allow multiple. Let's allow toggle.
    setIndicators(prev => prev.map(ind => ({
      ...ind,
      isActive: ind.id === id ? !ind.isActive : ind.isActive
    })));
  };

  const handleToggleVisibility = (id: string) => {
    // Toggles Visible State (Shown vs Hidden on Chart) without unloading
    setIndicators(prev => prev.map(ind => ({
      ...ind,
      isVisible: ind.id === id ? !ind.isVisible : ind.isVisible
    })));
  };

  const handleIndicatorUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedIndicatorId) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleSaveIndicator(selectedIndicatorId, event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const activeIndicator = indicators.find(i => i.id === selectedIndicatorId);

  return (
    <div className="flex h-screen bg-[#fafafa] text-slate-900 font-sans">
      
      {/* Sidebar - Omni Style */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-50">
        <div className="p-8 pb-12">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-slate-900 rounded-sm"></div>
            <span className="font-semibold text-lg tracking-tight text-slate-900">The Lab</span>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-1 overflow-y-auto custom-scrollbar">
          <SidebarItem 
            icon={<LayoutGrid size={18} />} 
            label="Overview" 
            isActive={activeView === ViewState.ANALYSIS} 
            onClick={() => setActiveView(ViewState.ANALYSIS)}
          />
          <SidebarItem 
            icon={<BarChart2 size={18} />} 
            label="Chart" 
            isActive={activeView === ViewState.CHART} 
            onClick={() => setActiveView(ViewState.CHART)}
          />
          <SidebarItem 
            icon={<Code size={18} />} 
            label="Chart Indicator" 
            isActive={activeView === ViewState.CHART_INDICATOR} 
            onClick={() => setActiveView(ViewState.CHART_INDICATOR)}
          />
          <SidebarItem 
            icon={<Code size={18} />} 
            label="Lean Strategy" 
            isActive={activeView === ViewState.STRATEGY} 
            onClick={() => setActiveView(ViewState.STRATEGY)}
          />
          
          <div className="pt-4 mt-4 border-t border-slate-100">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Data</p>
            <SidebarItem 
              icon={<Database size={18} />} 
              label="Data Sources" 
              isActive={activeView === ViewState.DATA} 
              onClick={() => setActiveView(ViewState.DATA)}
            />
            <SidebarItem 
              icon={<Sliders size={18} />} 
              label="Data Normalization" 
              isActive={activeView === ViewState.DATA_NORMALIZATION} 
              onClick={() => setActiveView(ViewState.DATA_NORMALIZATION)}
            />
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">External</p>
            <SidebarItem 
              icon={<BookOpen size={18} />} 
              label="API Docs" 
              isActive={activeView === ViewState.API_DOCS} 
              onClick={() => setActiveView(ViewState.API_DOCS)}
            />
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
              <User size={14} className="text-slate-500"/>
            </div>
            <div className="flex flex-col">
               <span className="text-xs font-semibold text-slate-900">Quant User</span>
               <span className="text-[10px] text-slate-400 font-medium tracking-wide">PRO PLAN</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#fafafa]">
        
        {/* Top Header */}
        <header className="h-20 bg-[#fafafa] flex items-center justify-between px-10 border-b border-transparent z-10">
          <div>
             <h2 className="text-2xl font-normal text-slate-800 tracking-tight">
               {activeView === ViewState.CHART ? 'Market Analysis' : 
                activeView === ViewState.DATA ? 'Data Sources' : 
                activeView === ViewState.DATA_NORMALIZATION ? 'Normalization Rules' :
                activeView === ViewState.STRATEGY ? 'Lean Strategy' : 
                activeView === ViewState.CHART_INDICATOR ? 'Indicator Editor' :
                activeView === ViewState.API_DOCS ? 'API Documentation' :
                'Strategy Performance'}
             </h2>
             <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-400">Context:</span>
                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono">{activeSymbol} / {activeTimeframe}</code>
             </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 text-xs font-medium">
                {repoStatus === 'synced' ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircle2 size={12} /> Data Ready
                    </span>
                ) : repoStatus === 'syncing' ? (
                    <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        <RefreshCw size={12} className="animate-spin" /> Processing...
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                        <Database size={12} /> Local Mode
                    </span>
                )}
             </div>
             
             <div className="h-6 w-px bg-slate-200"></div>

            <button 
              onClick={handleRunBacktest}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold tracking-wide uppercase transition-all shadow-xl shadow-slate-200 active:translate-y-0.5 rounded-sm"
            >
              <Play size={12} fill="currentColor" />
              <span>Run Backtest</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 px-10 py-8 overflow-y-auto">
          
          {activeView === ViewState.CHART && (
            <div className="h-full flex flex-col bg-white border border-slate-200 p-1 shadow-sm relative">
                 {/* Chart Controls Overlay */}
                 <div className="absolute top-4 left-4 z-10 flex gap-2 items-center">
                     
                     {/* Asset Selector */}
                     <div className="relative group">
                       <select 
                          value={activeSymbol}
                          onChange={(e) => setActiveSymbol(e.target.value)}
                          className="appearance-none bg-white/90 backdrop-blur border border-slate-200 pl-3 pr-8 py-1.5 text-xs font-mono font-bold text-slate-900 shadow-sm cursor-pointer outline-none hover:border-slate-400 transition-colors uppercase"
                       >
                          {AVAILABLE_ASSETS.map(asset => (
                            <option key={asset} value={asset}>{asset}</option>
                          ))}
                       </select>
                       <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                     </div>

                     <div className="w-px h-6 bg-slate-200 mx-1"></div>

                     {/* Timeframe Selector */}
                     <div className="bg-white/90 backdrop-blur border border-slate-200 shadow-sm flex items-center">
                        {AVAILABLE_TIMEFRAMES.map((tf) => (
                           <button
                              key={tf}
                              onClick={() => setActiveTimeframe(tf)}
                              className={`px-3 py-1.5 text-xs font-mono transition-colors border-r last:border-r-0 border-slate-100
                                ${activeTimeframe === tf 
                                  ? 'bg-slate-900 text-white font-medium' 
                                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                           >
                              {tf}
                           </button>
                        ))}
                     </div>
                 </div>

                 {/* Indicator Legend Overlay */}
                 {indicators.filter(i => i.isActive).map(ind => (
                    <div key={ind.id} className="absolute top-[4.5rem] left-4 z-10 flex items-center gap-2 bg-white/90 backdrop-blur border border-slate-200 px-3 py-1 shadow-sm">
                       <span className={`w-2 h-2 rounded-full ${ind.isVisible ? 'bg-[#2962FF]' : 'bg-slate-300'}`}></span>
                       <span className="text-xs font-medium text-slate-700">{ind.name}</span>
                       
                       {/* Visibility Toggle */}
                       <button onClick={() => handleToggleVisibility(ind.id)} className="ml-2 text-slate-400 hover:text-slate-900">
                          {ind.isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                       </button>

                       {/* Remove from Chart */}
                       <button onClick={() => handleToggleIndicator(ind.id)} className="ml-1 text-slate-400 hover:text-rose-500">
                          <X size={12} />
                       </button>
                    </div>
                 ))}

                 <div className="flex-1 relative">
                    <LightweightChart 
                      data={data} 
                      trades={backtestResult?.trades} 
                      // Pass data only if active AND visible
                      lineData={indicators.some(i => i.isActive && i.isVisible) ? indicatorData : undefined}
                      lineColor="#2962FF"
                    />
                 </div>
            </div>
          )}

          {activeView === ViewState.CHART_INDICATOR && (
             <div className="max-w-7xl mx-auto h-full flex gap-6">
                
                {/* Left Panel: Indicator List */}
                <div className="w-72 flex flex-col bg-white border border-slate-200 shadow-sm">
                   <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">Indicators</span>
                      <button 
                         onClick={handleNewIndicator}
                         className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-slate-600 transition-colors"
                         title="New Indicator"
                      >
                         <Plus size={14} />
                      </button>
                   </div>
                   <div className="flex-1 overflow-y-auto">
                      {indicators.map((ind) => (
                         <div 
                            key={ind.id}
                            onClick={() => setSelectedIndicatorId(ind.id)}
                            className={`p-3 border-b border-slate-50 cursor-pointer transition-colors group
                               ${selectedIndicatorId === ind.id ? 'bg-slate-50 border-l-2 border-l-slate-900' : 'hover:bg-slate-50/50 border-l-2 border-l-transparent'}
                            `}
                         >
                            <div className="flex items-center justify-between mb-2">
                               <span className={`text-sm font-medium ${selectedIndicatorId === ind.id ? 'text-slate-900' : 'text-slate-600'}`}>
                                  {ind.name}
                               </span>
                               <button 
                                  onClick={(e) => { e.stopPropagation(); handleToggleIndicator(ind.id); }}
                                  className={`text-slate-400 hover:text-slate-900 transition-colors ${ind.isActive ? 'text-emerald-500 hover:text-emerald-600' : ''}`}
                                  title={ind.isActive ? 'Active on Chart' : 'Activate'}
                               >
                                  {ind.isActive ? <CheckCircle2 size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300"></div>}
                               </button>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                               <span>Updated {new Date(ind.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                               <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteIndicator(ind.id); }}
                                  className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-all"
                               >
                                  <Trash2 size={12} />
                               </button>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>

                {/* Right Panel: Editor */}
                <div className="flex-1 bg-white border border-slate-200 flex flex-col shadow-sm relative">
                   {selectedIndicatorId && activeIndicator ? (
                     <>
                        {/* Toolbar */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                  <FileCode size={16} className="text-slate-400" />
                                  <input 
                                     type="text" 
                                     value={activeIndicator.name}
                                     onChange={(e) => {
                                        if (selectedIndicatorId) handleSaveIndicator(selectedIndicatorId, activeIndicator.code, e.target.value)
                                     }}
                                     className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-400 text-sm font-semibold text-slate-900 outline-none w-48 transition-colors"
                                  />
                              </div>
                              <div className="h-4 w-px bg-slate-200"></div>
                              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors">
                                  <Upload size={14} />
                                  Import
                                  <input type="file" accept=".py,.txt" className="hidden" onChange={handleIndicatorUpload} />
                              </label>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <button 
                                  onClick={() => handleToggleIndicator(selectedIndicatorId)}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium border transition-colors
                                    ${activeIndicator.isActive 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                              >
                                  {activeIndicator.isActive ? <CheckCircle2 size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300"></div>}
                                  {activeIndicator.isActive ? 'Active on Chart' : 'Add to Chart'}
                              </button>
                              <button 
                                 onClick={() => {
                                    setIndicators(prev => [...prev]); // Force re-render just in case
                                 }}
                                 className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase rounded-sm hover:bg-slate-800"
                              >
                                  <Save size={14} /> Save & Apply
                              </button>
                            </div>
                        </div>

                        {/* Editor Area */}
                        <div className="flex-1 relative">
                            <textarea 
                              value={activeIndicator.code}
                              onChange={(e) => {
                                  if (selectedIndicatorId) handleSaveIndicator(selectedIndicatorId, e.target.value)
                              }}
                              className="w-full h-full p-6 font-mono text-sm leading-relaxed text-slate-800 bg-white outline-none resize-none"
                              spellCheck={false}
                            />
                        </div>
                     </>
                   ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                         <Code size={48} className="mb-4 opacity-20" />
                         <p className="text-sm font-medium">Select an indicator to edit or create a new one.</p>
                      </div>
                   )}
                </div>
             </div>
          )}

          {activeView === ViewState.API_DOCS && (
             <div className="max-w-4xl mx-auto bg-white border border-slate-200 p-10 shadow-sm min-h-[600px]">
                <div className="border-b border-slate-100 pb-6 mb-8">
                   <h1 className="text-3xl font-light text-slate-900 mb-2">API Documentation</h1>
                   <p className="text-slate-500">Reference for building Custom Chart Indicators and Strategies.</p>
                </div>

                <div className="prose prose-slate max-w-none">
                   
                   <h3 className="text-lg font-medium text-slate-900 mb-4">Indicator Structure</h3>
                   <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                      Custom indicators must be written in Python and expose a specific entry point function. 
                      The engine passes a dictionary of NumPy arrays representing the market data.
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
                      <li className="flex items-center gap-2 p-3 border border-slate-200 rounded-sm">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                         <span className="text-sm font-mono text-slate-700">numpy (np)</span>
                      </li>
                      <li className="flex items-center gap-2 p-3 border border-slate-200 rounded-sm">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                         <span className="text-sm font-mono text-slate-700">pandas (pd)</span>
                      </li>
                      <li className="flex items-center gap-2 p-3 border border-slate-200 rounded-sm">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                         <span className="text-sm font-mono text-slate-700">talib</span>
                      </li>
                      <li className="flex items-center gap-2 p-3 border border-slate-200 rounded-sm">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                         <span className="text-sm font-mono text-slate-700">math</span>
                      </li>
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
          )}

          {activeView === ViewState.DATA && (
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h3 className="text-lg font-medium text-slate-900">Data Sources</h3>
                    <p className="text-slate-500 text-sm mt-1">Import market data from external APIs or local files.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                     
                     {/* Dukascopy Card */}
                     <div className="bg-white p-8 border border-slate-200 hover:border-slate-300 transition-colors group relative flex flex-col min-h-[340px]">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                             <DownloadCloud size={120} />
                        </div>
                        <div className="relative z-20 flex-1">
                            <div className="w-10 h-10 bg-slate-900 flex items-center justify-center mb-6 rounded-sm">
                                <Globe className="text-white" size={20} />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-1">Dukascopy Data Store</h3>
                            <p className="text-xs font-mono text-slate-400 mb-6">Wrapper: Leo4815162342/dukascopy-node</p>
                            
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Market Category</label>
                                    <div className="relative">
                                      <select 
                                        value={selectedMarket}
                                        onChange={(e) => {
                                          const market = e.target.value;
                                          setSelectedMarket(market);
                                          // Reset symbol to first in new market
                                          if (DUKASCOPY_MARKETS[market] && DUKASCOPY_MARKETS[market].length > 0) {
                                            setActiveSymbol(DUKASCOPY_MARKETS[market][0].symbol);
                                          }
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-400 appearance-none cursor-pointer"
                                      >
                                        {Object.keys(DUKASCOPY_MARKETS).map(market => (
                                          <option key={market} value={market}>{market}</option>
                                        ))}
                                      </select>
                                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Asset (Futures)</label>
                                    <div className="relative">
                                      <select 
                                          value={activeSymbol}
                                          onChange={(e) => setActiveSymbol(e.target.value)}
                                          className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900 outline-none focus:border-slate-400 appearance-none cursor-pointer"
                                      >
                                          {DUKASCOPY_MARKETS[selectedMarket]?.map((asset) => (
                                            <option key={asset.symbol} value={asset.symbol}>
                                              {asset.label} ({asset.symbol})
                                            </option>
                                          ))}
                                      </select>
                                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date Range</label>
                                    <div className="relative z-20 flex gap-2">
                                        <div className="w-1/2">
                                           <DatePickerInput 
                                              value={startDate} 
                                              onChange={setStartDate} 
                                              placeholder="DD-MM-YYYY (Start)" 
                                            />
                                        </div>
                                        <div className="w-1/2">
                                           <DatePickerInput 
                                              value={endDate} 
                                              onChange={setEndDate} 
                                              placeholder="DD-MM-YYYY (End)" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative z-10 mt-auto pt-6 border-t border-slate-50">
                            <button 
                                onClick={handleDukascopyFetch}
                                disabled={repoStatus === 'syncing'}
                                className="w-full py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-50"
                            >
                                {repoStatus === 'syncing' ? 'Downloading...' : 'Import from Dukascopy'}
                            </button>
                        </div>
                     </div>

                     {/* Generic Custom Import */}
                     <div className="bg-white p-8 border border-slate-200 hover:border-slate-300 transition-colors group relative overflow-hidden flex flex-col min-h-[340px]">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                             <FileSpreadsheet size={120} />
                        </div>
                        <div className="relative z-10 flex-1">
                            <div className="w-10 h-10 bg-white border border-slate-200 flex items-center justify-center mb-6 rounded-sm">
                                <Upload className="text-slate-900" size={20} />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-1">Custom Data Import</h3>
                            <p className="text-xs font-mono text-slate-400 mb-6">Format: CSV, JSON, Parquet</p>
                            
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-center h-[140px] hover:bg-slate-50 transition-colors cursor-pointer" onClick={handleCustomImport}>
                                <FileSpreadsheet className="text-slate-300 mb-2" size={24} />
                                <span className="text-sm font-medium text-slate-600">Drag & Drop file here</span>
                                <span className="text-xs text-slate-400 mt-1">or click to browse local storage</span>
                            </div>
                        </div>
                        <div className="relative z-10 mt-auto pt-6 border-t border-slate-50">
                             <button 
                                onClick={handleCustomImport}
                                className="w-full py-3 bg-white border border-slate-200 text-slate-900 text-xs font-bold uppercase tracking-widest hover:border-slate-400 transition-colors"
                            >
                                Select File
                            </button>
                        </div>
                     </div>
                </div>

                {/* Sync Logs Console */}
                <div className="bg-slate-900 p-6 rounded-sm border border-slate-800 text-slate-300 font-mono text-xs flex flex-col h-[300px]">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-2">
                      <Terminal size={14} className="text-slate-500" />
                      <span className="font-semibold text-slate-400">Import Log Output</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-2">
                      {syncLogs.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-600">
                              <FolderOpen size={24} className="mb-2 opacity-50" />
                              <p>Waiting for import command...</p>
                          </div>
                      ) : (
                          syncLogs.map((log, i) => (
                              <div key={i} className="break-words">
                                  <span className="text-slate-500 mr-2">{'>'}</span>
                                  {log}
                              </div>
                          ))
                      )}
                      <div ref={logsEndRef} />
                  </div>
                </div>
            </div>
          )}

          {activeView === ViewState.DATA_NORMALIZATION && (
            <div className="max-w-4xl mx-auto">
               <div className="mb-10">
                    <h3 className="text-lg font-medium text-slate-900">Data Normalization Rules</h3>
                    <p className="text-slate-500 text-sm mt-1">Define how raw tick data is processed and structured for the engine.</p>
               </div>

               <div className="bg-white border border-slate-200 divide-y divide-slate-100 shadow-sm">
                  
                  {/* Rule 1: Timezone */}
                  <div className="p-8 flex items-start justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="max-w-md">
                          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                            <Globe size={16} className="text-slate-400" /> Timezone Adjustment
                          </h4>
                          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                             Convert all incoming data timestamps to a unified timezone. Recommended for aligning futures contracts.
                          </p>
                      </div>
                      <div className="flex items-center gap-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                             <div className={`w-12 h-6 rounded-full p-1 transition-colors ${normTimezone ? 'bg-slate-900' : 'bg-slate-200'}`}
                                  onClick={() => setNormTimezone(!normTimezone)}>
                                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${normTimezone ? 'translate-x-6' : 'translate-x-0'}`}></div>
                             </div>
                             <span className="text-sm font-medium text-slate-900">UTC-3 (Brasilia)</span>
                          </label>
                      </div>
                  </div>

                  {/* Rule 2: Basis */}
                  <div className="p-8 flex items-start justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="max-w-md">
                          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                            <Layers size={16} className="text-slate-400" /> Price Basis
                          </h4>
                          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                             Adjust the price levels of historical contracts to form a continuous series. 
                             <br/><span className="text-xs text-slate-400 italic">Regression aligns slope; Median aligns gaps.</span>
                          </p>
                      </div>
                      <div className="flex flex-col gap-3">
                          <label className="flex items-center gap-3 cursor-pointer group">
                             <input type="radio" name="basis" checked={normBasis === 'median'} onChange={() => setNormBasis('median')} className="accent-slate-900" />
                             <span className="text-sm text-slate-600 group-hover:text-slate-900">Gap Median Alignment</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer group">
                             <input type="radio" name="basis" checked={normBasis === 'regression'} onChange={() => setNormBasis('regression')} className="accent-slate-900" />
                             <span className="text-sm text-slate-600 group-hover:text-slate-900">Linear Regression (EOD)</span>
                          </label>
                      </div>
                  </div>

                  {/* Rule 3: Tick Size */}
                  <div className="p-8 flex items-start justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="max-w-md">
                          <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                            <Sliders size={16} className="text-slate-400" /> Tick Discretization
                          </h4>
                          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                             Snap prices to a specific grid size. Essential for consistent backtesting of futures instruments.
                          </p>
                      </div>
                      <div className="w-[300px]">
                           <div className="grid grid-cols-4 gap-2 mb-3">
                              {Object.entries(TICK_PRESETS).filter(([k]) => k.length <= 5).map(([key, val]) => (
                                <button 
                                  key={key}
                                  onClick={() => { setNormTickSize(val); setIsCustomTick(false); }}
                                  className={`px-2 py-1.5 text-xs font-mono border rounded
                                    ${normTickSize === val && !isCustomTick
                                      ? 'bg-slate-900 text-white border-slate-900' 
                                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                    }`}
                                >
                                   {key}
                                </button>
                              ))}
                           </div>
                           <div className="flex items-center gap-2">
                               <span className="text-xs font-bold text-slate-400 uppercase">Value</span>
                               <input 
                                  type="number" 
                                  step="0.0001"
                                  value={normTickSize}
                                  onChange={(e) => { setNormTickSize(parseFloat(e.target.value)); setIsCustomTick(true); }}
                                  className="flex-1 bg-slate-50 border border-slate-200 px-3 py-1.5 text-sm font-mono text-slate-900 outline-none focus:border-slate-400"
                               />
                           </div>
                      </div>
                  </div>

               </div>

               <div className="mt-8 flex justify-end">
                  <button className="px-8 py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-shadow shadow-lg shadow-slate-200">
                     Save Rules
                  </button>
               </div>
            </div>
          )}

          {activeView === ViewState.STRATEGY && (
            <div className="max-w-4xl mx-auto bg-white border border-slate-200 p-8 min-h-[500px]">
               <div className="flex items-center justify-between mb-6">
                 <div>
                    <h3 className="text-lg font-medium text-slate-900">Strategy Configuration</h3>
                    <p className="text-slate-500 text-sm mt-1">Lean Engine parameters for <span className="font-mono text-slate-700 bg-slate-100 px-1">main.py</span></p>
                 </div>
                 <button className="text-xs font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1">
                    <Settings size={14} /> Settings
                 </button>
               </div>
               
               <div className="p-12 border border-dashed border-slate-300 flex flex-col items-center justify-center text-center bg-slate-50/50">
                  <Code size={32} className="text-slate-300 mb-4" />
                  <p className="text-slate-600 font-medium">Strategy Code Integration</p>
                  <p className="text-sm text-slate-400 mt-2 max-w-md">
                     The strategy logic is currently handled by the underlying Lean Engine integration. 
                     Editing parameters directly via UI is disabled in this version.
                  </p>
                  <div className="mt-8 flex gap-3">
                     <button onClick={() => setActiveView(ViewState.CHART)} className="px-4 py-2 bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:border-slate-300">
                        View Chart
                     </button>
                     <button onClick={handleRunBacktest} className="px-4 py-2 bg-slate-900 text-white text-xs font-medium hover:bg-slate-800">
                        Run Simulation
                     </button>
                  </div>
               </div>
            </div>
          )}

          {activeView === ViewState.ANALYSIS && (
            <div className="max-w-6xl mx-auto space-y-8">
              {!backtestResult ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200 border-dashed">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                     <Code size={24} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">No Simulation Results</h3>
                  <p className="text-slate-500 text-sm mt-2 max-w-sm text-center">
                      Run the backtest using the current strategy configuration from <span className="font-mono text-xs bg-slate-100 px-1">main.py</span>.
                  </p>
                  <button onClick={handleRunBacktest} className="mt-6 text-sm font-medium text-slate-900 underline underline-offset-4 hover:text-slate-600">
                      Execute Simulation
                  </button>
                </div>
              ) : (
                <>
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

                  <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white p-8 border border-slate-200">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">Equity Curve</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={backtestResult.equityCurve}>
                              <XAxis dataKey="time" hide />
                              <YAxis domain={['auto', 'auto']} hide />
                              <ReTooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: 'none', color: '#fff', fontSize: '12px' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ display: 'none' }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#0f172a" 
                                strokeWidth={1.5} 
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 flex flex-col h-[380px]">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Trade Log</h3>
                          <Settings size={14} className="text-slate-400 cursor-pointer hover:text-slate-600"/>
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
                                {backtestResult.trades.slice().reverse().map((trade) => (
                                  <tr key={trade.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-3">
                                      <div className="flex items-center gap-2">
                                         <div className={`w-1.5 h-1.5 rounded-full ${trade.profit > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                         <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{activeSymbol}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-3 text-xs text-slate-500 font-mono">{trade.exitTime}</td>
                                    <td className="px-6 py-3 text-right">
                                      <span className={`text-xs font-mono font-medium ${trade.profit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {trade.profit > 0 ? '+' : ''}{trade.profit.toFixed(2)}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                           </table>
                        </div>
                      </div>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;