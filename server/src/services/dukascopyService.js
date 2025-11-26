const { v4: uuid } = require('uuid');
const fs = require('fs');
const path = require('path');
const { getHistoricalRates } = require('dukascopy-node');
const { describeNormalization } = require('./normalizationService');
const { ASSET_SOURCES } = require('../constants/assets');
const EARLIEST = require('../constants/dukascopyEarliest');

const DATA_DIR = path.join(__dirname, '../../data');
const CONFIG_DIR = path.join(DATA_DIR, 'config');
const JOBS_FILE = path.join(CONFIG_DIR, 'jobs.json');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const jobs = new Map();
const BOOT_FILE = path.join(CONFIG_DIR, 'serverBootId.json');

const deleteExistingAssetData = (asset) => {
  const lower = asset.toLowerCase();
  const files = [
    path.join(RAW_DIR, `${lower}-ticks.json`),
    path.join(RAW_DIR, `${lower}-ticks.jsonl`),
    path.join(RAW_DIR, `${lower}-ticks-meta.json`),
    path.join(DATA_DIR, `${lower}-m1.json`),
    path.join(DATA_DIR, `${lower}-m5.json`),
    path.join(DATA_DIR, `${lower}-m15.json`),
    path.join(DATA_DIR, `${lower}-m30.json`),
    path.join(DATA_DIR, `${lower}-h1.json`),
    path.join(DATA_DIR, `${lower}-h4.json`),
    path.join(DATA_DIR, `${lower}-d1.json`),
    path.join(DATA_DIR, `${lower}-mn1.json`),
  ];
  files.forEach((file) => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (error) {
        console.warn('[dukascopy] failed to delete file during restart mode', file, error);
      }
    }
  });
};

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const loadOrCreateBootId = () => {
  ensureDir(CONFIG_DIR);
  if (fs.existsSync(BOOT_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(BOOT_FILE, 'utf8'));
      if (saved?.serverBootId) return saved.serverBootId;
    } catch (error) {
      console.warn('[dukascopy] failed to read serverBootId, regenerating', error);
    }
  }
  const fresh = uuid();
  fs.writeFileSync(BOOT_FILE, JSON.stringify({ serverBootId: fresh, savedAt: new Date().toISOString() }, null, 2));
  return fresh;
};

const serverBootId = loadOrCreateBootId();

