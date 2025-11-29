const fs = require('fs');
const path = require('path');
const { DATA_DIR, ensureDir } = require('./dukascopy/paths');
const { listAssets } = require('./dataCacheService');

const COVERAGE_FILE = path.join(DATA_DIR, 'datasets-meta.json');

const safeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const computeGlobalRange = (ranges) => {
  let start = null;
  let end = null;

  Object.values(ranges || {}).forEach((meta) => {
    const s = safeDate(meta && meta.start);
    const e = safeDate(meta && meta.end);
    if (s && (!start || s < start)) start = s;
    if (e && (!end || e > end)) end = e;
  });

  return start && end
    ? {
        start,
        end,
      }
    : {};
};

const buildCoverageSnapshot = () => {
  ensureDir(DATA_DIR);
  const assets = listAssets();

  const snapshot = {
    generatedAt: new Date().toISOString(),
    assets: assets.map((assetEntry) => {
      const ranges = assetEntry.ranges || {};
      const globalRange = computeGlobalRange(ranges);
      return {
        asset: String(assetEntry.asset || '').toUpperCase(),
        timeframes: Array.isArray(assetEntry.timeframes)
          ? Array.from(
              new Set(
                assetEntry.timeframes
                  .map((tf) => String(tf || '').toUpperCase())
                  .filter(Boolean)
              )
            )
          : [],
        ranges,
        globalRange,
      };
    }),
  };

  try {
    fs.writeFileSync(COVERAGE_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
  } catch (error) {
    // Falha em escrever nao deve quebrar o fluxo principal; apenas loga.
    // eslint-disable-next-line no-console
    console.warn('[coverage] failed to write snapshot file', COVERAGE_FILE, error);
  }

  return snapshot;
};

const loadCoverageSnapshot = () => {
  if (!fs.existsSync(COVERAGE_FILE)) return null;
  try {
    const raw = fs.readFileSync(COVERAGE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[coverage] failed to parse snapshot file', COVERAGE_FILE, error);
    return null;
  }
};

const getCoverageSnapshot = ({ rebuild = false } = {}) => {
  if (rebuild) {
    return buildCoverageSnapshot();
  }
  const existing = loadCoverageSnapshot();
  if (existing) return existing;
  return buildCoverageSnapshot();
};

module.exports = {
  COVERAGE_FILE,
  getCoverageSnapshot,
  buildCoverageSnapshot,
};

