import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AVAILABLE_ASSETS, AVAILABLE_TIMEFRAMES } from '../constants/markets';
import { ChartAppearance, ViewState, LicenseState, UserProfile } from '../types';

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
  license: LicenseState;
  setLicense: (next: LicenseState) => void;
  debugMode: boolean;
  setDebugMode: (enabled: boolean) => void;
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  datasetRanges: Record<string, Record<string, { start?: string; end?: string; count?: number }>>;
  setDatasetRanges: (
    asset: string,
    ranges: Record<string, { start?: string; end?: string; count?: number }>
  ) => void;
};

const AppStateContext = createContext<AppState | undefined>(undefined);

const STORAGE_KEY = 'thelab.selectedTimeframes';
const TZ_STORAGE_KEY = 'thelab.chartTimezone';
const DATASETS_STORAGE_KEY = 'thelab.downloadedAssets';
const APPEARANCE_STORAGE_KEY = 'thelab.chartAppearance';
const DEBUG_STORAGE_KEY = 'thelab.debugMode';
const DEFAULT_TIMEZONE_ID = 'America/Sao_Paulo';
const LICENSE_STORAGE_KEY = 'thelab.licenseState';
const USER_STORAGE_KEY = 'thelab.userProfile';

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
  const [activeView, setActiveView] = useState<ViewState>(ViewState.DASHBOARD);
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
  const [license, setLicenseState] = useState<LicenseState>(() => {
    if (typeof window === 'undefined') return { mode: 'internal' };
    try {
      const stored = window.localStorage.getItem(LICENSE_STORAGE_KEY);
      if (!stored) return { mode: 'internal' };
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.mode === 'string') {
        return { mode: parsed.mode, key: typeof parsed.key === 'string' ? parsed.key : undefined };
      }
    } catch {
      /* ignore */
    }
    return { mode: 'internal' };
  });
  const [user, setUserState] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.localStorage.getItem(USER_STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.name === 'string') {
        return {
          name: parsed.name,
          email: typeof parsed.email === 'string' ? parsed.email : undefined,
        };
      }
    } catch {
      /* ignore */
    }
    return null;
  });
  const [datasetRanges, setDatasetRangesState] = useState<
    Record<string, Record<string, { start?: string; end?: string; count?: number }>>
  >({});
  const [debugMode, setDebugModeState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = window.localStorage.getItem(DEBUG_STORAGE_KEY);
      if (!stored) return false;
      return stored === '1' || stored === 'true';
    } catch {
      return false;
    }
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

  useEffect(() => {
    try {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(chartAppearance));
    } catch {
      /* ignore */
    }
  }, [chartAppearance]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DEBUG_STORAGE_KEY, debugMode ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [debugMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(license));
    } catch {
      /* ignore */
    }
  }, [license]);

  useEffect(() => {
    try {
      if (!user) {
        window.localStorage.removeItem(USER_STORAGE_KEY);
      } else {
        window.localStorage.setItem(
          USER_STORAGE_KEY,
          JSON.stringify({
            name: user.name,
            email: user.email || undefined,
          })
        );
      }
    } catch {
      /* ignore */
    }
  }, [user]);

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

  const setLicense = (next: LicenseState) => {
    setLicenseState({
      mode: next?.mode || 'internal',
      key: next?.key || undefined,
    });
  };

  const setUser = (next: UserProfile | null) => {
    if (!next || !next.name?.trim()) {
      setUserState(null);
      return;
    }
    setUserState({
      name: next.name.trim(),
      email: next.email?.trim() || undefined,
    });
  };

  const setDatasetRanges = (
    asset: string,
    ranges: Record<string, { start?: string; end?: string; count?: number }>
  ) => {
    const normalizedAsset = String(asset || '').toUpperCase();
    const normalizedRanges: Record<string, { start?: string; end?: string; count?: number }> = {};
    Object.entries(ranges || {}).forEach(([tf, meta]) => {
      const key = String(tf || '').toUpperCase();
      normalizedRanges[key] = {
        start: meta?.start,
        end: meta?.end,
        count: typeof meta?.count === 'number' ? meta.count : undefined,
      };
    });
    setDatasetRangesState((prev) => ({
      ...prev,
      [normalizedAsset]: normalizedRanges,
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
        license,
        setLicense,
        debugMode,
        setDebugMode: setDebugModeState,
        user,
        setUser,
        datasetRanges,
        setDatasetRanges,
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
