export const AVAILABLE_ASSETS = ['CL1!', 'NG1!', 'GC1!', 'HG1!', 'SI1!', 'ES1!', 'NQ1!', 'ZC1!', 'ZS1!', 'BTC1!', 'ETH1!'];

export const AVAILABLE_TIMEFRAMES = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'];

export const TICK_PRESETS: Record<string, number> = {
  'CL1!': 0.01,
  'NG1!': 0.001,
  'GC1!': 0.1,
  'HG1!': 0.0005,
  'SI1!': 0.005,
  'ES1!': 0.25,
  'NQ1!': 0.25,
  'ZC1!': 0.25,
  'ZS1!': 0.25,
  'BTC1!': 5,
  'ETH1!': 0.1,
};

export type MarketAsset = { label: string; symbol: string; dukaId: string };

export const DUKASCOPY_MARKETS: Record<string, MarketAsset[]> = {
  'Energy Commodities': [
    { label: 'Light Crude Oil', symbol: 'CL1!', dukaId: 'lightcmdusd' },
    { label: 'Natural Gas', symbol: 'NG1!', dukaId: 'ngascmdusd' },
  ],
  'Metals Commodities': [
    { label: 'Gold', symbol: 'GC1!', dukaId: 'xauusd' },
    { label: 'Silver', symbol: 'SI1!', dukaId: 'xagusd' },
    { label: 'High Grade Copper', symbol: 'HG1!', dukaId: 'coppercmdusd' },
  ],
  'Stock Indices': [
    { label: 'S&P 500', symbol: 'ES1!', dukaId: 'usa500idx' },
    { label: 'Nasdaq 100', symbol: 'NQ1!', dukaId: 'usatechidx' },
  ],
  Agricultural: [
    { label: 'Corn', symbol: 'ZC1!', dukaId: 'corncmdusd' },
    { label: 'Soybean', symbol: 'ZS1!', dukaId: 'soybeancmdusd' },
  ],
  'Crypto Assets': [
    { label: 'Bitcoin', symbol: 'BTC1!', dukaId: 'btcusd' },
    { label: 'Ethereum', symbol: 'ETH1!', dukaId: 'ethusd' },
  ],
};
