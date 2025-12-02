
import React, { useEffect, useMemo, useState } from 'react';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { useIncrementalMarketData, prefetchMarketWindow } from './hooks/useIncrementalMarketData';
import { useIndicators } from './hooks/useIndicators';
import { useBacktest } from './hooks/useBacktest';
import { useNormalizationSettings } from './hooks/useNormalizationSettings';
import { AVAILABLE_TIMEFRAMES } from './constants/markets';
import { AnalysisView } from './views/AnalysisView';
import { DebugView } from './views/DebugView';
import { ViewState } from './types';
import { apiClient } from './services/api/client';
import { applyGapQuantization } from './utils/gapQuantization';
import { useStrategies } from './hooks/useStrategies';
import { ToastProvider } from './components/common/Toast';
import { useToast } from './components/common/Toast';
import { useAvailableFrames } from './hooks/useAvailableFrames';
import { useLeanBacktest } from './hooks/useLeanBacktest';
import { DataConfigView } from './features/data-config/DataConfigView';
import { LuminaShell } from './components/lumina/LuminaShell';
import { LuminaDocumentationView } from './features/docs/LuminaDocumentationView';
import { LuminaRepositoriesView } from './features/docs/LuminaRepositoriesView';
import { TradingChartView } from './features/chart/TradingChartView';
import { LuminaStrategyEditorView } from './features/strategy-lab/LuminaStrategyEditorView';
import { LuminaDashboardView } from './features/dashboard/LuminaDashboardView';
import { useIndicatorHotReload } from './hooks/indicators/useIndicatorHotReload';
import { useStrategyHotReload } from './hooks/strategies/useStrategyHotReload';

const TIMEFRAME_ORDER = [
  'S1',
  'S5',
  'S10',
  'S30',
  'M1',
  'M2',
  'M5',
  'M10',
  'M15',
  'M30',
  'M45',
  'H1',
  'H2',
  'H3',
  'H4',
  'H8',
  'H12',
  'D1',
  'D7',
  'D30',
  'D90',
  'D180',
  'D365',
];

const timeframeWeight = (code: string) => {
  const upper = String(code || '').toUpperCase();
  const idx = TIMEFRAME_ORDER.indexOf(upper);
  if (idx !== -1) return idx;
  // Unknown timeframes go to the end, ordered lexicograficamente.
  return TIMEFRAME_ORDER.length + upper.charCodeAt(0);
};

