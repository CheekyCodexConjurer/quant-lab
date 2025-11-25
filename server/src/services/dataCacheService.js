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
    const [asset, timeframe] = file.replace('.json', '').split('-');
    if (!asset) return;
    if (!metadata[asset]) metadata[asset] = new Set();
    metadata[asset].add(timeframe);
  });
  return Object.entries(metadata).map(([asset, set]) => ({ asset, label: asset.toUpperCase(), timeframes: Array.from(set).sort() }));
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
  } catch (error) {
    console.error('[dataCache] parse error', error);
    return null;
  }
}

module.exports = {
  listAssets,
  readCandles,
};
