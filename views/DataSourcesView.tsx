import React from 'react';
import { DownloadCloud, Globe, FileSpreadsheet, Upload } from 'lucide-react';
import { DUKASCOPY_MARKETS, MarketAsset } from '../constants/markets';
import { DatePickerInput } from '../components/common/DatePickerInput';
import { SyncLogConsole } from '../components/panels/SyncLogConsole';

type DataSourcesViewProps = {
  selectedMarket: string;
  setSelectedMarket: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  importStatus: 'idle' | 'running' | 'completed' | 'error';
  onDukascopyImport: (range: { startDate?: string; endDate?: string }) => Promise<void>;
  onCustomImport: () => Promise<void>;
  logs?: string[];
  progress?: number;
  activeSymbol: string;
  onSymbolChange: (symbol: string) => void;
  activeTimeframe: string;
};

export const DataSourcesView: React.FC<DataSourcesViewProps> = ({
  selectedMarket,
  setSelectedMarket,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  importStatus,
  onDukascopyImport,
  onCustomImport,
  logs = [],
  progress = 0,
  activeSymbol,
  onSymbolChange,
  activeTimeframe,
}) => {
  const handleMarketChange = (market: string) => {
    setSelectedMarket(market);
    const firstAsset: MarketAsset | undefined = DUKASCOPY_MARKETS[market]?.[0];
    if (firstAsset) {
      onSymbolChange(firstAsset.symbol);
    }
  };

  const sanitizeDateInput = (value: string) => (/^\d{2}-\d{2}-\d{4}$/.test(value) ? value : undefined);

  const handleDukascopyImport = async () => {
    const start = sanitizeDateInput(startDate);
    const end = sanitizeDateInput(endDate);
    const isOldest = startDate.trim().toLowerCase().startsWith('oldest');
    const isPresent = endDate.trim().toLowerCase().startsWith('present');

    await onDukascopyImport({
      startDate: isOldest ? undefined : start,
      endDate: isPresent ? undefined : end,
      fullHistory: isOldest,
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h3 className="text-lg font-medium text-slate-900">Data Sources</h3>
        <p className="text-slate-500 text-sm mt-1">Import market data from external APIs or local files.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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
                    onChange={(event) => handleMarketChange(event.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-slate-400 appearance-none cursor-pointer"
                  >
                    {Object.keys(DUKASCOPY_MARKETS).map((market) => (
                      <option key={market} value={market}>
                        {market}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Asset (Futures)</label>
                <div className="relative">
                  <select
                    value={activeSymbol}
                    onChange={(event) => onSymbolChange(event.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900 outline-none focus:border-slate-400 appearance-none cursor-pointer"
                  >
                    {DUKASCOPY_MARKETS[selectedMarket]?.map((asset) => (
                      <option key={asset.symbol} value={asset.symbol}>
                        {asset.label} ({asset.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date Range</label>
                <div className="relative z-20 flex gap-2">
                  <div className="w-1/2">
                    <DatePickerInput value={startDate} onChange={setStartDate} placeholder="DD-MM-YYYY (Start)" />
                  </div>
                  <div className="w-1/2">
                    <DatePickerInput value={endDate} onChange={setEndDate} placeholder="DD-MM-YYYY (End)" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-auto pt-6 border-t border-slate-50">
            <button
              onClick={handleDukascopyImport}
              disabled={importStatus === 'running'}
              className="w-full py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {importStatus === 'running' ? 'Downloading...' : 'Import from Dukascopy'}
            </button>
          </div>
        </div>

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

            <div
              className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-center h-[140px] hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={onCustomImport}
            >
              <FileSpreadsheet className="text-slate-300 mb-2" size={24} />
              <span className="text-sm font-medium text-slate-600">Drag & Drop file here</span>
              <span className="text-xs text-slate-400 mt-1">or click to browse local storage</span>
            </div>
          </div>
          <div className="relative z-10 mt-auto pt-6 border-t border-slate-50">
            <button
              onClick={onCustomImport}
              className="w-full py-3 bg-white border border-slate-200 text-slate-900 text-xs font-bold uppercase tracking-widest hover:border-slate-400 transition-colors"
            >
              Select File
            </button>
          </div>
        </div>
      </div>

      <SyncLogConsole logs={logs} progress={progress} isRunning={importStatus === 'running'} />
    </div>
  );
};