const AppContent: React.FC = () => {
  const {
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
    debugMode,
    setDebugMode,
    setDatasetRanges,
  } = useAppState();
  const marketData = useIncrementalMarketData();
  const {
    data: candles,
    loading: marketLoading,
    ingesting: marketIngesting,
    error: marketError,
    loadData,
    cancelCurrentLoad,
  } = marketData;
  const indicators = useIndicators(candles);
  const strategies = useStrategies();
  const normalization = useNormalizationSettings(activeSymbol);
  const availableFrames = useAvailableFrames(activeSymbol);
  const { backtestResult, runSimulation, setExternalResult } = useBacktest();
  const leanBacktest = useLeanBacktest((result) => {
    setExternalResult(result);
    setActiveView(ViewState.ANALYSIS);
  });
  const [workspaceDirty, setWorkspaceDirty] = useState(false);
  const addToast = useToast();
  const repoStatus: 'disconnected' | 'syncing' | 'synced' | 'error' = 'synced';
  const hotReloadEnabled = activeView === ViewState.STRATEGY;
  const hotReloadStartupDelay = 1200;

  useIndicatorHotReload({
    indicators: indicators.indicators,
    refreshFromDisk: indicators.refreshFromDisk,
    onHotReload: (indicator) => {
      const name = indicator.name || indicator.id;
      addToast(`Indicator "${name}" was reloaded from disk.`, 'success');
    },
    enabled: hotReloadEnabled,
    startupDelayMs: hotReloadStartupDelay,
    intervalMs: 2000,
  });

  useStrategyHotReload({
    strategies: strategies.strategies,
    refreshFromDisk: strategies.refreshFromDisk,
    onHotReload: (strategy) => {
      const name = strategy.name || strategy.id;
      addToast(`Strategy "${name}" was reloaded from disk.`, 'success');
    },
    enabled: hotReloadEnabled,
    startupDelayMs: hotReloadStartupDelay,
    intervalMs: 2000,
  });

  useEffect(() => {
    let cancelled = false;
    const loadTimeframes = async () => {
      try {
        const coverage = await apiClient.getDatasetCoverage();
        if (cancelled) return;
        const assets = Array.isArray((coverage as any)?.assets) ? (coverage as any).assets : coverage || [];
        const normalizedDatasets = (assets || []).map(
          (entry: {
            asset: string;
            timeframes?: string[];
            ranges?: Record<string, { start?: string; end?: string; count?: number }>;
          }) => {
            const asset = String(entry.asset || '').toUpperCase();
            const timeframes = Array.isArray(entry.timeframes)
              ? Array.from(new Set(entry.timeframes.map((tf) => String(tf).toUpperCase())))
              : [];
            const ranges = entry.ranges || {};
            return { asset, timeframes, ranges };
          }
        );
        const normalizedAssets = normalizedDatasets.filter((item) => item.asset).map((item) => item.asset);
        setDownloadedAssets(normalizedAssets);
        normalizedDatasets.forEach((dataset) => {
          if (dataset.asset && dataset.timeframes.length) {
            setAvailableTimeframes(dataset.asset, dataset.timeframes);
          }
          if (dataset.asset && dataset.ranges) {
            setDatasetRanges(dataset.asset, dataset.ranges);
          }
        });
      } catch (error) {
        console.warn('[app] Failed to load available timeframes', error);
      }
    };
    loadTimeframes();
    return () => {
      cancelled = true;
    };
  }, [setAvailableTimeframes, setDownloadedAssets, setDatasetRanges]);

  const backendFrames = availableFrames.frames || [];
  const symbolTimeframes =
    (availableTimeframes[activeSymbol] && availableTimeframes[activeSymbol].length
      ? availableTimeframes[activeSymbol]
      : backendFrames.length
        ? backendFrames
        : AVAILABLE_TIMEFRAMES) || AVAILABLE_TIMEFRAMES;

  const sortedSymbolTimeframes = [...symbolTimeframes].sort(
    (a, b) => timeframeWeight(a) - timeframeWeight(b)
  );

  const pinnedTimeframes = selectedTimeframes.filter((tf) =>
    sortedSymbolTimeframes.includes(tf)
  );
  const chartTimeframes = (pinnedTimeframes.length ? pinnedTimeframes : sortedSymbolTimeframes).slice();
  chartTimeframes.sort((a, b) => timeframeWeight(a) - timeframeWeight(b));

  useEffect(() => {
    if (!sortedSymbolTimeframes.includes(activeTimeframe)) {
      const fallback = sortedSymbolTimeframes[0] ?? AVAILABLE_TIMEFRAMES[0];
      setActiveTimeframe(fallback);
    }
  }, [sortedSymbolTimeframes, activeTimeframe, setActiveTimeframe]);

  // Sync normalization timezone with chart timezone
  useEffect(() => {
    setChartTimezone(normalization.normTimezone);
  }, [normalization.normTimezone, setChartTimezone]);

  useEffect(() => {
    if (activeView !== ViewState.CHART) {
      // Quando o chart nao esta visivel, evitamos carregar dados de mercado
      // para reduzir custo de inicializacao; qualquer carga em andamento
      // e cancelada ao sair da view.
      cancelCurrentLoad();
      return;
    }
    loadData({ asset: activeSymbol, timeframe: activeTimeframe });
    return () => cancelCurrentLoad();
  }, [activeSymbol, activeTimeframe, activeView, loadData, cancelCurrentLoad]);

  useEffect(() => {
    if (activeView !== ViewState.CHART) return;
    const symbol = String(activeSymbol || '').toUpperCase();
    if (!symbol) return;

    const coreFrames = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'];
    const targets = coreFrames.filter((tf) => tf !== activeTimeframe.toUpperCase()).slice(0, 3);
    if (!targets.length) return;

    const timer = window.setTimeout(() => {
      targets.forEach((tf) => {
        void prefetchMarketWindow(symbol, tf);
      });
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeSymbol, activeTimeframe, activeView]);

  const handleRunBacktest = () => {
    runSimulation(candles);
    setActiveView(ViewState.ANALYSIS);
  };

  const handleRunLeanBacktest = async (codeOverride?: string) => {
    if (!strategies.activeStrategy) {
      addToast('No strategy loaded to run on Lean.', 'error');
      return;
    }
    try {
      await leanBacktest.runLeanBacktest({
        asset: activeSymbol,
        timeframe: activeTimeframe,
        code: codeOverride ?? strategies.activeStrategy.code,
        cash: leanBacktest.params.cash,
        feeBps: leanBacktest.params.feeBps,
        slippageBps: leanBacktest.params.slippageBps,
      });
      addToast('Lean backtest started. Monitor logs for progress.', 'info');
    } catch (error) {
      addToast('Failed to start Lean backtest.', 'error');
      console.warn('[lean] start failed', error);
    }
  };

  const gapAdjustedData = useMemo(
    () =>
      applyGapQuantization(candles, {
        enabled: normalization.gapQuantEnabled,
      }),
    [candles, normalization.gapQuantEnabled]
  );

  const renderView = () => {
    switch (activeView) {
      case ViewState.DASHBOARD:
        return <LuminaDashboardView />;
      case ViewState.CHART:
        return (
          <TradingChartView
            data={gapAdjustedData}
            backtestResult={backtestResult}
            indicators={indicators.indicators}
            indicatorData={indicators.indicatorData}
            indicatorOverlays={indicators.indicatorOverlays}
            indicatorOrder={indicators.indicatorOrder}
            indicatorSettings={indicators.indicatorSettings}
            activeSymbol={activeSymbol}
            onSymbolChange={setActiveSymbol}
            activeTimeframe={activeTimeframe}
            onTimeframeChange={setActiveTimeframe}
            onToggleIndicator={indicators.toggleActiveIndicator}
            onToggleVisibility={indicators.toggleVisibility}
            onRefreshIndicator={indicators.refreshFromDisk}
            onUpdateIndicatorSettings={indicators.updateIndicatorSettings}
            onResetIndicatorSettings={indicators.resetIndicatorSettings}
            timeframes={chartTimeframes}
            allTimeframes={sortedSymbolTimeframes}
            pinnedTimeframes={selectedTimeframes}
            onPinnedChange={setSelectedTimeframes}
            chartTimezone={chartTimezone}
            availableAssets={downloadedAssets}
            chartAppearance={chartAppearance}
            onAppearanceChange={setChartAppearance}
            loading={marketLoading}
            ingesting={marketIngesting}
            error={marketError}
            onCancelLoad={cancelCurrentLoad}
          />
        );
      case ViewState.DATA_NORMALIZATION:
        return (
          <DataConfigView
            normTimezone={normalization.normTimezone}
            setNormTimezone={normalization.setNormTimezone}
            gapQuantEnabled={normalization.gapQuantEnabled}
            setGapQuantEnabled={normalization.setGapQuantEnabled}
            onSave={normalization.persistSettings}
            isSaving={normalization.isSaving}
          />
        );
      case ViewState.STRATEGY:
        return (
          <LuminaStrategyEditorView
            strategiesAdapter={{
              strategies: strategies.strategies,
              activeStrategy: strategies.activeStrategy,
              selectedId: strategies.selectedId,
              setSelectedId: strategies.setSelectedId,
              saveStrategy: strategies.saveStrategy,
              createStrategy: strategies.createStrategy,
              importStrategy: strategies.importStrategy,
              deleteStrategy: strategies.deleteStrategy,
              updateStrategyPath: strategies.updateStrategyPath,
            }}
            indicatorsAdapter={{
              indicators: indicators.indicators,
              activeIndicator: indicators.activeIndicator,
              selectedIndicatorId: indicators.selectedIndicatorId,
              setSelectedIndicatorId: indicators.setSelectedIndicatorId,
              createIndicator: indicators.createIndicator,
              deleteIndicator: indicators.deleteIndicator,
              saveIndicator: indicators.saveIndicator,
              renameIndicator: indicators.renameIndicator,
              toggleActiveIndicator: indicators.toggleActiveIndicator,
              setIndicatorActive: indicators.setIndicatorActive,
              refreshFromDisk: indicators.refreshFromDisk,
            }}
            onRunLean={handleRunLeanBacktest}
            leanStatus={leanBacktest.status}
            leanLogs={leanBacktest.logs}
            leanErrorMeta={leanBacktest.errorMeta}
            onWorkspaceDirtyChange={setWorkspaceDirty}
          />
        );
      case ViewState.ANALYSIS:
        return <AnalysisView backtestResult={backtestResult} activeSymbol={activeSymbol} onRunBacktest={handleRunBacktest} />;
      case ViewState.API_DOCS:
        return <LuminaDocumentationView />;
      case ViewState.REPOSITORY:
        return <LuminaRepositoriesView />;
      case ViewState.DEBUG:
        return <DebugView />;
      default:
        return null;
    }
  };

  return (
    <LuminaShell
      activeView={activeView}
      onChangeView={setActiveView}
      repoStatus={repoStatus}
      licenseMode={license.mode}
      debugMode={debugMode}
      onToggleDebugMode={() => {
        if (license.mode !== 'internal') return;
        const next = !debugMode;
        setDebugMode(next);
        if (next) {
          setActiveView(ViewState.DEBUG);
        } else if (activeView === ViewState.DEBUG) {
          setActiveView(ViewState.CHART);
        }
      }}
      onRestart={async () => {
        if (workspaceDirty) {
          addToast('You have unsaved changes in Strategy Lab. Save them before restarting.', 'error');
          return;
        }
        const confirmed = window.confirm('Restart The Lab and restore your current workspace?');
        if (!confirmed) return;
        try {
          await apiClient.debugTerminal('restart-app');
        } catch {
          // ignore logging failures
        }
        addToast('Restarting The Lab...', 'info');
        window.setTimeout(() => {
          window.location.reload();
        }, 400);
      }}
    >
      {renderView()}
    </LuminaShell>
  );
};

const App: React.FC = () => (
  <AppStateProvider>
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  </AppStateProvider>
);

export default App;
