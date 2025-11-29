const { readCandles } = require('./dataCacheService');
const { getWindowFromDb, getSummaryFromDb } = require('./marketStoreSqlite');

const toEpochMs = (value) => {
  if (!value) return null;
  const d = typeof value === 'number' ? new Date(value) : new Date(value);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
};

const buildWindow = (base, fromIndex, toIndex) => {
  const all = Array.isArray(base.candles) ? base.candles : [];
  if (!all.length) return null;

  const start = Math.max(0, fromIndex);
  const end = Math.min(all.length - 1, toIndex);
  if (end < start) return null;

  const slice = all.slice(start, end + 1);
  if (!slice.length) return null;

  const startTime = slice[0].time;
  const endTime = slice[slice.length - 1].time;

  return {
    ...base,
    range: startTime && endTime ? { start: startTime, end: endTime } : base.range || {},
    candles: slice,
  };
};

const getWindow = ({ asset, timeframe, to, limit }) => {
  const fromDb = getWindowFromDb({ asset, timeframe, to, limit });
  if (fromDb) return fromDb;

  const base = readCandles(asset, timeframe);
  if (!base || !Array.isArray(base.candles) || !base.candles.length) return null;

  const all = base.candles;
  const safeLimit = typeof limit === 'number' && limit > 0 ? Math.floor(limit) : all.length;

  let endIndex = all.length - 1;
  const targetEpoch = toEpochMs(to);
  if (targetEpoch !== null) {
    for (let i = all.length - 1; i >= 0; i -= 1) {
      const c = all[i];
      const t = toEpochMs(c.time || c.timestamp);
      if (t !== null && t <= targetEpoch) {
        endIndex = i;
        break;
      }
    }
  }

  const fromIndex = endIndex - (safeLimit - 1);
  return buildWindow(base, fromIndex, endIndex);
};

const getSummary = ({ asset, timeframe }) => {
  const fromDb = getSummaryFromDb({ asset, timeframe });
  if (fromDb) return fromDb;

  const base = readCandles(asset, timeframe);
  if (!base || !Array.isArray(base.candles) || !base.candles.length) return null;
  const candles = base.candles;
  const first = candles[0];
  const last = candles[candles.length - 1];
  const start = first?.time || base.range?.start;
  const end = last?.time || base.range?.end;
  return {
    asset,
    timeframe,
    range: start && end ? { start, end } : base.range || {},
    count: candles.length,
  };
};

module.exports = {
  getWindow,
  getSummary,
};
