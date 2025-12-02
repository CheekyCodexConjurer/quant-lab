import React from 'react';
import { TradingChart } from '../../lumina-edition/components/TradingChart';
import { Candle, BacktestResult, CustomIndicator, IndicatorOverlay, IndicatorSettingsValues } from '../../types';

export interface TradingChartViewProps {
  data: Candle[];
  backtestResult: BacktestResult | null;
  indicators: CustomIndicator[];
  indicatorData: Record<string, { time: string | number; value: number }[]>;
  indicatorOverlays?: Record<string, IndicatorOverlay>;
  indicatorOrder: string[];
  indicatorSettings: Record<string, IndicatorSettingsValues>;
  activeSymbol: string;
  onSymbolChange: (symbol: string) => void;
  activeTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  onToggleIndicator: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onRefreshIndicator: (id: string) => void | Promise<void>;
  onUpdateIndicatorSettings: (id: string, values: IndicatorSettingsValues) => void;
  onResetIndicatorSettings: (id: string) => void;
  timeframes: string[];
  allTimeframes: string[];
  pinnedTimeframes: string[];
  onPinnedChange: (timeframes: string[]) => void;
  chartTimezone: string;
  availableAssets: string[];
}

export const TradingChartView: React.FC<TradingChartViewProps> = (props) => {
  return (
    <TradingChart
      activeSymbol={props.activeSymbol}
      onSymbolChange={props.onSymbolChange}
      activeTimeframe={props.activeTimeframe}
      onTimeframeChange={props.onTimeframeChange}
      timezoneId={props.chartTimezone}
      timeframes={props.timeframes}
      allTimeframes={props.allTimeframes}
      pinnedTimeframes={props.pinnedTimeframes}
      onPinnedChange={props.onPinnedChange}
      candles={props.data}
      trades={props.backtestResult?.trades}
      indicators={props.indicators}
      indicatorData={props.indicatorData}
      indicatorOverlays={props.indicatorOverlays}
      indicatorOrder={props.indicatorOrder}
      indicatorSettings={props.indicatorSettings}
      onToggleIndicator={props.onToggleIndicator}
      onToggleVisibility={props.onToggleVisibility}
      onRefreshIndicator={props.onRefreshIndicator}
      onUpdateIndicatorSettings={props.onUpdateIndicatorSettings}
      onResetIndicatorSettings={props.onResetIndicatorSettings}
    />
  );
};
