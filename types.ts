
export interface Candle {
  time: string | number; // YYYY-MM-DD or Unix Timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Generic indicator overlay models (used by the Indicator Execution Engine)
export interface IndicatorSeriesPoint {
  time: string | number;
  value: number;
}

export interface IndicatorMarker {
  time: string | number;
  value?: number;
  kind: string;
}

export interface IndicatorLevel {
  timeStart: string | number;
  timeEnd: string | number;
  price: number;
  kind: string;
}

export interface IndicatorOverlay {
  series: Record<string, IndicatorSeriesPoint[]>;
  markers: IndicatorMarker[];
  levels: IndicatorLevel[];
}

export type StrategyLabErrorSource = 'indicator' | 'strategy' | 'lean' | 'system';

export interface StrategyLabError {
  source: StrategyLabErrorSource;
  type: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  phase?: string;
  traceback?: string;
  createdAt: number;
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

export type LicenseMode = 'internal' | 'early-access' | 'expired';

export interface LicenseState {
  mode: LicenseMode;
  key?: string;
}

export interface UserProfile {
  name: string;
  email?: string;
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
  DATA_NORMALIZATION = 'DATA_NORMALIZATION',
  ANALYSIS = 'ANALYSIS',
  STRATEGY = 'STRATEGY',
  API_DOCS = 'API_DOCS',
  REPOSITORY = 'REPOSITORY',
  DEBUG = 'DEBUG',
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
