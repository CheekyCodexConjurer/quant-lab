const { v4: uuid } = require('uuid');
const fs = require('fs');
const path = require('path');
const { getHistoricalRates } = require('dukascopy-node');
const { describeNormalization } = require('./normalizationService');
const { ASSET_SOURCES } = require('../constants/assets');
const { buildTimeframesFromTicks, DEFAULT_TIMEFRAMES } = require('./timeframeBuilder');

const DATA_DIR = path.join(__dirname, '../../data');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const jobs = new Map();

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

const parseDateInput = (value) => {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  return Number.isNaN(date.getTime()) ? null : date;
};

const resolveRange = (startDate, endDate) => {
  const now = new Date();
  let from = parseDateInput(startDate) ?? new Date(now.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);
  let to = parseDateInput(endDate);

  if (!to || to <= from) {
    to = new Date(Math.min(now.getTime(), from.getTime() + DEFAULT_RANGE_DAYS * DAY_MS));
  } else {
    to = new Date(to.getTime() + DAY_MS);
  }

  return {
    from,
    to,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
  };
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
  const filename = path.join(RAW_DIR, `${asset.toLowerCase()}-ticks.json`);
  const simplified = ticks.map((tick) => ({
    timestamp: tick.timestamp,
    bid: tick.bidPrice,
    ask: tick.askPrice,
    bidVolume: tick.bidVolume,
    askVolume: tick.askVolume,
  }));

  fs.writeFileSync(
    filename,
    JSON.stringify(
      {
        asset,
        range: { start: range.fromIso, end: range.toIso },
        count: simplified.length,
        ticks: simplified,
      },
      null,
      2
    )
  );
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
};

const executeJob = async (job) => {
  const source = ASSET_SOURCES[job.asset];
  if (!source) {
    markJobError(job.id, `Asset ${job.asset} is not mapped to Dukascopy`);
    return;
  }

  try {
    pushJobLog(job.id, `Queued Dukascopy import for ${job.asset} (${job.timeframe})`);
    setJobProgress(job.id, 0.05);

    const range = resolveRange(job.range.startDate, job.range.endDate);
    updateJob(job.id, (state) => {
      state.rangeResolved = { start: range.fromIso, end: range.toIso };
    });
    pushJobLog(job.id, `Resolved range ${range.fromIso} -> ${range.toIso}`);

    pushJobLog(job.id, `Fetching ticks via dukascopy-node for ${source.instrument}`);
    setJobProgress(job.id, 0.2);

    const ticks = await getHistoricalRates({
      instrument: source.instrument,
      dates: { from: range.from, to: range.to },
      timeframe: 'tick',
      format: 'json',
    });

    if (!Array.isArray(ticks) || ticks.length === 0) {
      throw new Error('Provider returned no tick data for the requested interval');
    }

    pushJobLog(job.id, `Downloaded ${Number(ticks.length).toLocaleString('en-US')} ticks`);
    setJobProgress(job.id, 0.4);

    persistRawTicks(job.asset, ticks, range);
    pushJobLog(job.id, 'Persisted raw tick file (data/raw)');
    setJobProgress(job.id, 0.55);

    const requestedFrames = Array.from(
      new Set([...DEFAULT_TIMEFRAMES, (job.timeframe || 'M1').toUpperCase()])
    );
    pushJobLog(job.id, `Building timeframes: ${requestedFrames.join(', ')}`);

    const candlesByFrame = buildTimeframesFromTicks(ticks, requestedFrames);
    candlesByFrame.forEach((candles, timeframe) => {
      writeCandlesToDisk(job.asset, timeframe, candles, range);
    });

    pushJobLog(job.id, describeNormalization());
    pushJobLog(job.id, 'Saving to data-cache');
    setJobProgress(job.id, 0.95);
    finalizeJob(job.id);
  } catch (error) {
    console.error('[dukascopy] job failed', error);
    markJobError(job.id, error.message || 'Unknown dukascopy error');
  }
};

async function runDukascopyJob({ asset, timeframe, startDate, endDate }) {
  const jobId = uuid();
  const job = {
    id: jobId,
    status: 'running',
    progress: 0,
    logs: [],
    asset,
    timeframe,
    range: { startDate, endDate },
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
