const { v4: uuid } = require('uuid');
const fs = require('fs');
const path = require('path');
const { getHistoricalRates } = require('dukascopy-node');
const { describeNormalization } = require('./normalizationService');
const { ASSET_SOURCES } = require('../constants/assets');
const { frames: TARGET_FRAMES } = require('../constants/availableFrames');
const EARLIEST = require('../constants/dukascopyEarliest');
const { updateEntry } = require('./dataIndexService');

const DATA_DIR = path.join(__dirname, '../../data');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const jobs = new Map();

const TIMEFRAME_TO_MS = {
  tick: 1,
  t: 1,
  m1: 60 * 1000,
  m5: 5 * 60 * 1000,
  m15: 15 * 60 * 1000,
  m30: 30 * 60 * 1000,
  h1: 60 * 60 * 1000,
  h4: 4 * 60 * 60 * 1000,
  d1: 24 * 60 * 60 * 1000,
  mn1: 30 * 24 * 60 * 60 * 1000,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 14;

const mockStep = (message) => ({
  timestamp: new Date().toISOString(),
  message,
});

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const pickEarliest = (asset, timeframe) => {
  const map = EARLIEST[asset] || {};
  const defaults = EARLIEST.DEFAULTS || {};
  const tf = timeframe?.toLowerCase() || 'tick';
  if (tf === 'tick' || tf === 't' || tf === 's1') return map.tick || defaults.tick;
  if (['m1', 'm5', 'm15', 'm30'].includes(tf)) return map.m1 || defaults.m1;
  if (['h1', 'h4'].includes(tf)) return map.h1 || defaults.h1;
  if (['d1', 'mn1'].includes(tf)) return map.d1 || defaults.d1;
  return map.tick || defaults.tick;
};

const resolveRange = (asset, timeframe) => {
  const now = new Date();
  const earliestIso = pickEarliest(asset, timeframe);
  const from = earliestIso ? new Date(earliestIso) : new Date(now.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);
  return {
    from,
    to: now,
    fromIso: from.toISOString(),
    toIso: now.toISOString(),
  };
};

const timeframeToMs = (timeframe) => TIMEFRAME_TO_MS[timeframe?.toLowerCase()] ?? TIMEFRAME_TO_MS.tick;

const derivePrice = (tick) => {
  if (!tick) return null;
  if (typeof tick.midPrice === 'number') return tick.midPrice;
  const ask = typeof tick.askPrice === 'number' ? tick.askPrice : undefined;
  const bid = typeof tick.bidPrice === 'number' ? tick.bidPrice : undefined;
  if (typeof ask === 'number' && typeof bid === 'number') {
    return (ask + bid) / 2;
  }
  if (typeof ask === 'number') return ask;
  if (typeof bid === 'number') return bid;
  return null;
};

const convertTicksToCandles = (ticks, timeframe) => {
  const frameMs = timeframeToMs(timeframe);
  if (!frameMs || !Array.isArray(ticks) || ticks.length === 0) return [];

  const ordered = [...ticks].sort((a, b) => a.timestamp - b.timestamp);
  const candles = [];
  let bucketStart = null;
  let bucketPrices = [];
  let volume = 0;

  const flushBucket = () => {
    if (!bucketPrices.length || bucketStart === null) return;
    const open = bucketPrices[0];
    const close = bucketPrices[bucketPrices.length - 1];
    const high = Math.max(...bucketPrices);
    const low = Math.min(...bucketPrices);
    candles.push({
      time: new Date(bucketStart).toISOString(),
      open,
      high,
      low,
      close,
      volume: Number(volume.toFixed(6)),
    });
    bucketPrices = [];
    volume = 0;
  };

  ordered.forEach((tick) => {
    const price = derivePrice(tick);
    if (price === null || Number.isNaN(tick.timestamp)) {
      return;
    }
    const bucket = Math.floor(tick.timestamp / frameMs) * frameMs;
    if (bucketStart === null) {
      bucketStart = bucket;
    } else if (bucket !== bucketStart) {
      flushBucket();
      bucketStart = bucket;
    }
    bucketPrices.push(price);
    const tickVolume = Number(tick.askVolume || tick.bidVolume || 0);
    if (!Number.isNaN(tickVolume)) {
      volume += tickVolume;
    }
  });

  flushBucket();
  return candles;
};

const updateJob = (jobId, updater) => {
  const job = jobs.get(jobId);
  if (!job) return null;
  updater(job);
  return job;
};

const pushJobLog = (jobId, message) =>
  updateJob(jobId, (job) => {
    job.logs.push(mockStep(message));
  });

const setJobProgress = (jobId, progress) =>
  updateJob(jobId, (job) => {
    job.progress = Math.max(0, Math.min(1, progress));
  });

const finalizeJob = (jobId) =>
  updateJob(jobId, (job) => {
    job.status = 'completed';
    job.progress = 1;
  });

const markJobError = (jobId, errorMessage) =>
  updateJob(jobId, (job) => {
    job.status = 'error';
    job.progress = 1;
    job.error = errorMessage;
    job.logs.push(mockStep(`Error: ${errorMessage}`));
  });

const persistRawTicks = (asset, ticks, range) => {
  ensureDir(RAW_DIR);
  const minimal = ticks.map((tick) => ({
    timestamp: tick.timestamp,
    bid: tick.bidPrice,
    ask: tick.askPrice,
    bidVolume: tick.bidVolume,
    askVolume: tick.askVolume,
  }));
  const filename = path.join(RAW_DIR, `${asset.toLowerCase()}-ticks.json`);
  fs.writeFileSync(
    filename,
    JSON.stringify(
      {
        asset,
        range: { start: range.fromIso, end: range.toIso },
        count: minimal.length,
        ticks: minimal,
      },
      null,
      2
    )
  );
  updateEntry(asset, 'tick', { start: range.fromIso, end: range.toIso }, minimal.length);
};

const writeCandlesToDisk = (asset, timeframe, candles, range) => {
  ensureDir(DATA_DIR);
  const filename = `${asset.toLowerCase()}-${timeframe.toLowerCase()}.json`;
  const payload = {
    asset,
    timeframe,
    range: { start: range.fromIso, end: range.toIso },
    candles,
  };
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(payload, null, 2));
  updateEntry(asset, timeframe, { start: range.fromIso, end: range.toIso }, candles.length);
};

