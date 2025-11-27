const path = require('path');
const { DATA_DIR } = require('./paths');
const { writeJson } = require('./dataUtils');

const writeCandlesToDisk = (asset, timeframe, candles, range) => {
  const filepath = path.join(DATA_DIR, `${asset.toLowerCase()}-${timeframe.toLowerCase()}.json`);
  const payload = {
    asset,
    timeframe,
    range: { start: range.fromIso, end: range.toIso },
    candles,
    lastUpdated: new Date().toISOString(),
  };
  writeJson(filepath, payload);
};

module.exports = { writeCandlesToDisk };
