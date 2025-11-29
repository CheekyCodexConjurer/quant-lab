const fs = require('fs');
const path = require('path');

let Database;
try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  Database = require('better-sqlite3');
} catch {
  Database = null;
}

const DB_DIR = path.join(__dirname, '../../db');
const DB_PATH = path.join(DB_DIR, 'market.db');

let dbInstance = null;

const getDb = () => {
  if (!Database) return null;
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS bars (
      asset TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      time INTEGER NOT NULL,
      open REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      close REAL NOT NULL,
      volume REAL NOT NULL,
      PRIMARY KEY (asset, timeframe, time)
    );
    CREATE INDEX IF NOT EXISTS idx_bars_asset_tf_time
      ON bars(asset, timeframe, time);
  `);

  dbInstance = db;
  return dbInstance;
};

const upsertBars = ({ asset, timeframe, candles }) => {
  const db = getDb();
  if (!db || !Array.isArray(candles) || !candles.length) return 0;

  const stmt = db.prepare(
    'INSERT OR IGNORE INTO bars(asset, timeframe, time, open, high, low, close, volume) VALUES (@asset, @timeframe, @time, @open, @high, @low, @close, @volume)'
  );
  const insertMany = db.transaction((rows) => {
    let count = 0;
    rows.forEach((row) => {
      stmt.run(row);
      count += 1;
    });
    return count;
  });

  const rows = candles
    .map((candle) => {
      const d = new Date(candle.time);
      const t = d.getTime();
      if (Number.isNaN(t)) return null;
      return {
        asset,
        timeframe,
        time: t,
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume || 0),
      };
    })
    .filter(Boolean);

  return insertMany(rows);
};

const getWindowFromDb = ({ asset, timeframe, to, limit }) => {
  const db = getDb();
  if (!db) return null;

  const tf = String(timeframe || '').toUpperCase();
  const assetKey = String(asset || '').toUpperCase();

  const safeLimit = typeof limit === 'number' && limit > 0 ? Math.floor(limit) : 0;
  if (!safeLimit) return null;

  let toEpoch = null;
  if (to) {
    const d = new Date(to);
    const t = d.getTime();
    if (!Number.isNaN(t)) {
      toEpoch = t;
    }
  }

  let rows;
  if (toEpoch !== null) {
    const stmt = db.prepare(
      'SELECT time, open, high, low, close, volume FROM bars WHERE asset = ? AND timeframe = ? AND time <= ? ORDER BY time DESC LIMIT ?'
    );
    rows = stmt.all(assetKey, tf, toEpoch, safeLimit);
  } else {
    const stmt = db.prepare(
      'SELECT time, open, high, low, close, volume FROM bars WHERE asset = ? AND timeframe = ? ORDER BY time DESC LIMIT ?'
    );
    rows = stmt.all(assetKey, tf, safeLimit);
  }

  if (!rows || !rows.length) return null;

  const candles = rows
    .slice()
    .reverse()
    .map((row) => ({
      time: new Date(row.time).toISOString(),
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
    }));

  const first = candles[0];
  const last = candles[candles.length - 1];

  return {
    asset: assetKey,
    timeframe: tf,
    range: first && last ? { start: first.time, end: last.time } : {},
    candles,
  };
};

const getSummaryFromDb = ({ asset, timeframe }) => {
  const db = getDb();
  if (!db) return null;

  const tf = String(timeframe || '').toUpperCase();
  const assetKey = String(asset || '').toUpperCase();

  const row = db
    .prepare(
      'SELECT MIN(time) as start, MAX(time) as end, COUNT(*) as count FROM bars WHERE asset = ? AND timeframe = ?'
    )
    .get(assetKey, tf);

  if (!row || !row.count) return null;
  const start = row.start ? new Date(row.start).toISOString() : undefined;
  const end = row.end ? new Date(row.end).toISOString() : undefined;

  return {
    asset: assetKey,
    timeframe: tf,
    range: start && end ? { start, end } : {},
    count: row.count,
  };
};

module.exports = {
  getDb,
  upsertBars,
  getWindowFromDb,
  getSummaryFromDb,
};

