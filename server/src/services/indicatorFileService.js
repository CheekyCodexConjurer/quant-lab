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
  const parsed = path.parse(filePath);
  const isRootIndicator = !relPath.includes('/');

  let lastModified = stat.mtimeMs;
  let sizeBytes = stat.size;

  // Para indicadores principais (server/indicators/*.py), consideramos tambem
  // os modulos de suporte na pasta do indicador (ex.: market_structure/core.py)
  // ao calcular o lastModified. Isso garante que editar core/structure/etc.
  // invalida a versao usada pelo frontend/cache.
  if (isRootIndicator) {
    const baseName = parsed.name;
    const candidates = [baseName, baseName.replace(/-/g, '_')];
    candidates.forEach((folderName) => {
      const dirPath = path.join(parsed.dir, folderName);
      if (!fs.existsSync(dirPath)) return;
      const dirStat = fs.statSync(dirPath);
      if (!dirStat.isDirectory()) return;

      const stack = [dirPath];
      while (stack.length) {
        const currentDir = stack.pop();
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        entries.forEach((entry) => {
          const full = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            stack.push(full);
            return;
          }
          if (!entry.isFile() || !entry.name.endsWith('.py')) return;
          const s = fs.statSync(full);
          if (s.mtimeMs > lastModified) {
            lastModified = s.mtimeMs;
          }
          sizeBytes += s.size;
        });
      }
    });
  }

  const id = encodeId(relPath);
  const name = path.basename(relPath, path.extname(relPath));
  return {
    id,
    name: prettifyName(name),
    filePath,
    lastModified,
    sizeBytes,
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
  let finalCode = code;
  if (typeof finalCode !== 'string') {
    const existingPath = fs.existsSync(canonicalFullPath)
      ? canonicalFullPath
      : fs.existsSync(legacyFullPath)
        ? legacyFullPath
        : null;
    if (existingPath && fs.existsSync(existingPath)) {
      finalCode = fs.readFileSync(existingPath, 'utf-8');
    } else {
      finalCode = DEFAULT_INDICATOR_CODE;
    }
  }
  fs.writeFileSync(canonicalFullPath, finalCode ?? '', 'utf-8');
  const encodedId = encodeId(relPath);
  if (typeof active === 'boolean') {
    setIndicatorActive(encodedId, active);
  }
  return readIndicator(encodedId);
};

const renameIndicatorFile = (id, filePathOverride) => {
  ensureDir();
  const decoded = decodeId(id);
  const currentPaths = resolveRelPath(decoded);
  const sourcePath = fs.existsSync(currentPaths.canonicalFullPath)
    ? currentPaths.canonicalFullPath
    : fs.existsSync(currentPaths.legacyFullPath)
      ? currentPaths.legacyFullPath
      : null;
  if (!sourcePath) return null;
  const nextPaths = resolveRelPath(filePathOverride || decoded);
  ensureDirFor(nextPaths.relPath);
  const targetPath = nextPaths.canonicalFullPath;
  if (sourcePath !== targetPath) {
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.renameSync(sourcePath, targetPath);
  }
  const prevId = id;
  const relForMeta = path.relative(INDICATORS_DIR, targetPath).replace(/\\/g, '/');
  const nextId = encodeId(relForMeta);
  const wasActive = getIndicatorActive(prevId);
  if (wasActive) {
    setIndicatorActive(nextId, true);
    if (nextId !== prevId) {
      removeIndicator(prevId);
    }
  }
  return readIndicator(nextId);
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

const listIndicatorWorkspace = () => {
  ensureDir();
  const items = [];

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(INDICATORS_DIR, fullPath).replace(/\\/g, '/');
      const virtualPath = relPath ? `indicators/${relPath}` : 'indicators';
      if (entry.isDirectory()) {
        items.push({ path: virtualPath, type: 'folder' });
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.py')) {
        const isMain = !relPath.includes('/');
        items.push({ path: virtualPath, type: 'file', isMain });
      }
    });
  };

  walk(INDICATORS_DIR);
  return items;
};

module.exports = {
  encodeId,
  decodeId,
  listIndicators,
  readIndicator,
  writeIndicator,
  renameIndicatorFile,
  deleteIndicatorFile,
  ensureSeed,
  listIndicatorWorkspace,
};
