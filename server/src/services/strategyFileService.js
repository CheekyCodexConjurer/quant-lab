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

const normalizeId = (value) => {
  const clean = String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .trim();
  return clean || 'strategy';
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

const listStrategies = () => {
  ensureDir();
  return fs
    .readdirSync(STRATEGIES_DIR)
    .filter((file) => file.endsWith('.py'))
    .map((file) => toMeta(path.join(STRATEGIES_DIR, file)));
};

const readStrategy = (id) => {
  ensureDir();
  const safeId = normalizeId(id);
  const filePath = path.join(STRATEGIES_DIR, `${safeId}.py`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const meta = toMeta(filePath);
  const code = fs.readFileSync(filePath, 'utf-8');
  return { ...meta, code };
};

const writeStrategy = (id, code) => {
  ensureDir();
  const safeId = normalizeId(id);
  const filePath = path.join(STRATEGIES_DIR, `${safeId}.py`);
  fs.writeFileSync(filePath, code ?? '', 'utf-8');
  return readStrategy(safeId);
};

const ensureSeed = () => {
  ensureDir();
  const files = fs.readdirSync(STRATEGIES_DIR).filter((file) => file.endsWith('.py'));
  if (files.length > 0) return;
  const seedPath = path.join(STRATEGIES_DIR, 'main.py');
  fs.writeFileSync(seedPath, DEFAULT_STRATEGY_CODE, 'utf-8');
};

module.exports = {
  listStrategies,
  readStrategy,
  writeStrategy,
  ensureSeed,
};
