const path = require('path');
const { DATA_DIR } = require('./paths');
const { writeJson } = require('./dataUtils');

// Limite de segurança para evitar JSONs gigantes que estouram o tamanho máximo de string do Node.
// ~1M candles de M1 já cobrem alguns anos de histórico e mantêm o arquivo em tamanho razoável.
const MAX_CANDLES_PER_FILE = 1_000_000;

const writeCandlesToDisk = (asset, timeframe, candles, range) => {
  const filepath = path.join(DATA_DIR, `${asset.toLowerCase()}-${timeframe.toLowerCase()}.json`);
  const allCandles = Array.isArray(candles) ? candles : [];
  let sliced = allCandles;
  let fromIso = range.fromIso;

  if (allCandles.length > MAX_CANDLES_PER_FILE) {
    sliced = allCandles.slice(allCandles.length - MAX_CANDLES_PER_FILE);
    const first = sliced[0];
    if (first && first.time) {
      fromIso = first.time;
    }
  }

  const payload = {
    asset,
    timeframe,
    range: { start: fromIso, end: range.toIso },
    candles: sliced,
    lastUpdated: new Date().toISOString(),
  };
  writeJson(filepath, payload);
};

module.exports = { writeCandlesToDisk };
