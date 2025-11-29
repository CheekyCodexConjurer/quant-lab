/* eslint-disable no-console */
// Simple offline importer to bootstrap CL futures data from vendor CSVs
// into the internal JSON + meta format used by dataCacheService.
//
// Expected layout (local only, not committed):
//   server/data/cl-futures/
//     cl-1m.csv   (intraday, base for derived frames)
//     cl-1d.csv
//     cl-1w.csv
//     cl-1mo.csv
//
// This script is idempotent: re-running will overwrite existing CL1! files.

const fs = require('fs');
const path = require('path');
const { DATA_DIR, ensureDir } = require('../src/services/dukascopy/paths');
const { aggregateCandles } = require('../src/services/timeframeBuilder');
const { buildCoverageSnapshot } = require('../src/services/datasetCoverageService');

const CL_DIR = path.join(DATA_DIR, 'cl-futures');
const ASSET_KEY = 'cl1!';

// Vendor timezones (documented offsets)
// - cl-1m.csv  : GMT-6 (CME session / Chicago time)
// - cl-1d.csv  : GMT+1 (daily bars aligned to session close)
// - cl-1w/mo   : GMT+1
const getTimezoneOffsetForFile = (filename) => {
  const lower = String(filename || '').toLowerCase();
  if (lower === 'cl-1m.csv') return '-06:00';
  if (lower === 'cl-1d.csv' || lower === 'cl-1w.csv' || lower === 'cl-1mo.csv') return '+01:00';
  return '+00:00';
};

const parseCsvLine = (line, filename) => {
  if (!line) return null;
  const parts = line.split(';');
  if (parts.length < 6) return null;
  const [dateStr, timeStr, openStr, highStr, lowStr, closeStr, volStr] = parts;
  const normDate = dateStr
    .trim()
    .replace(
      /^(\d{2})\/(\d{2})\/(\d{4})/,
      (_, d, m, y) => `${y}-${m}-${d}`
    );
  const normTime = (timeStr && timeStr.trim()) || '00:00:00';
  const tz = getTimezoneOffsetForFile(filename);
  const isoInput = `${normDate}T${normTime}${tz}`;
  const dt = new Date(isoInput);
  if (Number.isNaN(dt.getTime())) return null;

  const open = Number(openStr);
  const high = Number(highStr);
  const low = Number(lowStr);
  const close = Number(closeStr);
  const volume = Number(volStr || 0);

  if (
    [open, high, low, close].some((v) => Number.isNaN(v)) ||
    Number.isNaN(volume)
  ) {
    return null;
  }

  const iso = dt.toISOString();
  return {
    time: iso,
    timestamp: dt.getTime(),
    open,
    high,
    low,
    close,
    volume,
  };
};

const readCsvCandles = (filename) => {
  const fullPath = path.join(CL_DIR, filename);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing CSV file: ${fullPath}`);
  }
  const raw = fs.readFileSync(fullPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const candles = [];
  lines.forEach((line) => {
    const candle = parseCsvLine(line, filename);
    if (candle) candles.push(candle);
  });
  return candles;
};

const segmentByYear = (candles) => {
  const byYear = new Map();
  candles.forEach((candle) => {
    const d = new Date(candle.time);
    if (Number.isNaN(d.getTime())) return;
    const year = d.getUTCFullYear().toString();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(candle);
  });
  return byYear;
};

const writeSegments = (timeframe, candles) => {
  ensureDir(DATA_DIR);
  const lowerAsset = ASSET_KEY.toLowerCase();
  const tf = timeframe.toLowerCase();
  const byYear = segmentByYear(candles);

  const segmentsMeta = [];
  let globalStart = null;
  let globalEnd = null;
  let totalCount = 0;

  Array.from(byYear.entries())
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([year, yearCandles]) => {
      if (!yearCandles.length) return;
      yearCandles.sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
      );
      const start = yearCandles[0].time;
      const end = yearCandles[yearCandles.length - 1].time;
      const segmentFile = `${lowerAsset}-${tf}-${year}.json`;
      const payload = {
        asset: ASSET_KEY,
        timeframe: tf,
        segment: year,
        range: { start, end },
        candles: yearCandles,
      };
      fs.writeFileSync(
        path.join(DATA_DIR, segmentFile),
        JSON.stringify(payload, null, 2),
        'utf8'
      );

      segmentsMeta.push({
        segment: year,
        file: segmentFile,
        start,
        end,
        count: yearCandles.length,
      });
      totalCount += yearCandles.length;
      if (!globalStart || start < globalStart) globalStart = start;
      if (!globalEnd || end > globalEnd) globalEnd = end;
    });

  const metaPath = path.join(
    DATA_DIR,
    `${lowerAsset}-${tf}-meta.json`
  );
  const meta = {
    asset: ASSET_KEY,
    timeframe: tf,
    range: globalStart && globalEnd ? { start: globalStart, end: globalEnd } : {},
    totalCount,
    segments: segmentsMeta,
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  console.log(
    `[cl-import] wrote ${segmentsMeta.length} segments for ${timeframe} (total=${totalCount})`
  );
};

const buildFromOneMinute = (m1Candles) => {
  // leverage timeframeBuilder.aggregateCandles for intraday frames
  const base = m1Candles.map((c) => ({
    time: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  }));

  const buildTf = (code, minutes) => {
    const aggregated =
      minutes === 1 ? base : aggregateCandles(base, minutes);
    writeSegments(code.toLowerCase(), aggregated);
  };

  buildTf('m1', 1);
  buildTf('m5', 5);
  buildTf('m15', 15);
  buildTf('m30', 30);
  buildTf('h1', 60);
  buildTf('h4', 240);
};

const run = () => {
  console.log('[cl-import] Reading CL-Futures CSVs from', CL_DIR);
  ensureDir(CL_DIR);

  const m1 = readCsvCandles('cl-1m.csv');
  console.log('[cl-import] loaded', m1.length, 'M1 candles');
  buildFromOneMinute(m1);

  // High timeframes come directly from vendor CSVs so we get full history (1980s+).
  try {
    const d1 = readCsvCandles('cl-1d.csv');
    console.log('[cl-import] loaded', d1.length, 'D1 candles from CSV');
    writeSegments('d1', d1);
  } catch (error) {
    console.warn('[cl-import] failed to load cl-1d.csv; D1 will only be available where M1 exists', error);
  }

  ['cl-1w.csv', 'cl-1mo.csv'].forEach((name) => {
    const full = path.join(CL_DIR, name);
    if (!fs.existsSync(full)) {
      console.warn(`[cl-import] HTF file ${name} missing; skipping`);
      return;
    }
    const candles = readCsvCandles(name);
    const tf = name === 'cl-1w.csv' ? 'd7' : 'd30';
    console.log(`[cl-import] loaded ${candles.length} candles from ${name} into ${tf.toUpperCase()}`);
    writeSegments(tf, candles);
  });

  console.log('[cl-import] Done.');

  try {
    console.log('[cl-import] Rebuilding dataset coverage snapshot...');
    buildCoverageSnapshot();
    console.log('[cl-import] Coverage snapshot updated.');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[cl-import] Failed to rebuild coverage snapshot', error);
  }
};

if (require.main === module) {
  run();
}

module.exports = {
  run,
};
