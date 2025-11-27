const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function listAssets() {
  ensureDataDir();
  const files = fs.readdirSync(DATA_DIR).filter((file) => file.endsWith('.json'));
  const metadata = {};

  files.forEach((file) => {
    const [assetPart, timeframePart] = file.replace('.json', '').split('-');
    if (!assetPart) return;
    const assetKey = assetPart; // manter em minúsculas para compatibilidade com rotas /api/data
    const timeframeCode = (timeframePart || '').toUpperCase();

    if (!metadata[assetKey]) {
      metadata[assetKey] = { timeframes: new Set(), ranges: {} };
    }

    metadata[assetKey].timeframes.add(timeframeCode);

    try {
      const filePath = path.join(DATA_DIR, file);
      const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const range = json && json.range;
      const candles = Array.isArray(json && json.candles) ? json.candles : [];
      if (range && range.start && range.end) {
        metadata[assetKey].ranges[timeframeCode] = {
          start: range.start,
          end: range.end,
          count: candles.length,
        };
      }
    } catch (error) {
      console.error('[dataCache] failed to parse dataset file', file, error);
    }
  });

  return Object.entries(metadata).map(([asset, meta]) => ({
    asset,
    timeframes: Array.from(meta.timeframes),
    ranges: meta.ranges,
  }));
}

function readCandles(asset, timeframe) {
  ensureDataDir();
  const filename = `${asset.toLowerCase()}-${timeframe.toLowerCase()}.json`;
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error('[dataCache] failed to parse', err);
    return null;
  }
}

module.exports = {
  listAssets,
  readCandles,
};
