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
  importStatus: 'idle' | 'running' | 'completed' | 'error' | 'canceled';
  onDukascopyImport: (range: { startDate?: string; endDate?: string; mode?: 'continue' | 'restart' }) => Promise<void>;
  onCustomImport: () => Promise<void>;
  onCheckExisting: () => Promise<{
    asset: string;
    hasExisting: boolean;
    existingRanges?: Record<string, { start?: string; end?: string; count?: number }>;
  }>;
  onClearLogs: () => void;
  onCancelImport: () => void;
  logs?: string[];
  progress?: number;
  lastUpdated?: string | null;
  activeSymbol: string;
  onSymbolChange: (symbol: string) => void;
  activeTimeframe: string;
  frameStatus?: {
    currentFrame?: string | null;
    frameIndex?: number;
    frameCount?: number;
    frameProgress?: number;
    frameStage?: string;
  };
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
  onCheckExisting,
  onClearLogs,
  onCancelImport,
  logs = [],
  progress = 0,
  lastUpdated = null,
  activeSymbol,
  onSymbolChange,
  activeTimeframe,
  frameStatus,
}) => {
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [existingInfo, setExistingInfo] = React.useState<{
    asset: string;
    hasExisting: boolean;
    existingRanges?: Record<string, { start?: string; end?: string; count?: number }>;
  } | null>(null);
  const [isChecking, setIsChecking] = React.useState(false);

  const handleMarketChange = (market: string) => {
    setSelectedMarket(market);
    const firstAsset: MarketAsset | undefined = DUKASCOPY_MARKETS[market]?.[0];
    if (firstAsset) {
      onSymbolChange(firstAsset.symbol);
    }
  };

  const handleDukascopyImport = async () => {
    try {
      setIsChecking(true);
      const preview = await onCheckExisting();
      setExistingInfo(preview);
      if (preview?.hasExisting) {
        setShowPrompt(true);
      } else {
        await onDukascopyImport({});
      }
    } catch (error) {
      console.warn('[import] check existing failed', error);
      await onDukascopyImport({});
    } finally {
      setIsChecking(false);
    }
  };

  const runImportWithMode = async (mode: 'continue' | 'restart') => {
    setShowPrompt(false);
    await onDukascopyImport({ mode });
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
            </div>
          </div>
          <div className="relative z-10 mt-auto pt-6 border-t border-slate-50">
            <button
              onClick={handleDukascopyImport}
              disabled={importStatus === 'running' || isChecking}
              className="w-full py-3 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {importStatus === 'running' ? 'Downloading...' : isChecking ? 'Checking data...' : 'Import from Dukascopy'}
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

      <SyncLogConsole
        logs={logs}
        progress={progress}
        frameStatus={frameStatus}
        isRunning={importStatus === 'running'}
        onCancel={onCancelImport}
        onClearLogs={onClearLogs}
        lastUpdated={lastUpdated}
      />

      {showPrompt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-lg border border-slate-200 w-[420px] max-w-[90%]">
            <div className="px-6 py-4 border-b border-slate-100">
              <h4 className="text-sm font-semibold text-slate-900">Existing data detected</h4>
              <p className="text-xs text-slate-500 mt-1">
                We found previous downloads for {existingInfo?.asset || activeSymbol}. Choose how to proceed.
              </p>
              {existingInfo?.existingRanges && (
                <div className="mt-3 bg-slate-50 border border-slate-100 rounded px-3 py-2 text-[11px] text-slate-600 space-y-1">
                  {Object.entries(existingInfo.existingRanges).map(([frame, range]) => (
                    <div key={frame} className="flex justify-between">
                      <span className="font-semibold uppercase">{frame}</span>
                      <span className="text-right">
                        {range.start || '?'} -&gt; {range.end || '?'} ({range.count || 0} records)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 flex flex-col gap-2">
              <button
                onClick={() => runImportWithMode('continue')}
                className="w-full py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
              >
                Continue from last saved point
              </button>
              <button
                onClick={() => runImportWithMode('restart')}
                className="w-full py-2.5 bg-white border border-slate-200 text-xs font-bold uppercase tracking-widest text-slate-900 hover:border-slate-400 transition-colors"
              >
                Reimport full history
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
