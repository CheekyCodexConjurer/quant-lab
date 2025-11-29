/* eslint-disable no-console */
// Ingest CL futures JSON segments (generated from CSV) into SQLite market.db.
// This script is offline and can be re-run to refresh CL1! data in the DB.

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../src/services/dukascopy/paths');
const { getDb, upsertBars } = require('../src/services/marketStoreSqlite');

const ASSET = 'CL1!';
const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

const findSegmentFiles = (timeframe) => {
  const tf = timeframe.toLowerCase();
  const lowerAsset = ASSET.toLowerCase();
  const prefix = `${lowerAsset}-${tf}-`;
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json') && !name.endsWith('-meta.json'));
  return files.map((name) => path.join(DATA_DIR, name));
};

const loadCandlesFromFile = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(raw);
  const candles = Array.isArray(json?.candles) ? json.candles : [];
  return candles;
};

const ingestTimeframe = (timeframe) => {
  const db = getDb();
  if (!db) {
    console.warn('[cl-db] SQLite not available; aborting ingestion.');
    return;
  }

  const files = findSegmentFiles(timeframe);
  if (!files.length) {
    console.warn(`[cl-db] No segment files found for ${ASSET} ${timeframe} in ${DATA_DIR}`);
    return;
  }

  console.log(`[cl-db] Ingesting ${ASSET} ${timeframe} from ${files.length} JSON segments...`);
  let total = 0;

  files
    .slice()
    .sort()
    .forEach((file) => {
      const candles = loadCandlesFromFile(file);
      const inserted = upsertBars({ asset: ASSET, timeframe, candles });
      total += inserted;
      console.log(`  -> ${path.basename(file)}: ${inserted} bars`);
    });

  console.log(`[cl-db] Finished ${ASSET} ${timeframe}: ${total} bars.`);
};

const run = () => {
  console.log('[cl-db] Ingesting CL futures into SQLite from', DATA_DIR);
  TIMEFRAMES.forEach((tf) => ingestTimeframe(tf));
  console.log('[cl-db] Done.');
};

if (require.main === module) {
  run();
}

module.exports = {
  run,
};