const TIMEFRAME_TO_MS = {
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
const CHUNK_DAYS = {
  m1: 30,
  m5: 60,
  m15: 90,
  m30: 120,
  h1: 180,
  h4: 365,
  d1: 0, // 0 means no chunking
  mn1: 0,
};

const mockStep = (message) => ({
  timestamp: new Date().toISOString(),
  message,
});

const CHUNK_TIMEOUT_MS = 60 * 1000;
const CHUNK_RETRIES = 2;
const safeWriteJson = (filepath, payload) => {
  const dir = path.dirname(filepath);
  ensureDir(dir);
  const tmp = `${filepath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
  fs.renameSync(tmp, filepath);
};

const readJsonIfExists = (filepath) => {
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (error) {
    console.warn('[dukascopy] failed to parse existing file', filepath, error);
    return null;
  }
};

const mergeByTime = (existing = [], incoming = [], timeField = 'time') => {
  const combined = [...existing, ...incoming];
  combined.sort((a, b) => {
    const ta = new Date(a[timeField]).getTime();
    const tb = new Date(b[timeField]).getTime();
    return ta - tb;
  });
  const deduped = [];
  let lastTime = null;
  combined.forEach((item) => {
    const t = new Date(item[timeField]).getTime();
    if (Number.isNaN(t)) return;
    if (lastTime === t) {
      deduped[deduped.length - 1] = item;
    } else {
      deduped.push(item);
      lastTime = t;
    }
  });
  return deduped;
};

const writeCandlesToDisk = (asset, timeframe, candles, range) => {
  const filepath = path.join(DATA_DIR, `${asset.toLowerCase()}-${timeframe.toLowerCase()}.json`);
  const payload = {
    asset,
    timeframe,
    range: { start: range.fromIso, end: range.toIso },
    candles,
    lastUpdated: new Date().toISOString(),
  };
  safeWriteJson(filepath, payload);
};

const persistJobsToDisk = () => {
  const payload = {
    serverBootId,
    jobs: Array.from(jobs.values()),
    savedAt: new Date().toISOString(),
  };
  safeWriteJson(JOBS_FILE, payload);
};

const hydrateJobsFromDisk = () => {
  if (!fs.existsSync(JOBS_FILE)) return;
  try {
    const saved = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
    if (!saved?.jobs || !Array.isArray(saved.jobs)) return;
    saved.jobs.forEach((job) => {
      if (job.serverBootId && job.serverBootId !== serverBootId) {
        if (job.status === 'running') {
          job.status = 'error';
          job.error = 'Server restarted before completion.';
          const alreadyHasRestartLog = (job.logs || []).some((l) =>
            (l.message || '').includes('Server restarted; job cannot be resumed automatically')
          );
          if (!alreadyHasRestartLog) {
            job.logs = [
              ...(job.logs || []),
              mockStep('Server restarted; job cannot be resumed automatically. Please restart the import.'),
            ];
          }
        }
      }
      job.serverBootId = serverBootId;
      jobs.set(job.id, job);
    });
    // persist cleaned state if we dropped jobs
    persistJobsToDisk();
  } catch (error) {
    console.warn('[dukascopy] failed to hydrate jobs', error);
  }
};

const getJobFromDisk = (jobId) => {
  if (!fs.existsSync(JOBS_FILE)) return null;
  try {
    const saved = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
    const match = saved?.jobs?.find?.((job) => job.id === jobId) || null;
    if (match && match.serverBootId && match.serverBootId !== serverBootId) {
      return null;
    }
    return match || null;
  } catch (error) {
    console.warn('[dukascopy] failed to read job from disk', error);
    return null;
  }
};

const buildChunks = (range, timeframe) => {
  const chunkDays = CHUNK_DAYS[timeframe?.toLowerCase()] ?? 0;
  if (!chunkDays || chunkDays <= 0) return [{ from: range.from, to: range.to }];
  const chunks = [];
  let cursor = new Date(range.from);
  const end = range.to;
  const chunkMs = chunkDays * DAY_MS;
  const overlapMs = timeframeToMs(timeframe) || 0;

  while (cursor < end) {
    const next = new Date(Math.min(end.getTime(), cursor.getTime() + chunkMs));
    const chunkEnd = next;
    const chunkStart = new Date(cursor);
    chunks.push({ from: chunkStart, to: chunkEnd });
    // advance with small overlap to avoid gaps
    cursor = new Date(next.getTime() - overlapMs);
    if (cursor <= chunkStart) {
      cursor = new Date(next.getTime() + 1);
    }
  }
  return chunks;
};

const pickEarliest = (asset, timeframe) => {
  const map = EARLIEST[asset] || {};
  const defaults = EARLIEST.DEFAULTS || {};
  const tf = timeframe?.toLowerCase() || 'tick';
  if (['m1', 'm5', 'm15', 'm30'].includes(tf)) return map.m1 || defaults.m1;
  if (['h1', 'h4'].includes(tf)) return map.h1 || defaults.h1;
  if (['d1', 'mn1'].includes(tf)) return map.d1 || defaults.d1;
  return map.m1 || defaults.m1;
};

const resolveRange = (asset, timeframe, options = {}) => {
  const now = new Date();
  const end = options.toOverride || (options.endDate ? new Date(options.endDate) : now);
  const earliestIso = pickEarliest(asset, timeframe);
  const earliestDate = earliestIso ? new Date(earliestIso) : null;
  let from =
    options.startDate
      ? new Date(options.startDate)
      : options.fromOverride || earliestDate || new Date(now.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);

  if (earliestDate && from < earliestDate) {
    from = earliestDate;
  }

  // Default cap for tick imports to avoid massive downloads unless fullHistory is requested
  const safeEnd = end < from ? from : end;
  return {
    from,
    to: safeEnd,
    fromIso: from.toISOString(),
    toIso: safeEnd.toISOString(),
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
  job.lastProgressAt = Date.now();
  persistJobsToDisk();
  return job;
};

const computeOverallProgress = (job, frameProgressValue = job.frameProgress || 0) => {
  const totalFrames = job.frameCount || 1;
  const perFrameWeight = 0.9 / totalFrames; // keep 10% for wrap-up/normalization log
  const base = 0.05 + (job.frameIndex || 0) * perFrameWeight;
  return Math.max(0, Math.min(0.95, base + perFrameWeight * frameProgressValue));
};

const setFrameState = (jobId, state) =>
  updateJob(jobId, (job) => {
    job.currentFrame = state.currentFrame ?? job.currentFrame;
    job.frameIndex = state.frameIndex ?? job.frameIndex;
    job.frameCount = state.frameCount ?? job.frameCount;
    job.frameStage = state.frameStage ?? job.frameStage;
    job.frameProgress = typeof state.frameProgress === 'number' ? state.frameProgress : job.frameProgress;
    job.progress = computeOverallProgress(job, job.frameProgress);
  });

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

const markJobCanceled = (jobId) =>
  updateJob(jobId, (job) => {
    if (job.status === 'completed' || job.status === 'error') return;
    job.status = 'canceled';
    job.logs.push(mockStep('Job canceled by user.'));
  });

const safeAppendJsonl = (filepath, data) => {
  const dir = path.dirname(filepath);
  ensureDir(dir);

  // Open file for appending
  const fd = fs.openSync(filepath, 'a');

  try {
    const BATCH_SIZE = 1000;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const lines = batch.map((d) => JSON.stringify(d)).join('\n') + '\n';
      fs.writeSync(fd, lines);
    }
  } finally {
    fs.closeSync(fd);
  }
};

const withTimeout = (promise, ms, label = 'operation') =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

const readExistingRanges = (asset) => {
  const ranges = {};
  // Read tick metadata from separate file
  const tickMetaPath = path.join(RAW_DIR, `${asset.toLowerCase()}-ticks-meta.json`);
  const tickMeta = readJsonIfExists(tickMetaPath);
  if (tickMeta?.range) {
    ranges.tick = { ...tickMeta.range, count: tickMeta.count || 0 };
  }

  const frames = ['m1', 'm5', 'm15', 'm30', 'h1', 'h4', 'd1', 'mn1'];
  frames.forEach((frame) => {
    const file = path.join(DATA_DIR, `${asset.toLowerCase()}-${frame}.json`);
    const json = readJsonIfExists(file);
    if (json?.range) {
      ranges[frame] = { ...json.range, count: json.candles?.length || 0 };
    }
  });

  return ranges;
};

const persistRawTicks = (asset, ticks, range) => {
  const minimal = ticks.map((tick) => ({
    timestamp: tick.timestamp,
    bid: tick.bidPrice,
    ask: tick.askPrice,
    bidVolume: tick.bidVolume,
    askVolume: tick.askVolume,
  }));

  const filename = path.join(RAW_DIR, `${asset.toLowerCase()}-ticks.jsonl`);
  safeAppendJsonl(filename, minimal);

  // Update metadata file
  const metaFilename = path.join(RAW_DIR, `${asset.toLowerCase()}-ticks-meta.json`);
  const existingMeta = readJsonIfExists(metaFilename) || { count: 0, range: { start: range.fromIso, end: range.toIso } };

  // Update range (expand if needed)
  const newStart = existingMeta.range.start < range.fromIso ? existingMeta.range.start : range.fromIso;
  const newEnd = existingMeta.range.end > range.toIso ? existingMeta.range.end : range.toIso;

  const newMeta = {
    asset,
    range: { start: newStart, end: newEnd },
    count: existingMeta.count + minimal.length,
    lastUpdated: new Date().toISOString(),
  };
  safeWriteJson(metaFilename, newMeta);
};

const mergeAndPersistTicks = (jobId, asset, ticks, range, mode, existingRanges) => {
  // For JSONL, we just append. 'continue' mode implies appending to existing.
  // 'restart' mode deleted the file, so we also just append.
  // We don't need to read the whole file to merge.

  persistRawTicks(asset, ticks, range);

  const metaFilename = path.join(RAW_DIR, `${asset.toLowerCase()}-ticks-meta.json`);
  const meta = readJsonIfExists(metaFilename);

  pushJobLog(
    jobId,
    `Appended tick data ${range.fromIso} -> ${range.toIso} (count=${ticks.length}, total=${meta?.count || 0})`
  );
};

const mergeAndPersistCandles = (jobId, asset, timeframe, candles, range, mode, existingRanges) => {
  if (mode !== 'continue') {
    writeCandlesToDisk(asset, timeframe, candles, range);
    return;
  }
  const file = path.join(DATA_DIR, `${asset.toLowerCase()}-${timeframe.toLowerCase()}.json`);
  const existing = readJsonIfExists(file);
  const combined = mergeByTime(existing?.candles || [], candles, 'time');
  const mergedRange = {
    fromIso: existing?.range?.start || range.fromIso,
    toIso: range.toIso,
  };
  pushJobLog(
    jobId,
    `Merged ${timeframe} candles from ${existingRanges?.[timeframe]?.start || mergedRange.fromIso} -> ${mergedRange.toIso
    } (count=${combined.length})`
  );
  writeCandlesToDisk(asset, timeframe, combined, mergedRange);
};

const loadExistingData = (asset, timeframe) => {
  const isTick = timeframe?.toLowerCase() === 'tick';

  if (isTick) {
    // For ticks, we don't load the whole file into memory anymore.
    // We just return empty data and the range from metadata.
    const metaPath = path.join(RAW_DIR, `${asset.toLowerCase()}-ticks-meta.json`);
    const meta = readJsonIfExists(metaPath);
    return { data: [], range: meta?.range || {} };
  }

  const filepath = path.join(DATA_DIR, `${asset.toLowerCase()}-${timeframe.toLowerCase()}.json`);
  const json = readJsonIfExists(filepath);
  if (!json) return { data: [], range: {} };
  return {
    data: json.candles || [],
    range: json.range || {},
  };
};

const executeJob = async (job) => {
  const source = ASSET_SOURCES[job.asset];
  if (!source) {
    markJobError(job.id, `Asset ${job.asset} is not mapped to Dukascopy`);
    return;
  }

  try {
    const frames = (EARLIEST[job.asset]?.frames || EARLIEST.DEFAULTS.frames || ['m1'])
      .filter((f) => f.toLowerCase() !== 'tick' && f.toLowerCase() !== 't' && f.toLowerCase() !== 's1');
    const mode = job.mode || 'restart';
    const existingRanges = job.existingRanges || {};
    pushJobLog(job.id, `Queued Dukascopy import for ${job.asset}: frames=${frames.join(', ')}`);
    if (job.hasExisting) {
      pushJobLog(
        job.id,
        `Existing data found for ${job.asset}. Mode=${mode}. Known ranges: ${Object.keys(existingRanges)
          .map((key) => `${key}:${existingRanges[key].start || '?'}->${existingRanges[key].end || '?'}`)
          .join(', ')}`
      );
    }
    updateJob(job.id, (state) => {
      state.frames = frames;
      state.frameCount = frames.length;
      state.frameIndex = 0;
      state.frameProgress = 0;
      state.frameStage = 'queued';
      state.currentFrame = frames[0];
    });
    setJobProgress(job.id, 0.05);

    for (let idx = 0; idx < frames.length; idx += 1) {
      const frame = frames[idx];
      pushJobLog(job.id, `Starting timeframe ${frame} (${idx + 1}/${frames.length})`);
      setFrameState(job.id, {
        currentFrame: frame,
        frameIndex: idx,
        frameCount: frames.length,
        frameProgress: 0.05,
        frameStage: 'resolving-range',
      });
      const existingRange = existingRanges[frame] || (frame === 'tick' ? existingRanges.tick : null);
      let fromOverride = null;
      if (mode === 'continue' && existingRange?.end) {
        const frameMs = timeframeToMs(frame) || 60 * 1000;
        const overlapMs = Math.max(frameMs, 60 * 1000);
        const resumeFrom = new Date(new Date(existingRange.end).getTime() - overlapMs);
        const earliest = pickEarliest(job.asset, frame);
        const earliestDate = earliest ? new Date(earliest) : null;
        if (earliestDate && resumeFrom < earliestDate) {
          fromOverride = earliestDate;
        } else {
          fromOverride = resumeFrom;
        }
      }
      const range = resolveRange(job.asset, frame, {
        fromOverride,
        startDate: job.startDate,
        endDate: job.endDate,
        fullHistory: job.fullHistory,
      });
      if (
        frame.toLowerCase() === 'tick' &&
        !job.fullHistory &&
        !job.startDate &&
        !fromOverride
      ) {
        pushJobLog(job.id, `Tick range capped to ~${DEFAULT_TICK_RANGE_DAYS} days by default (use fullHistory to override).`);
      }
      updateJob(job.id, (state) => {
        state.rangeResolved = { start: range.fromIso, end: range.toIso };
      });
      const rangeModeLabel = mode === 'continue' && existingRange ? 'continue' : 'restart';
      pushJobLog(
        job.id,
        `Resolved range ${range.fromIso} -> ${range.toIso} (timeframe=${frame}, mode=${rangeModeLabel})`
      );
      setFrameState(job.id, {
        frameProgress: 0.1,
        frameStage: 'range-resolved',
      });

      const chunks = buildChunks(range, frame);
      const existingData = mode === 'continue' ? loadExistingData(job.asset, frame) : { data: [], range: {} };
      const isTickFrame = false;
      const field = 'time';
      let mergedData = Array.isArray(existingData.data) ? [...existingData.data] : [];
      const baseFromIso = (mode === 'continue' && existingData?.range?.start) || range.fromIso;
      let totalCount = mergedData.length;
      setFrameState(job.id, {
        frameStage: 'downloading',
        frameProgress: 0.25,
      });
      pushJobLog(job.id, `Downloading ${frame} data (${idx + 1}/${frames.length}) in ${chunks.length} chunk(s)...`);

      for (let cIdx = 0; cIdx < chunks.length; cIdx += 1) {
        const chunk = chunks[cIdx];
        const chunkLabel = `${chunk.from.toISOString()} -> ${chunk.to.toISOString()}`;
      const chunkRange = { fromIso: chunk.from.toISOString(), toIso: chunk.to.toISOString() };
      try {
        let data = [];
        let attempt = 0;
        while (attempt <= CHUNK_RETRIES) {
          if (jobs.get(job.id)?.status === 'canceled') {
            pushJobLog(job.id, 'Chunk canceled before completion.');
            return;
          }
          try {
            data = await withTimeout(
              getHistoricalRates({
                instrument: source.instrument,
                dates: { from: chunk.from, to: chunk.to },
                timeframe: frame,
                format: 'json',
              }),
              CHUNK_TIMEOUT_MS,
              `chunk ${cIdx + 1}/${chunks.length} (${frame})`
            );
            break;
          } catch (err) {
            attempt += 1;
            if (attempt > CHUNK_RETRIES) {
              throw err;
            }
            pushJobLog(
              job.id,
              `Retrying chunk ${cIdx + 1}/${chunks.length} (${frame}) after error: ${err.message || err}`
            );
          }
        }
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map((row) => {
            if (isTickFrame) return row;
            const timeValue = row.time || row.timestamp || row.date;
            const timeIso =
              typeof timeValue === 'number'
                ? new Date(timeValue).toISOString()
                : typeof timeValue === 'string'
                  ? new Date(timeValue).toISOString()
                  : null;
            return timeIso ? { ...row, time: timeIso } : row;
          });
          mergedData = mergeByTime(mergedData, normalized, field);
          writeCandlesToDisk(job.asset, frame, mergedData, { fromIso: baseFromIso, toIso: chunkRange.toIso });
          totalCount = mergedData.length;
          pushJobLog(job.id, `Chunk ${cIdx + 1}/${chunks.length} (${frame}) ok: ${data.length} rows (${chunkLabel})`);
          pushJobLog(
            job.id,
            `Persisted chunk ${cIdx + 1}/${chunks.length} (${frame}) to disk (count=${totalCount})`
          );
          } else {
            pushJobLog(job.id, `Chunk ${cIdx + 1}/${chunks.length} (${frame}) returned no data (${chunkLabel})`);
          }
        } catch (error) {
          pushJobLog(job.id, `Chunk ${cIdx + 1}/${chunks.length} (${frame}) failed: ${error.message || error}`);
          throw error;
        }
        const chunkProgress = 0.25 + 0.55 * ((cIdx + 1) / chunks.length);
        setFrameState(job.id, {
          frameProgress: chunkProgress,
          frameStage: 'downloading',
        });
      }

      setFrameState(job.id, {
        frameProgress: 0.8,
        frameStage: 'downloaded',
      });

      const effectiveCount = isTickFrame ? totalCount : mergedData.length;
      if (!effectiveCount) {
        pushJobLog(job.id, `No data returned for ${frame} (${range.fromIso} -> ${range.toIso})`);
        setFrameState(job.id, {
          frameProgress: 1,
          frameStage: 'skipped',
        });
        continue;
      }

      if (isTickFrame) {
        const meta = readJsonIfExists(tickMetaPath);
        const startRange = meta?.range?.start || range.fromIso;
        const endRange = meta?.range?.end || range.toIso;
        const formattedCount = Number(effectiveCount).toLocaleString('en-US');
        pushJobLog(job.id, `Downloaded ${formattedCount} ticks (${startRange} -> ${endRange})`);
        pushJobLog(job.id, 'Persisted raw tick file (data/raw)');
      } else {
        pushJobLog(job.id, `Downloaded ${effectiveCount} ${frame} candles`);
        pushJobLog(job.id, `Saved ${frame} candles to data-cache`);
      }

      setFrameState(job.id, {
        frameProgress: 0.85,
        frameStage: 'persisted',
      });

      setFrameState(job.id, {
        frameProgress: 1,
        frameStage: 'completed',
      });
    }

    pushJobLog(job.id, describeNormalization());
    finalizeJob(job.id);
  } catch (error) {
    console.error('[dukascopy] job failed', error);
    markJobError(job.id, error.message || 'Unknown dukascopy error');
  }
};

async function runDukascopyJob({ asset, timeframe, mode = 'restart', startDate, endDate, fullHistory }) {
  if (timeframe && timeframe.toLowerCase() === 'tick') {
    throw new Error('Tick imports are disabled; use M1 or higher.');
  }
  const jobId = uuid();
  const existingRanges = readExistingRanges(asset);
  const job = {
    id: jobId,
    serverBootId,
    status: 'running',
    progress: 0,
    logs: [],
    asset,
    timeframe,
    range: {},
    hasExisting: Object.keys(existingRanges).length > 0,
    existingRanges,
    mode,
    startDate,
    endDate,
    fullHistory,
    frames: [],
    frameIndex: 0,
    frameCount: 0,
    frameProgress: 0,
    frameStage: 'queued',
    currentFrame: null,
    lastProgressAt: Date.now(),
  };

  jobs.set(jobId, job);
  if (mode === 'restart') {
    deleteExistingAssetData(asset);
    job.logs.push(mockStep('Restart mode: removed existing cached files for asset.'));
  }
  persistJobsToDisk();
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
  const inMemory = jobs.get(jobId);
  if (inMemory) return inMemory;
  const fromDisk = getJobFromDisk(jobId);
  if (fromDisk) {
    jobs.set(jobId, fromDisk);
    return fromDisk;
  }
  return null;
}

function cancelJob(jobId) {
  markJobCanceled(jobId);
  return getJob(jobId);
}

function previewDukascopy({ asset }) {
  const existingRanges = readExistingRanges(asset);
  return {
    asset,
    hasExisting: Object.keys(existingRanges).length > 0,
    existingRanges,
  };
}

module.exports = {
  runDukascopyJob,
  ingestCustomFile,
  getJob,
  previewDukascopy,
  serverBootId,
  hydrateJobsFromDisk,
  cancelJob,
};
