
export interface Candle {
  time: string | number; // YYYY-MM-DD or Unix Timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Trade {
  id: string;
  entryTime: string | number;
  exitTime: string | number;
  entryPrice: number;
  exitPrice: number;
  direction: 'long' | 'short';
  profit: number;
  profitPercent: number;
}

export interface BacktestResult {
  totalTrades: number;
  winRate: number;
  totalProfit: number;
  drawdown: number;
  trades: Trade[];
  equityCurve: { time: string | number; value: number }[];
  source?: 'local' | 'lean';
  jobId?: string;
  rawStatistics?: Record<string, string | number>;
}

export interface CustomIndicator {
  id: string;
  name: string;
  code: string;
  filePath: string;
  lastModified: number;
  sizeBytes?: number;
  isActive: boolean;
  isVisible: boolean;
  createdAt: number;
  updatedAt: number;
  appliedVersion: number;
  hasUpdate?: boolean;
}

export enum ViewState {
  CHART = 'CHART',
  CHART_INDICATOR = 'CHART_INDICATOR',
  DATA = 'DATA',
  DATA_NORMALIZATION = 'DATA_NORMALIZATION',
  ANALYSIS = 'ANALYSIS',
  STRATEGY = 'STRATEGY',
  API_DOCS = 'API_DOCS',
  REPOSITORY = 'REPOSITORY'
}

export interface StrategyFile {
  id: string;
  name: string;
  code: string;
  filePath: string;
  lastModified: number;
  sizeBytes?: number;
  appliedVersion: number;
}

export interface ChartAppearance {
  backgroundColor: string;
  gridEnabled: boolean;
  gridColor: string;
  candleUp: {
    body: string;
    border: string;
    wick: string;
  };
  candleDown: {
    body: string;
    border: string;
    wick: string;
  };
  usePrevCloseColoring: boolean;
  scaleTextColor: string;
  scaleTextSize: number;
}
