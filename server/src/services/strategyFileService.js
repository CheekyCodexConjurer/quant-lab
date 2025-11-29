const fs = require('fs');
const path = require('path');
const { STRATEGIES_DIR } = require('../constants/paths');

const DEFAULT_STRATEGY_CODE = `import numpy as np

def init(context):
    # Initialize strategy state here
    context.counter = 0


def handle_data(context, data):
    # Example placeholder strategy logic
    context.counter += 1
    return {
        "orders": [],
        "metadata": {"iterations": context.counter}
    }
`;

const ensureDir = () => {
  if (!fs.existsSync(STRATEGIES_DIR)) {
    fs.mkdirSync(STRATEGIES_DIR, { recursive: true });
  }
};

const prettifyName = (id) => id.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const normalizeRelativePath = (value) => {
  const normalized = path.normalize(String(value || '')).replace(/\\/g, '/');
  const trimmed = normalized.replace(/^(\.\.\/)+/, '').replace(/^\//, '').replace(/\/+$/, '');
  return trimmed;
};

const stripStrategiesRoot = (relativePath) => {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized) return '';
  const lower = normalized.toLowerCase();
  const prefix = 'strategies/';
  if (lower === 'strategies') return '';
  return lower.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
};

const encodeId = (relativePath) => normalizeRelativePath(relativePath).replace(/\//g, '__') || 'strategy';
const decodeId = (id) => normalizeRelativePath(String(id || '').replace(/__+/g, '/'));

const ensureDirFor = (relativePath) => {
  const rel = normalizeRelativePath(relativePath);
  const fullDir = path.join(STRATEGIES_DIR, path.dirname(rel));
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
  };
};

const listStrategies = () => {
  ensureDir();
  const results = [];
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.py')) {
        const relPath = path.relative(STRATEGIES_DIR, fullPath).replace(/\\/g, '/');
        results.push(toMeta(fullPath, relPath));
      }
    });
  };
  walk(STRATEGIES_DIR);
  return results;
};

const readStrategy = (id) => {
  ensureDir();
  const relPath = decodeId(id);
  const filePath = path.join(STRATEGIES_DIR, relPath.endsWith('.py') ? relPath : `${relPath}.py`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const meta = toMeta(filePath, path.relative(STRATEGIES_DIR, filePath).replace(/\\/g, '/'));
  const code = fs.readFileSync(filePath, 'utf-8');
  return { ...meta, code };
};

const writeStrategy = (id, code, filePathOverride) => {
  ensureDir();
  const decoded = decodeId(id);
  const currentRelRaw = decoded || '';
  const currentRel = currentRelRaw.endsWith('.py') ? currentRelRaw : `${currentRelRaw}.py`;
  const currentFullPath = path.join(STRATEGIES_DIR, currentRel);

  const targetRaw = filePathOverride ? stripStrategiesRoot(filePathOverride) : currentRelRaw;
  const targetRelBase = targetRaw || currentRel;
  const targetRel = targetRelBase.endsWith('.py') ? targetRelBase : `${targetRelBase}.py`;
  ensureDirFor(targetRel);
  const targetFullPath = path.join(STRATEGIES_DIR, targetRel);

  let finalCode = code;
  if (typeof finalCode !== 'string') {
    const sourcePath = fs.existsSync(currentFullPath)
      ? currentFullPath
      : fs.existsSync(targetFullPath)
        ? targetFullPath
        : null;
    if (sourcePath && fs.existsSync(sourcePath)) {
      finalCode = fs.readFileSync(sourcePath, 'utf-8');
    } else {
      finalCode = DEFAULT_STRATEGY_CODE;
    }
  }

  if (fs.existsSync(currentFullPath) && currentFullPath !== targetFullPath) {
    const targetDir = path.dirname(targetFullPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.renameSync(currentFullPath, targetFullPath);
  }

  fs.writeFileSync(targetFullPath, finalCode ?? '', 'utf-8');
  const relForMeta = path.relative(STRATEGIES_DIR, targetFullPath).replace(/\\/g, '/');
  return readStrategy(encodeId(relForMeta));
};

const renameStrategyFile = (id, nextWorkspacePath) => {
  ensureDir();
  const decoded = decodeId(id);
  const currentRelRaw = decoded || '';
  const currentRel = currentRelRaw.endsWith('.py') ? currentRelRaw : `${currentRelRaw}.py`;
  const currentFullPath = path.join(STRATEGIES_DIR, currentRel);
  if (!fs.existsSync(currentFullPath)) {
    return null;
  }

  const normalizedNext = normalizeRelativePath(nextWorkspacePath || '');
  const strippedNext = stripStrategiesRoot(normalizedNext);
  const nextBase = strippedNext || normalizedNext || path.basename(currentRel);
  const nextRel = nextBase.endsWith('.py') ? nextBase : `${nextBase}.py`;
  const nextFullPath = path.join(STRATEGIES_DIR, nextRel);

  if (currentFullPath !== nextFullPath) {
    const targetDir = path.dirname(nextFullPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.renameSync(currentFullPath, nextFullPath);
  }

  const relForMeta = path.relative(STRATEGIES_DIR, nextFullPath).replace(/\\/g, '/');
  return readStrategy(encodeId(relForMeta));
};

const ensureSeed = () => {
  ensureDir();
  const files = fs.readdirSync(STRATEGIES_DIR).filter((file) => file.endsWith('.py'));
  if (files.length > 0) return;
  const seedPath = path.join(STRATEGIES_DIR, 'main.py');
  fs.writeFileSync(seedPath, DEFAULT_STRATEGY_CODE, 'utf-8');
};

const deleteStrategy = (id) => {
  ensureDir();
  const relPath = decodeId(id);
  const filePath = path.join(STRATEGIES_DIR, relPath.endsWith('.py') ? relPath : `${relPath}.py`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
};

module.exports = {
  encodeId,
  decodeId,
  listStrategies,
  readStrategy,
  writeStrategy,
  renameStrategyFile,
  ensureSeed,
  deleteStrategy,
};
