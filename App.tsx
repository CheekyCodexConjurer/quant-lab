
import React, { useEffect, useMemo, useState } from 'react';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { Sidebar } from './components/layout/Sidebar';
import { MainHeader } from './components/layout/MainHeader';
import { useIncrementalMarketData, prefetchMarketWindow } from './hooks/useIncrementalMarketData';
import { useIndicators } from './hooks/useIndicators';
import { useBacktest } from './hooks/useBacktest';
import { useNormalizationSettings } from './hooks/useNormalizationSettings';
import { AVAILABLE_TIMEFRAMES } from './constants/markets';
import { ChartView } from './views/ChartView';
import { DataNormalizationView } from './views/DataNormalizationView';
import { StrategyView } from './views/StrategyView';
import { AnalysisView } from './views/AnalysisView';
import { ApiDocsView } from './views/ApiDocsView';
import { RepositoryView } from './views/RepositoryView';
import { DebugView } from './views/DebugView';
import { ViewState } from './types';
import { apiClient } from './services/api/client';
import { applyGapQuantization } from './utils/gapQuantization';
import { useStrategies } from './hooks/useStrategies';
import { ToastProvider } from './components/common/Toast';
import { useToast } from './components/common/Toast';
import { useAvailableFrames } from './hooks/useAvailableFrames';
import { useLeanBacktest } from './hooks/useLeanBacktest';

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
  const addToast = useToast();
  const repoStatus: 'disconnected' | 'syncing' | 'synced' | 'error' = 'synced';

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
    loadData({ asset: activeSymbol, timeframe: activeTimeframe });
    return () => cancelCurrentLoad();
  }, [activeSymbol, activeTimeframe, loadData, cancelCurrentLoad]);

  useEffect(() => {
    const symbol = String(activeSymbol || '').toUpperCase();
    if (!symbol) return;

    const coreFrames = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'];
    coreFrames
      .filter((tf) => tf !== activeTimeframe.toUpperCase())
      .forEach((tf) => {
        void prefetchMarketWindow(symbol, tf);
      });
  }, [activeSymbol, activeTimeframe]);

  const handleRunBacktest = () => {
    runSimulation(candles);
    setActiveView(ViewState.ANALYSIS);
  };

  const handleRunLeanBacktest = async () => {
    if (!strategies.activeStrategy) {
      addToast('No strategy loaded to run on Lean.', 'error');
      return;
    }
    try {
      await leanBacktest.runLeanBacktest({
        asset: activeSymbol,
        timeframe: activeTimeframe,
        code: strategies.activeStrategy.code,
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
      case ViewState.CHART:
        return (
          <ChartView
            data={gapAdjustedData}
            backtestResult={backtestResult}
            indicators={indicators.indicators}
            indicatorData={indicators.indicatorData}
            indicatorOverlays={indicators.indicatorOverlays}
            indicatorOrder={indicators.indicatorOrder}
            activeSymbol={activeSymbol}
            onSymbolChange={setActiveSymbol}
            activeTimeframe={activeTimeframe}
            onTimeframeChange={setActiveTimeframe}
            onToggleIndicator={indicators.toggleActiveIndicator}
            onToggleVisibility={indicators.toggleVisibility}
            onRefreshIndicator={indicators.refreshFromDisk}
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
          <DataNormalizationView
            normTimezone={normalization.normTimezone}
            setNormTimezone={normalization.setNormTimezone}
            normBasis={normalization.normBasis}
            setNormBasis={normalization.setNormBasis}
            normTickSize={normalization.normTickSize}
            setTickFromPreset={normalization.setTickFromPreset}
            overrideTickSize={normalization.overrideTickSize}
            isCustomTick={normalization.isCustomTick}
            gapQuantEnabled={normalization.gapQuantEnabled}
            setGapQuantEnabled={normalization.setGapQuantEnabled}
            onSave={normalization.persistSettings}
            isSaving={normalization.isSaving}
            activeSymbol={activeSymbol}
            onChangeSymbol={setActiveSymbol}
          />
        );
      case ViewState.STRATEGY:
        return (
          <StrategyView
            onRunLeanBacktest={handleRunLeanBacktest}
            onNavigateToChart={() => setActiveView(ViewState.CHART)}
            strategies={strategies.strategies}
            strategyOrder={strategies.strategyOrder}
            setStrategyOrder={strategies.setStrategyOrder}
            selectedStrategyId={strategies.selectedId}
            setSelectedStrategyId={strategies.setSelectedId}
            activeStrategy={strategies.activeStrategy}
            createStrategy={strategies.createStrategy}
            importStrategy={strategies.importStrategy}
            deleteStrategy={strategies.deleteStrategy}
            refreshFromDisk={(id) => strategies.refreshFromDisk(id)}
            saveStrategy={(id, code) => strategies.saveStrategy(id, code)}
            updateStrategyPath={strategies.updateStrategyPath}
            onSave={(code) => strategies.selectedId && strategies.saveStrategy(strategies.selectedId, code)}
            leanStatus={leanBacktest.status}
            leanLogs={leanBacktest.logs}
            leanJobId={leanBacktest.jobId}
            leanError={leanBacktest.error}
          leanParams={leanBacktest.params}
          onLeanParamsChange={(next) => leanBacktest.setParams(next)}
          indicators={indicators.indicators}
          indicatorOrder={indicators.indicatorOrder}
          setIndicatorOrder={indicators.setIndicatorOrder}
            indicatorFolders={indicators.indicatorFolders}
          addIndicatorFolder={indicators.addIndicatorFolder}
          removeIndicatorFolder={indicators.removeIndicatorFolder}
          selectedIndicatorId={indicators.selectedIndicatorId}
          setSelectedIndicatorId={indicators.setSelectedIndicatorId}
          activeIndicator={indicators.activeIndicator}
          createIndicator={indicators.createIndicator}
            deleteIndicator={indicators.deleteIndicator}
            saveIndicator={indicators.saveIndicator}
            toggleActiveIndicator={indicators.toggleActiveIndicator}
            refreshIndicatorFromDisk={indicators.refreshFromDisk}
            renameIndicator={indicators.renameIndicator}
            updateIndicatorName={indicators.updateIndicatorName}
            indicatorErrorDetails={indicators.indicatorErrorDetails}
            leanErrorMeta={leanBacktest.errorMeta}
          />
        );
      case ViewState.ANALYSIS:
        return <AnalysisView backtestResult={backtestResult} activeSymbol={activeSymbol} onRunBacktest={handleRunBacktest} />;
      case ViewState.API_DOCS:
        return <ApiDocsView />;
      case ViewState.REPOSITORY:
        return <RepositoryView />;
      case ViewState.DEBUG:
        return <DebugView />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#fafafa] text-slate-900 font-sans">
      <Sidebar activeView={activeView} onChange={setActiveView} debugMode={debugMode} />
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#fafafa] min-h-0">
        <MainHeader
          activeView={activeView}
          activeSymbol={activeSymbol}
          activeTimeframe={activeTimeframe}
          repoStatus={repoStatus}
          onRunBacktest={handleRunBacktest}
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
        />
        <div className="flex-1 px-10 py-8 overflow-y-auto min-h-0">
          <div
            className={`${[ViewState.CHART, ViewState.STRATEGY].includes(activeView) ? 'h-full' : 'min-h-full'
              } flex`}
          >
            {renderView()}
          </div>
        </div>
      </main>
    </div>
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
