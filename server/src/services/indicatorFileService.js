const fs = require('fs');
const path = require('path');
const { INDICATORS_DIR } = require('../constants/paths');

const DEFAULT_INDICATOR_CODE = `import talib
import numpy as np

def calculate(inputs):
    """
    Calculate EMA 200 Indicator
    :param inputs: Dictionary containing 'close', 'open', 'high', 'low' arrays
    :return: Array of indicator values
    """
    close_prices = np.array(inputs['close'])
    ema = talib.EMA(close_prices, timeperiod=200)

    return ema
`;

const ensureDir = () => {
  if (!fs.existsSync(INDICATORS_DIR)) {
    fs.mkdirSync(INDICATORS_DIR, { recursive: true });
  }
};

const normalizeId = (value) => {
  const clean = String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .trim();
  return clean || 'indicator';
};

const prettifyName = (id) => id.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const toMeta = (filePath) => {
  const stat = fs.statSync(filePath);
  const id = path.basename(filePath, path.extname(filePath));
  return {
    id,
    name: prettifyName(id),
    filePath,
    lastModified: stat.mtimeMs,
    sizeBytes: stat.size,
  };
};

const listIndicators = () => {
  ensureDir();
  return fs
    .readdirSync(INDICATORS_DIR)
    .filter((file) => file.endsWith('.py'))
    .map((file) => toMeta(path.join(INDICATORS_DIR, file)));
};

const readIndicator = (id) => {
  ensureDir();
  const safeId = normalizeId(id);
  const filePath = path.join(INDICATORS_DIR, `${safeId}.py`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const meta = toMeta(filePath);
  const code = fs.readFileSync(filePath, 'utf-8');
  return { ...meta, code };
};

const writeIndicator = (id, code) => {
  ensureDir();
  const safeId = normalizeId(id);
  const filePath = path.join(INDICATORS_DIR, `${safeId}.py`);
  fs.writeFileSync(filePath, code ?? '', 'utf-8');
  return readIndicator(safeId);
};

const ensureSeed = () => {
  ensureDir();
  const files = fs.readdirSync(INDICATORS_DIR).filter((file) => file.endsWith('.py'));
  if (files.length > 0) return;
  const seedPath = path.join(INDICATORS_DIR, 'ema_200.py');
  fs.writeFileSync(seedPath, DEFAULT_INDICATOR_CODE, 'utf-8');
};

module.exports = {
  listIndicators,
  readIndicator,
  writeIndicator,
  ensureSeed,
};
