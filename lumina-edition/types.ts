export enum View {
  DASHBOARD = 'DASHBOARD',
  CHART_VIEW = 'CHART_VIEW',
  STRATEGY_LAB = 'STRATEGY_LAB',
  DATA_CONFIG = 'DATA_CONFIG',
  DOCUMENTATION = 'DOCUMENTATION',
  REPOSITORIES = 'REPOSITORIES'
}

export interface NavItem {
  id: View;
  label: string;
  icon: any; // Lucide icon component type
}

export interface MarketData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}