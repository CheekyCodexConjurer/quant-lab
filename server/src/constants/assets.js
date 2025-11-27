const ASSET_SOURCES = {
  'CL1!': { instrument: 'lightcmdusd', label: 'Light Crude Oil', type: 'future' },
  'NG1!': { instrument: 'gascmdusd', label: 'Natural Gas', type: 'future' },
  'GC1!': { instrument: 'xauusd', label: 'Gold', type: 'future' },
  'SI1!': { instrument: 'xagusd', label: 'Silver', type: 'future' },
  'HG1!': { instrument: 'coppercmdusd', label: 'High Grade Copper', type: 'future' },
  'ES1!': { instrument: 'usa500idxusd', label: 'S&P 500', type: 'future' },
  'NQ1!': { instrument: 'usatechidxusd', label: 'Nasdaq 100', type: 'future' },
  'ZC1!': { instrument: 'corncmdusd', label: 'Corn', type: 'future' },
  'ZS1!': { instrument: 'soybeancmdusx', label: 'Soybean', type: 'future' },
  'BTC1!': { instrument: 'btcusd', label: 'Bitcoin', type: 'spot' },
  'ETH1!': { instrument: 'ethusd', label: 'Ethereum', type: 'spot' },
};

module.exports = {
  ASSET_SOURCES,
};
