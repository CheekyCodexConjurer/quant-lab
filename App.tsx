
import React, { useEffect, useState } from 'react';
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
  } = useAppState();
  const { data, refreshData } = useMarketData(activeSymbol, activeTimeframe);
  const indicators = useIndicators(data);
  const normalization = useNormalizationSettings(activeSymbol);
  const { backtestResult, runSimulation } = useBacktest();
  const [selectedMarket, setSelectedMarket] = useState('Energy Commodities');
  const [startDate, setStartDate] = useState('Oldest Data Available');
  const [endDate, setEndDate] = useState('Present');
  const dataImport = useDataImport(activeSymbol, activeTimeframe);
  const repoStatus =
    dataImport.status === 'running'
      ? 'syncing'
      : dataImport.status === 'completed'
      ? 'synced'
      : dataImport.status === 'error'
      ? 'error'
      : 'disconnected';

  useEffect(() => {
    let cancelled = false;
    const loadTimeframes = async () => {
      try {
        const datasets = await apiClient.listDatasets();
        if (cancelled) return;
        const entry = datasets.find((dataset: { asset: string; timeframes?: string[] }) => dataset.asset === activeSymbol);
        if (entry?.timeframes?.length) {
          setAvailableTimeframes(activeSymbol, entry.timeframes);
        }
      } catch (error) {
        console.warn('[app] Failed to load available timeframes', error);
      }
    };
    loadTimeframes();
    return () => {
      cancelled = true;
    };
  }, [activeSymbol, dataImport.status, setAvailableTimeframes]);

  const symbolTimeframes = availableTimeframes[activeSymbol] ?? AVAILABLE_TIMEFRAMES;
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

  const handleRunBacktest = () => {
    runSimulation(data);
    setActiveView(ViewState.ANALYSIS);
  };

  const renderView = () => {
    switch (activeView) {
      case ViewState.CHART:
        return (
          <ChartView
            data={data}
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
            onTimezoneChange={setChartTimezone}
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
            onDukascopyImport={async (range) => {
              await dataImport.importDukascopy(range);
              await refreshData();
            }}
            onCustomImport={async () => {
              await dataImport.importCustom('user_data_import.csv');
              await refreshData();
            }}
            logs={dataImport.logs}
            progress={dataImport.progress}
            activeSymbol={activeSymbol}
            onSymbolChange={setActiveSymbol}
            activeTimeframe={activeTimeframe}
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
            onSave={normalization.persistSettings}
            isSaving={normalization.isSaving}
          />
        );
      case ViewState.STRATEGY:
        return <StrategyView onRunBacktest={handleRunBacktest} onNavigateToChart={() => setActiveView(ViewState.CHART)} />;
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
        <div className="flex-1 px-10 py-8 overflow-y-auto">{renderView()}</div>
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <AppStateProvider>
    <AppContent />
  </AppStateProvider>
);

export default App;
