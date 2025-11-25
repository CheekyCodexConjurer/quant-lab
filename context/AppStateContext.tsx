import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ViewState } from '../types';

type AppState = {
  activeView: ViewState;
  setActiveView: (view: ViewState) => void;
  activeSymbol: string;
  setActiveSymbol: (symbol: string) => void;
  activeTimeframe: string;
  setActiveTimeframe: (timeframe: string) => void;
};

const AppStateContext = createContext<AppState | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [activeView, setActiveView] = useState<ViewState>(ViewState.CHART);
  const [activeSymbol, setActiveSymbol] = useState('CL1!');
  const [activeTimeframe, setActiveTimeframe] = useState('H1');

  return (
    <AppStateContext.Provider
      value={{ activeView, setActiveView, activeSymbol, setActiveSymbol, activeTimeframe, setActiveTimeframe }}
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
