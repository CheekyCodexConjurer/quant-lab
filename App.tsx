
import React, { useEffect, useMemo, useState } from 'react';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { Sidebar } from './components/layout/Sidebar';
import { MainHeader } from './components/layout/MainHeader';
import { useMarketData } from './hooks/useMarketData';
import { useIndicators } from './hooks/useIndicators';
import { useBacktest } from './hooks/useBacktest';
import { useDataImport } from './hooks/useDataImport';
import { useNormalizationSettings } from './hooks/useNormalizationSettings';
import { AVAILABLE_TIMEFRAMES } from './constants/markets';
import { ChartView } from './views/ChartView';
import { IndicatorView } from './views/IndicatorView';
import { DataSourcesView } from './views/DataSourcesView';
import { DataNormalizationView } from './views/DataNormalizationView';
import { StrategyView } from './views/StrategyView';
import { AnalysisView } from './views/AnalysisView';
import { ApiDocsView } from './views/ApiDocsView';
import { ViewState } from './types';
import { apiClient } from './services/api/client';
import { applyGapQuantization } from './utils/gapQuantization';
import { useStrategies } from './hooks/useStrategies';
import { ToastProvider } from './components/common/Toast';
import { useToast } from './components/common/Toast';
import { useAvailableFrames } from './hooks/useAvailableFrames';

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
  } = useAppState();
  const { data, refreshData } = useMarketData(activeSymbol, activeTimeframe);
  const indicators = useIndicators(data);
  const strategies = useStrategies();
  const normalization = useNormalizationSettings(activeSymbol);
  const availableFrames = useAvailableFrames(activeSymbol);
  const { backtestResult, runSimulation } = useBacktest();
  const [importSymbol, setImportSymbol] = useState(activeSymbol);
  const [importTimeframe, setImportTimeframe] = useState(activeTimeframe);
  const [selectedMarket, setSelectedMarket] = useState('Energy Commodities');
  const [startDate, setStartDate] = useState('Oldest Data Available');
  const [endDate, setEndDate] = useState('Present');
  const dataImport = useDataImport(importSymbol, importTimeframe);
  const addToast = useToast();
  const repoStatus =
    dataImport.status === 'running'
      ? 'syncing'
      : dataImport.status === 'completed'
        ? 'synced'
        : dataImport.status === 'error'
          ? 'error'
          : 'disconnected';

  useEffect(() => {
    if (dataImport.status === 'running') return;
    if (activeView !== ViewState.DATA) return;
    setImportSymbol(activeSymbol);
    setImportTimeframe(activeTimeframe);
  }, [activeSymbol, activeTimeframe, activeView, dataImport.status]);

  useEffect(() => {
    let cancelled = false;
    const loadTimeframes = async () => {
      try {
        const datasets = await apiClient.listDatasets();
        if (cancelled) return;
        const normalizedAssets = datasets.map((dataset: { asset: string }) => dataset.asset);
        setDownloadedAssets(normalizedAssets);
        datasets.forEach((dataset: { asset: string; timeframes?: string[] }) => {
          if (dataset.timeframes?.length) {
            setAvailableTimeframes(dataset.asset, dataset.timeframes);
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
  }, [activeSymbol, dataImport.status, setAvailableTimeframes]);

  const backendFrames = Object.keys(availableFrames.frames || {});
  const symbolTimeframes =
    (availableTimeframes[activeSymbol] && availableTimeframes[activeSymbol].length
      ? availableTimeframes[activeSymbol]
      : backendFrames.length
        ? backendFrames.map((tf) => tf.toUpperCase())
        : AVAILABLE_TIMEFRAMES) || AVAILABLE_TIMEFRAMES;

  const pinnedTimeframes = selectedTimeframes.filter((tf) => symbolTimeframes.includes(tf));
  const chartTimeframes = (pinnedTimeframes.length ? pinnedTimeframes : symbolTimeframes).slice();
  chartTimeframes.sort((a, b) => {
    const order = symbolTimeframes;
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  useEffect(() => {
    if (!symbolTimeframes.includes(activeTimeframe)) {
      const fallback = symbolTimeframes[0] ?? AVAILABLE_TIMEFRAMES[0];
      setActiveTimeframe(fallback);
    }
  }, [symbolTimeframes, activeTimeframe, setActiveTimeframe]);

  // Sync normalization timezone with chart timezone
  useEffect(() => {
    setChartTimezone(normalization.normTimezone);
  }, [normalization.normTimezone, setChartTimezone]);

  const handleRunBacktest = () => {
    runSimulation(data);
    setActiveView(ViewState.ANALYSIS);
  };

  const handleDukascopyImport = async (range: { startDate?: string; endDate?: string; fullHistory?: boolean }) => {
    try {
      await dataImport.importDukascopy(range);
      await refreshData();
      addToast('Import started. Check logs for progress.', 'info');
    } catch (error) {
      addToast('Failed to start Dukascopy import.', 'error');
      console.warn('[import] dukascopy failed', error);
    }
  };

  const handleCustomImport = async () => {
    try {
      await dataImport.importCustom('user_data_import.csv');
      await refreshData();
      addToast('Custom import triggered. Check logs for progress.', 'info');
    } catch (error) {
      addToast('Failed to start custom import.', 'error');
      console.warn('[import] custom failed', error);
    }
  };

  const gapAdjustedData = useMemo(
    () =>
      applyGapQuantization(data, {
        enabled: normalization.gapQuantEnabled,
      }),
    [data, normalization.gapQuantEnabled]
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
            activeSymbol={activeSymbol}
            onSymbolChange={setActiveSymbol}
            activeTimeframe={activeTimeframe}
            onTimeframeChange={setActiveTimeframe}
            onToggleIndicator={indicators.toggleActiveIndicator}
            onToggleVisibility={indicators.toggleVisibility}
            timeframes={chartTimeframes}
            allTimeframes={symbolTimeframes}
            pinnedTimeframes={selectedTimeframes}
            onPinnedChange={setSelectedTimeframes}
            chartTimezone={chartTimezone}
            availableAssets={downloadedAssets}
            chartAppearance={chartAppearance}
            onAppearanceChange={setChartAppearance}
          />
        );
      case ViewState.CHART_INDICATOR:
        return (
          <IndicatorView
            indicators={indicators.indicators}
            selectedIndicatorId={indicators.selectedIndicatorId}
            setSelectedIndicatorId={indicators.setSelectedIndicatorId}
            activeIndicator={indicators.activeIndicator}
            createIndicator={indicators.createIndicator}
            deleteIndicator={indicators.deleteIndicator}
            saveIndicator={indicators.saveIndicator}
            toggleActiveIndicator={indicators.toggleActiveIndicator}
            refreshFromDisk={indicators.refreshFromDisk}
          />
        );
      case ViewState.DATA:
        return (
          <DataSourcesView
            selectedMarket={selectedMarket}
            setSelectedMarket={setSelectedMarket}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            importStatus={dataImport.status}
            onDukascopyImport={handleDukascopyImport}
            onCustomImport={handleCustomImport}
            logs={dataImport.logs}
            progress={dataImport.progress}
            activeSymbol={importSymbol}
            onSymbolChange={setImportSymbol}
            activeTimeframe={importTimeframe}
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
          />
        );
      case ViewState.STRATEGY:
        return (
          <StrategyView
            onRunBacktest={handleRunBacktest}
            onNavigateToChart={() => setActiveView(ViewState.CHART)}
            activeStrategy={strategies.activeStrategy}
            onRefreshFromDisk={() => strategies.selectedId && strategies.refreshFromDisk(strategies.selectedId)}
            onSave={(code) => strategies.selectedId && strategies.saveStrategy(strategies.selectedId, code)}
          />
        );
      case ViewState.ANALYSIS:
        return <AnalysisView backtestResult={backtestResult} activeSymbol={activeSymbol} onRunBacktest={handleRunBacktest} />;
      case ViewState.API_DOCS:
        return <ApiDocsView />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#fafafa] text-slate-900 font-sans">
      <Sidebar activeView={activeView} onChange={setActiveView} />
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#fafafa]">
        <MainHeader
          activeView={activeView}
          activeSymbol={activeSymbol}
          activeTimeframe={activeTimeframe}
          repoStatus={repoStatus}
          onRunBacktest={handleRunBacktest}
        />
        <div className="flex-1 px-10 py-6 overflow-y-auto">{renderView()}</div>
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
