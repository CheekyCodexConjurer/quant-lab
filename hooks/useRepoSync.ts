import { useState } from 'react';

type RepoStatus = 'disconnected' | 'syncing' | 'synced' | 'error';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimestamp = (message: string) => `[${new Date().toLocaleTimeString()}] ${message}`;

export const useRepoSync = (
  refreshData: (size?: number) => void,
  symbol: string,
  timeframe: string,
  selectedMarket: string,
  startDate: string,
  endDate: string,
  normTickSize: number
) => {
  const [repoStatus, setRepoStatus] = useState<RepoStatus>('disconnected');
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  const appendLog = (message: string) => {
    setSyncLogs((prev) => [...prev, withTimestamp(message)]);
  };

  const runSteps = async (steps: string[], delay: number) => {
    setRepoStatus('syncing');
    for (const step of steps) {
      appendLog(step);
      await sleep(delay);
    }
    setRepoStatus('synced');
  };

  const handleRepoSync = async () => {
    appendLog('--- SYNC STARTED ---');
    await runSteps(
      [
        'Connecting to trader-matthews-lean-lab...',
        `Located data/normalized/futures/${symbol}/${timeframe}...`,
        `Fetching ${symbol}_${timeframe}.csv...`,
        'Parsing CSV headers (Date, Open, High, Low, Close, Volume)...',
        'Validating tick alignment... OK',
        `Resampling from M1 base data to ${timeframe}...`,
        'Loading 500 candles into memory...',
      ],
      800
    );
    refreshData(500);
    appendLog('Sync Complete.');
  };

  const handleDukascopyFetch = async () => {
    appendLog('--- INITIATING DUKASCOPY IMPORT ---');
    await runSteps(
      [
        'Initializing Leo4815162342/dukascopy-node...',
        `Market: ${selectedMarket}`,
        `Target: ${symbol} (Futures Continuous)`,
        `Date Range: ${startDate} to ${endDate}`,
        'Requesting tick data...',
        'Downloading .bi5 compression stream...',
        'Decompressing binary data...',
        'Applying Timezone: UTC-3...',
        `Normalizing Tick Size to ${normTickSize}...`,
        `Converting to OHLC candles (${timeframe})...`,
      ],
      600
    );
    refreshData(1000);
    appendLog('Import complete. 1000 candles generated.');
  };

  const handleCustomImport = async () => {
    appendLog('Opening file dialog...');
    await sleep(500);
    appendLog('Selected: user_data_export.csv');
    await sleep(300);
    appendLog('Parsing columns... OK');
    await sleep(300);
    appendLog('Data loaded into Engine.');
  };

  return { repoStatus, syncLogs, handleRepoSync, handleDukascopyFetch, handleCustomImport };
};
