const fs = require('fs');
const path = require('path');
const { readCandles } = require('./dataCacheService');
const { LEAN_DATA_DIR } = require('../constants/paths');

function ensureDir(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

function normalizeTime(value) {
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function exportCandlesToLean(asset, timeframe) {
  const candles = readCandles(asset, timeframe);
  if (!candles || !candles.length) {
    throw new Error(`No cached candles for ${asset} ${timeframe}`);
  }

  ensureDir(LEAN_DATA_DIR);

  const filename = `${asset.toLowerCase()}-${timeframe.toLowerCase()}.csv`;
  const filePath = path.join(LEAN_DATA_DIR, filename);
  const header = 'time,open,high,low,close,volume';
  const lines = candles.map((candle) => {
    const time = normalizeTime(candle.time);
    const open = Number(candle.open || 0);
    const high = Number(candle.high || 0);
    const low = Number(candle.low || 0);
    const close = Number(candle.close || 0);
    const volume = Number(candle.volume || 0);
    return `${time},${open},${high},${low},${close},${volume}`;
  });

  fs.writeFileSync(filePath, [header, ...lines].join('\n'), 'utf-8');

  return {
    filePath,
    candleCount: candles.length,
    filename,
  };
}

module.exports = {
  exportCandlesToLean,
  normalizeTime,
};
