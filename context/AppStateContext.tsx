import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AVAILABLE_ASSETS, AVAILABLE_TIMEFRAMES } from '../constants/markets';
import { TIMEZONE_OPTIONS } from '../constants/timezones';
import { ChartAppearance, ViewState } from '../types';

type AppState = {
  activeView: ViewState;
  setActiveView: (view: ViewState) => void;
  activeSymbol: string;
  setActiveSymbol: (symbol: string) => void;
  activeTimeframe: string;
  setActiveTimeframe: (timeframe: string) => void;
  availableTimeframes: Record<string, string[]>;
  setAvailableTimeframes: (asset: string, frames: string[]) => void;
  selectedTimeframes: string[];
  setSelectedTimeframes: (frames: string[]) => void;
  chartTimezone: string;
  setChartTimezone: (timezone: string) => void;
  downloadedAssets: string[];
  setDownloadedAssets: (assets: string[]) => void;
  chartAppearance: ChartAppearance;
  setChartAppearance: (appearance: Partial<ChartAppearance>) => void;
};

const AppStateContext = createContext<AppState | undefined>(undefined);

const STORAGE_KEY = 'thelab.selectedTimeframes';
const TZ_STORAGE_KEY = 'thelab.chartTimezone';
const DATASETS_STORAGE_KEY = 'thelab.downloadedAssets';
const APPEARANCE_STORAGE_KEY = 'thelab.chartAppearance';
const DEFAULT_TIMEZONE_ID = 'America/Sao_Paulo';

const loadPinnedTimeframes = () => {
  if (typeof window === 'undefined') return [...AVAILABLE_TIMEFRAMES];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [...AVAILABLE_TIMEFRAMES];
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length) {
      return Array.from(new Set(parsed.map((tf) => String(tf).toUpperCase())));
    }
  } catch {
    /* ignore browser errors */
  }
  return [...AVAILABLE_TIMEFRAMES];
};

export const DEFAULT_APPEARANCE: ChartAppearance = {
  backgroundColor: '#f8fafc',
  gridEnabled: false,
  gridColor: '#e2e8f0',
  candleUp: {
    body: '#ffffff',
    border: '#111827',
    wick: '#111827',
  },
  candleDown: {
    body: '#111827',
    border: '#111827',
    wick: '#111827',
  },
  usePrevCloseColoring: false,
  scaleTextColor: '#111827',
  scaleTextSize: 10,
};

const loadAppearance = (): ChartAppearance => {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE;
  try {
    const stored = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!stored) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_APPEARANCE,
      ...(parsed || {}),
      candleUp: { ...DEFAULT_APPEARANCE.candleUp, ...(parsed?.candleUp || {}) },
      candleDown: { ...DEFAULT_APPEARANCE.candleDown, ...(parsed?.candleDown || {}) },
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
};


export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [activeView, setActiveView] = useState<ViewState>(ViewState.CHART);
  const [activeSymbol, setActiveSymbolState] = useState('CL1!');
  const [activeTimeframe, setActiveTimeframeState] = useState('H1');

  const [availableTimeframes, setAvailableTimeframesInternal] = useState<Record<string, string[]>>(() =>
    AVAILABLE_ASSETS.reduce((acc, asset) => {
      acc[asset] = [...AVAILABLE_TIMEFRAMES];
      return acc;
    }, {} as Record<string, string[]>)
  );

  const [selectedTimeframes, setSelectedTimeframesState] = useState<string[]>(loadPinnedTimeframes);

  const [chartTimezone, setChartTimezoneState] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_TIMEZONE_ID;
    return window.localStorage.getItem(TZ_STORAGE_KEY) || DEFAULT_TIMEZONE_ID;
  });

  const [downloadedAssets, setDownloadedAssetsState] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(DATASETS_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) return Array.from(new Set(parsed.map((asset: string) => String(asset).toUpperCase())));
    } catch {
      /* ignore */
    }
    return [];
  });

  const [chartAppearance, setChartAppearanceState] = useState<ChartAppearance>(loadAppearance);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedTimeframes));
    } catch {
      /* ignore */
    }
  }, [selectedTimeframes]);

  useEffect(() => {
    try {
      window.localStorage.setItem(TZ_STORAGE_KEY, chartTimezone);
    } catch {
      /* ignore */
    }
  }, [chartTimezone]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DATASETS_STORAGE_KEY, JSON.stringify(downloadedAssets));
    } catch {
      /* ignore */
    }
  }, [downloadedAssets]);

  useEffect(() => {
    try {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(chartAppearance));
    } catch {
      /* ignore */
    }
  }, [chartAppearance]);

  const setAvailableTimeframes = (asset: string, frames: string[]) => {
    const normalizedAsset = String(asset || '').toUpperCase();
    const normalized = Array.from(new Set(frames.map((tf) => String(tf).toUpperCase())));
    setAvailableTimeframesInternal((prev) => ({
      ...prev,
      [normalizedAsset]: normalized.length ? normalized : [...AVAILABLE_TIMEFRAMES],
    }));
  };

  const setSelectedTimeframes = (frames: string[]) => {
    const normalized = Array.from(new Set(frames.map((tf) => String(tf).toUpperCase())));
    setSelectedTimeframesState(normalized.length ? normalized : [...AVAILABLE_TIMEFRAMES]);
  };

  const setChartTimezone = (timezone: string) => {
    setChartTimezoneState(timezone || DEFAULT_TIMEZONE_ID);
  };

  const setDownloadedAssets = (assets: string[]) => {
    const normalized = Array.from(new Set(assets.map((asset) => String(asset || '').toUpperCase())));
    setDownloadedAssetsState(normalized);
  };

  const setActiveSymbol = (symbol: string) => {
    setActiveSymbolState(String(symbol || '').toUpperCase());
  };

  const setActiveTimeframe = (timeframe: string) => {
    setActiveTimeframeState(String(timeframe || '').toUpperCase());
  };

  const setChartAppearance = (appearance: Partial<ChartAppearance>) => {
    setChartAppearanceState((prev) => ({
      ...prev,
      ...appearance,
      candleUp: { ...prev.candleUp, ...(appearance.candleUp || {}) },
      candleDown: { ...prev.candleDown, ...(appearance.candleDown || {}) },
    }));
  };

  return (
    <AppStateContext.Provider
      value={{
        activeView,
        setActiveView,
        activeSymbol,
        setActiveSymbol,
        activeTimeframe,
        setActiveTimeframe,
        availableTimeframes,
        setAvailableTimeframes,
        selectedTimeframes,
        setSelectedTimeframes,
        chartTimezone,
        setChartTimezone,
        downloadedAssets,
        setDownloadedAssets,
        chartAppearance,
        setChartAppearance,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }
  return ctx;
};