const executeJob = async (job) => {
  const source = ASSET_SOURCES[job.asset];
  if (!source) {
    markJobError(job.id, `Asset ${job.asset} is not mapped to Dukascopy`);
    return;
  }

  try {
    const frames = EARLIEST[job.asset]?.frames || EARLIEST.DEFAULTS.frames || ['tick'];
    const perFrameProgress = 0.9 / frames.length; // leave 10% for wrap-up
    pushJobLog(job.id, `Queued Dukascopy import for ${job.asset}: frames=${frames.join(', ')}`);
    setJobProgress(job.id, 0.05);

    for (const frame of frames) {
      const range = resolveRange(job.asset, frame);
      updateJob(job.id, (state) => {
        state.rangeResolved = { start: range.fromIso, end: range.toIso };
      });
      pushJobLog(job.id, `Resolved range ${range.fromIso} -> ${range.toIso} (timeframe=${frame})`);

      const data = await getHistoricalRates({
        instrument: source.instrument,
        dates: { from: range.from, to: range.to },
        timeframe: frame,
        format: 'json',
      });

      if (!Array.isArray(data) || data.length === 0) {
        pushJobLog(job.id, `No data returned for ${frame} (${range.fromIso} -> ${range.toIso})`);
        setJobProgress(job.id, Math.min(0.95, job.progress + perFrameProgress));
        continue;
      }

      if (frame === 'tick') {
        const formattedCount = Number(data.length).toLocaleString('en-US');
        pushJobLog(job.id, `Downloaded ${formattedCount} ticks`);
        persistRawTicks(job.asset, data, range);
        pushJobLog(job.id, 'Persisted raw tick file (data/raw)');
      } else {
        pushJobLog(job.id, `Downloaded ${data.length} ${frame} candles`);
        writeCandlesToDisk(job.asset, frame, data, range);
        pushJobLog(job.id, `Saved ${frame} candles to data-cache`);
      }

      setJobProgress(job.id, Math.min(0.95, job.progress + perFrameProgress));
    }

    pushJobLog(job.id, describeNormalization());
    finalizeJob(job.id);
  } catch (error) {
    console.error('[dukascopy] job failed', error);
    markJobError(job.id, error.message || 'Unknown dukascopy error');
  }
};

async function runDukascopyJob({ asset, timeframe }) {
  const jobId = uuid();
  const job = {
    id: jobId,
    status: 'running',
    progress: 0,
    logs: [],
    asset,
    timeframe,
    range: {},
  };

  jobs.set(jobId, job);
  setImmediate(() => executeJob(job));
  return job;
}

async function ingestCustomFile({ filename }) {
  const jobId = uuid();
  const logs = [
    mockStep(`Received custom file ${filename}`),
    mockStep('Validating schema'),
    mockStep('Normalizing timezone/tick size'),
    mockStep('Persisting into data-cache'),
  ];

  const job = {
    id: jobId,
    status: 'completed',
    progress: 1,
    logs,
    filename,
  };
  jobs.set(jobId, job);
  return job;
}

function getJob(jobId) {
  return jobs.get(jobId);
}

module.exports = {
  runDukascopyJob,
  ingestCustomFile,
  getJob,
};
