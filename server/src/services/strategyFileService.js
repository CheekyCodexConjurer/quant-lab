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
  const relPathRaw = filePathOverride ? normalizeRelativePath(filePathOverride) : decodeId(id);
  const relPath = relPathRaw.endsWith('.py') ? relPathRaw : `${relPathRaw}.py`;
  ensureDirFor(relPath);
  const fullPath = path.join(STRATEGIES_DIR, relPath);
  fs.writeFileSync(fullPath, code ?? '', 'utf-8');
  return readStrategy(encodeId(relPath));
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
  ensureSeed,
  deleteStrategy,
};
