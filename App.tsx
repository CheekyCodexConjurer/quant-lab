
import React, { useState } from 'react';
import { AppStateProvider, useAppState } from './context/AppStateContext';
import { Sidebar } from './components/layout/Sidebar';
import { MainHeader } from './components/layout/MainHeader';
import { useMarketData } from './hooks/useMarketData';
import { useIndicators } from './hooks/useIndicators';
import { useBacktest } from './hooks/useBacktest';
import { useRepoSync } from './hooks/useRepoSync';
import { useNormalizationSettings } from './hooks/useNormalizationSettings';
import { ChartView } from './views/ChartView';
import { IndicatorView } from './views/IndicatorView';
import { DataSourcesView } from './views/DataSourcesView';
import { DataNormalizationView } from './views/DataNormalizationView';
import { StrategyView } from './views/StrategyView';
import { AnalysisView } from './views/AnalysisView';
import { ApiDocsView } from './views/ApiDocsView';
import { ViewState } from './types';

const AppContent: React.FC = () => {
  const { activeView, setActiveView, activeSymbol, setActiveSymbol, activeTimeframe, setActiveTimeframe } = useAppState();
  const { data, refreshData } = useMarketData(activeSymbol, activeTimeframe);
  const indicators = useIndicators(data);
  const normalization = useNormalizationSettings(activeSymbol);
  const { backtestResult, runSimulation } = useBacktest();
  const [selectedMarket, setSelectedMarket] = useState('Energy Commodities');
  const [startDate, setStartDate] = useState('(Oldest Data)');
  const [endDate, setEndDate] = useState('Present');
  const repoSync = useRepoSync(
    refreshData,
    activeSymbol,
    activeTimeframe,
    selectedMarket,
    startDate,
    endDate,
    normalization.normTickSize
  );

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
            repoStatus={repoSync.repoStatus}
            onRepoSync={repoSync.handleRepoSync}
            onDukascopyFetch={repoSync.handleDukascopyFetch}
            onCustomImport={repoSync.handleCustomImport}
            syncLogs={repoSync.syncLogs}
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
          repoStatus={repoSync.repoStatus}
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
