import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AVAILABLE_ASSETS, AVAILABLE_TIMEFRAMES } from '../constants/markets';
import { TIMEZONE_OPTIONS } from '../constants/timezones';
import { ViewState } from '../types';

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
};

const AppStateContext = createContext<AppState | undefined>(undefined);

const STORAGE_KEY = 'thelab.selectedTimeframes';
const TZ_STORAGE_KEY = 'thelab.chartTimezone';
const DATASETS_STORAGE_KEY = 'thelab.downloadedAssets';

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

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [activeView, setActiveView] = useState<ViewState>(ViewState.CHART);
  const [activeSymbol, setActiveSymbol] = useState('CL1!');
  const [activeTimeframe, setActiveTimeframe] = useState('H1');

  const [availableTimeframes, setAvailableTimeframesInternal] = useState<Record<string, string[]>>(() =>
    AVAILABLE_ASSETS.reduce((acc, asset) => {
      acc[asset] = [...AVAILABLE_TIMEFRAMES];
      return acc;
    }, {} as Record<string, string[]>)
  );

  const [selectedTimeframes, setSelectedTimeframesState] = useState<string[]>(loadPinnedTimeframes);

  const [chartTimezone, setChartTimezoneState] = useState<string>(() => {
    if (typeof window === 'undefined') return TIMEZONE_OPTIONS[0].id;
    return window.localStorage.getItem(TZ_STORAGE_KEY) || TIMEZONE_OPTIONS[0].id;
  });

  const [downloadedAssets, setDownloadedAssetsState] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(DATASETS_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) return Array.from(new Set(parsed.map(String)));
    } catch {
      /* ignore */
    }
    return [];
  });

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

  const setAvailableTimeframes = (asset: string, frames: string[]) => {
    const normalized = Array.from(new Set(frames.map((tf) => String(tf).toUpperCase())));
    setAvailableTimeframesInternal((prev) => ({
      ...prev,
      [asset]: normalized.length ? normalized : [...AVAILABLE_TIMEFRAMES],
    }));
  };

  const setSelectedTimeframes = (frames: string[]) => {
    const normalized = Array.from(new Set(frames.map((tf) => String(tf).toUpperCase())));
    setSelectedTimeframesState(normalized.length ? normalized : [...AVAILABLE_TIMEFRAMES]);
  };

  const setChartTimezone = (timezone: string) => {
    setChartTimezoneState(timezone || TIMEZONE_OPTIONS[0].id);
  };

  const setDownloadedAssets = (assets: string[]) => {
    const normalized = Array.from(new Set(assets.map((asset) => String(asset))));
    setDownloadedAssetsState(normalized);
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
