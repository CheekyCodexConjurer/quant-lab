const fs = require('fs');
const path = require('path');
const { INDICATORS_DIR } = require('../constants/paths');
const { getIndicatorActive, setIndicatorActive, removeIndicator } = require('./indicatorStateStore');

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

const prettifyName = (id) => id.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const normalizeRelativePath = (value) => {
  const normalized = path.normalize(String(value || '')).replace(/\\/g, '/');
  const trimmed = normalized.replace(/^(\.\.\/)+/, '').replace(/^\//, '').replace(/\/+$/, '');
  return trimmed;
};

const stripIndicatorsRoot = (relativePath) => {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized) return '';
  const lower = normalized.toLowerCase();
  const prefix = 'indicators/';
  if (lower === 'indicators') return normalized;
  return lower.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
};

const resolveRelPath = (rawPath) => {
  const normalized = normalizeRelativePath(rawPath);
  const stripped = stripIndicatorsRoot(normalized);
  const rel = stripped || normalized;
  const relPath = rel.endsWith('.py') ? rel : `${rel}.py`;
  const legacyPath = normalized.endsWith('.py') ? normalized : `${normalized}.py`;
  return {
    relPath,
    legacyRelPath: legacyPath,
    canonicalFullPath: path.join(INDICATORS_DIR, relPath),
    legacyFullPath: path.join(INDICATORS_DIR, legacyPath),
  };
};

const encodeId = (relativePath) => normalizeRelativePath(relativePath).replace(/\//g, '__') || 'indicator';
const decodeId = (id) => normalizeRelativePath(String(id || '').replace(/__+/g, '/'));

const ensureDirFor = (relativePath) => {
  const rel = stripIndicatorsRoot(relativePath);
  const safeRel = rel || relativePath;
  const dirName = path.dirname(safeRel);
  const folder = dirName === '.' ? '' : dirName;
  const fullDir = path.join(INDICATORS_DIR, folder);
  if (!fs.existsSync(fullDir)) {
    fs.mkdirSync(fullDir, { recursive: true });
  }
  return fullDir;
};

const toMeta = (filePath, relPath) => {
  const stat = fs.statSync(filePath);
  const id = encodeId(relPath);
  const name = path.basename(relPath, path.extname(relPath));
  return {
    id,
    name: prettifyName(name),
    filePath,
    lastModified: stat.mtimeMs,
    sizeBytes: stat.size,
    active: getIndicatorActive(id) || false,
  };
};

const listIndicators = () => {
  ensureDir();
  const results = [];
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.py')) {
        const relPath = path.relative(INDICATORS_DIR, fullPath).replace(/\\/g, '/');
        const { relPath: canonicalRelPath, canonicalFullPath } = resolveRelPath(relPath);
        if (canonicalRelPath !== relPath && !fs.existsSync(canonicalFullPath)) {
          ensureDirFor(canonicalRelPath);
          fs.renameSync(fullPath, canonicalFullPath);
          results.push(toMeta(canonicalFullPath, canonicalRelPath));
        } else {
          results.push(toMeta(fullPath, relPath));
        }
      }
    });
  };
  walk(INDICATORS_DIR);
  return results;
};

const readIndicator = (id) => {
  ensureDir();
  const { canonicalFullPath, legacyFullPath } = resolveRelPath(decodeId(id));
  const targetPath = fs.existsSync(canonicalFullPath)
    ? canonicalFullPath
    : fs.existsSync(legacyFullPath)
      ? legacyFullPath
      : null;
  if (!targetPath) return null;
  const rel = path.relative(INDICATORS_DIR, targetPath).replace(/\\/g, '/');
  const meta = toMeta(targetPath, rel);
  const code = fs.readFileSync(targetPath, 'utf-8');
  return { ...meta, code };
};

const writeIndicator = (id, code, filePathOverride, active) => {
  ensureDir();
  const relPathRaw = filePathOverride ? filePathOverride : decodeId(id);
  const { relPath, canonicalFullPath, legacyFullPath } = resolveRelPath(relPathRaw);
  ensureDirFor(relPath);
  if (legacyFullPath !== canonicalFullPath && fs.existsSync(legacyFullPath) && !fs.existsSync(canonicalFullPath)) {
    fs.renameSync(legacyFullPath, canonicalFullPath);
  }
  fs.writeFileSync(canonicalFullPath, code ?? '', 'utf-8');
  if (typeof active === 'boolean') {
    setIndicatorActive(encodeId(relPath), active);
  }
  return readIndicator(encodeId(relPath));
};

const deleteIndicatorFile = (id) => {
  ensureDir();
  const { canonicalFullPath, legacyFullPath } = resolveRelPath(decodeId(id));
  const targetPath = fs.existsSync(canonicalFullPath)
    ? canonicalFullPath
    : fs.existsSync(legacyFullPath)
      ? legacyFullPath
      : null;
  if (!targetPath) return false;
  fs.unlinkSync(targetPath);
  removeIndicator(id);
  return true;
};

const ensureSeed = () => {
  ensureDir();
  const files = fs.readdirSync(INDICATORS_DIR).filter((file) => file.endsWith('.py'));
  if (files.length > 0) return;
  const seedPath = path.join(INDICATORS_DIR, 'ema_200.py');
  fs.writeFileSync(seedPath, DEFAULT_INDICATOR_CODE, 'utf-8');
};

module.exports = {
  encodeId,
  decodeId,
  listIndicators,
  readIndicator,
  writeIndicator,
  deleteIndicatorFile,
  ensureSeed,
};
