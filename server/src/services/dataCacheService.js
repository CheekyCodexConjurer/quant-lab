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
    const base = file.replace('.json', '');
    const parts = base.split('-');
    if (parts.length < 2) return;

    const assetPart = parts[0];
    const timeframePart = parts[1];
    if (!assetPart || !timeframePart) return;

    const assetKey = assetPart; // manter em minúsculas para compatibilidade com rotas /api/data
    const timeframeCode = timeframePart.toUpperCase();

    if (!metadata[assetKey]) {
      metadata[assetKey] = { timeframes: new Set(), ranges: {} };
    }

    metadata[assetKey].timeframes.add(timeframeCode);

    const filePath = path.join(DATA_DIR, file);
    try {
      const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const range = json && json.range;
      const candles = Array.isArray(json && json.candles) ? json.candles : [];

      const isMeta = parts[2] === 'meta';

      if (isMeta && range && range.start && range.end) {
        metadata[assetKey].ranges[timeframeCode] = {
          start: range.start,
          end: range.end,
          count: json.totalCount || candles.length || 0,
        };
        return;
      }

      if (range && range.start && range.end) {
        const existing = metadata[assetKey].ranges[timeframeCode];
        const count = candles.length || 0;
        if (!existing) {
          metadata[assetKey].ranges[timeframeCode] = {
            start: range.start,
            end: range.end,
            count,
          };
        } else {
          const start = existing.start && existing.start < range.start ? existing.start : range.start;
          const end = existing.end && existing.end > range.end ? existing.end : range.end;
          metadata[assetKey].ranges[timeframeCode] = {
            start,
            end,
            count: (existing.count || 0) + count,
          };
        }
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

  const lowerAsset = asset.toLowerCase();
  const lowerTf = timeframe.toLowerCase();
  const base = `${lowerAsset}-${lowerTf}`;

  // Preferir segmentos + meta, se existirem.
  const metaPath = path.join(DATA_DIR, `${base}-meta.json`);
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      const segments = Array.isArray(meta.segments) ? meta.segments : [];
      const all = [];
      let start = null;
      let end = null;

      segments
        .slice()
        .sort((a, b) => {
          const ta = new Date(a.start || 0).getTime();
          const tb = new Date(b.start || 0).getTime();
          return ta - tb;
        })
        .forEach((segment) => {
          const filename = segment.file || `${base}-${segment.segment}.json`;
          const filepath = path.join(DATA_DIR, filename);
          if (!fs.existsSync(filepath)) return;
          try {
            const json = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
            const candles = Array.isArray(json && json.candles) ? json.candles : [];
            candles.forEach((candle) => {
              all.push(candle);
              if (candle.time) {
                const d = new Date(candle.time);
                if (!Number.isNaN(d.getTime())) {
                  const iso = d.toISOString();
                  if (!start || iso < start) start = iso;
                  if (!end || iso > end) end = iso;
                }
              }
            });
          } catch (error) {
            console.error('[dataCache] failed to parse segment file', filepath, error);
          }
        });

      if (!all.length) {
        return null;
      }

      return {
        asset,
        timeframe,
        range: start && end ? { start, end } : meta.range || {},
        candles: all,
        lastUpdated: meta.lastUpdated,
      };
    } catch (error) {
      console.error('[dataCache] failed to parse meta file', metaPath, error);
    }
  }

  // Fallback para formato legado { asset, timeframe, range, candles }
  const filename = `${base}.json`;
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

