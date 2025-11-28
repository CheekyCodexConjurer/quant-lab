const { v4: uuid } = require('uuid');
const fs = require('fs');
const path = require('path');
const { getHistoricalRates } = require('dukascopy-node');
const { describeNormalization } = require('./normalizationService');
const { ASSET_SOURCES } = require('../constants/assets');
const EARLIEST = require('../constants/dukascopyEarliest');
const { DATA_DIR, RAW_DIR, deleteExistingAssetData, ensureDir } = require('./dukascopy/paths');
const { jobs, serverBootId, persistJobsToDisk, hydrateJobsFromDisk, getJobFromDisk, safeWriteJson } = require('./dukascopy/jobStore');
const { TIMEFRAME_TO_MS, DAY_MS, DEFAULT_RANGE_DAYS, CHUNK_DAYS, buildChunks } = require('./dukascopy/timeframes');
const { mergeByTime, readJsonIfExists } = require('./dukascopy/dataUtils');
const { writeCandlesToDisk } = require('./dukascopy/candleWriter');

const mockStep = (message) => ({
  timestamp: new Date().toISOString(),
  message,
});

// Timeout para cada chamada de chunk em getHistoricalRates.
// Para ativos como CL1! em M1/M5, 60s era insuficiente; ampliamos para 5 minutos
// e passamos a dividir o chunk em sub-chunks menores quando um timeout acontece,
// em vez de simplesmente falhar o job inteiro.
const CHUNK_TIMEOUT_MS = 5 * 60 * 1000;
const CHUNK_RETRIES = 2;
const MAX_CHUNK_SPLIT_DEPTH = 4;
const MIN_CHUNK_SPLIT_RANGE_MS = 10 * DAY_MS; // ~10 dias por sub-chunk alvo

const isTimeoutError = (error) => {
  if (!error) return false;
  const message = error.message || String(error);
  return message.toLowerCase().includes('timed out after');
};

const splitChunkRange = (chunk) => {
  const fromMs = chunk.from.getTime();
  const toMs = chunk.to.getTime();
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) {
    return [chunk, null];
  }
  const midMs = fromMs + Math.floor((toMs - fromMs) / 2);
  const mid = new Date(midMs);
  return [
    { from: chunk.from, to: mid },
    { from: mid, to: chunk.to },
  ];
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

const fetchChunkWithSplits = async ({ jobId, source, frame, chunk, chunkIndex, chunkCount, depth = 0 }) => {
  const labelBase = `chunk ${chunkIndex + 1}/${chunkCount} (${frame})`;
  const chunkLabel = `${chunk.from.toISOString()} -> ${chunk.to.toISOString()}`;
  const canSplit =
    depth < MAX_CHUNK_SPLIT_DEPTH &&
    chunk.to.getTime() - chunk.from.getTime() > MIN_CHUNK_SPLIT_RANGE_MS;

  let attempt = 0;

  // Tenta baixar o chunk atual; em caso de timeout, pode dividir o range em sub-chunks menores.
  // Isso reduz o volume por chamada ao dukascopy-node e evita que jobs longos morram em um único timeout.
  // Mantemos um pequeno número de tentativas por range antes de desistir definitivamente.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (jobs.get(jobId)?.status === 'canceled') {
      pushJobLog(jobId, 'Chunk canceled before completion.');
      return [];
    }

    try {
      const data = await withTimeout(
        getHistoricalRates({
          instrument: source.instrument,
          dates: { from: chunk.from, to: chunk.to },
          timeframe: frame,
          format: 'json',
        }),
        CHUNK_TIMEOUT_MS,
        labelBase
      );
      return Array.isArray(data) ? data : [];
    } catch (err) {
      const message = err?.message || String(err);
      const timeout = isTimeoutError(err);

      // Se estourou timeout e ainda podemos dividir o range, faz split imediato em vez de repetir o mesmo chunk grande.
      if (timeout && canSplit) {
        const nextDepth = depth + 1;
        pushJobLog(
          jobId,
          `${labelBase} timed out for range ${chunkLabel}; splitting into smaller sub-chunks (depth=${nextDepth}).`
        );
        const [left, right] = splitChunkRange(chunk);
        const leftData = await fetchChunkWithSplits({
          jobId,
          source,
          frame,
          chunk: left,
          chunkIndex,
          chunkCount,
          depth: nextDepth,
        });
        const rightData = right
          ? await fetchChunkWithSplits({
              jobId,
              source,
              frame,
              chunk: right,
              chunkIndex,
              chunkCount,
              depth: nextDepth,
            })
          : [];
        return [...leftData, ...rightData];
      }

      attempt += 1;
      if (attempt > CHUNK_RETRIES) {
        throw err;
      }

      pushJobLog(jobId, `Retrying ${labelBase} after error: ${message}`);
    }
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
  const lower = asset.toLowerCase();

  // Tick metadata em arquivo separado (JSONL + meta)
  const tickMetaPath = path.join(RAW_DIR, `${lower}-ticks-meta.json`);
  const tickMeta = readJsonIfExists(tickMetaPath);
  if (tickMeta?.range) {
    ranges.tick = { ...tickMeta.range, count: tickMeta.count || 0 };
  }

  const frames = ['m1', 'm5', 'm15', 'm30', 'h1', 'h4', 'd1', 'mn1'];
  frames.forEach((frame) => {
    const base = `${lower}-${frame}`;
    const metaPath = path.join(DATA_DIR, `${base}-meta.json`);
    const meta = readJsonIfExists(metaPath);
    if (meta?.range) {
      ranges[frame] = {
        start: meta.range.start,
        end: meta.range.end,
        count: meta.totalCount || 0,
      };
      return;
    }

    // Fallback para formato legado { asset, timeframe, range, candles }
    const legacyFile = path.join(DATA_DIR, `${base}.json`);
    const json = readJsonIfExists(legacyFile);
    if (json?.range) {
      ranges[frame] = {
        start: json.range.start,
        end: json.range.end,
        count: Array.isArray(json.candles) ? json.candles.length : 0,
      };
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
    // Para ticks, usamos apenas o range da meta JSONL.
    const metaPath = path.join(RAW_DIR, `${asset.toLowerCase()}-ticks-meta.json`);
    const meta = readJsonIfExists(metaPath);
    return { data: [], range: meta?.range || {} };
  }

  const lowerAsset = asset.toLowerCase();
  const lowerTf = timeframe.toLowerCase();
  const base = `${lowerAsset}-${lowerTf}`;

  const metaPath = path.join(DATA_DIR, `${base}-meta.json`);
  const meta = readJsonIfExists(metaPath);

  // Se tivermos metadados e segmentos, montamos o array a partir dos segmentos.
  if (meta && Array.isArray(meta.segments) && meta.segments.length) {
    const all = [];
    let start = null;
    let end = null;

    const sortedSegments = [...meta.segments].sort((a, b) => {
      const ta = new Date(a.start || 0).getTime();
      const tb = new Date(b.start || 0).getTime();
      return ta - tb;
    });

    sortedSegments.forEach((segment) => {
      const filename = segment.file || `${base}-${segment.segment}.json`;
      const filepath = path.join(DATA_DIR, filename);
      const json = readJsonIfExists(filepath);
      if (!json || !Array.isArray(json.candles)) return;

      json.candles.forEach((candle) => {
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
    });

    return {
      data: all,
      range: start && end ? { start, end } : meta.range || {},
    };
  }

  // Fallback para formato legado { asset, timeframe, range, candles }
  const legacyPath = path.join(DATA_DIR, `${base}.json`);
  const legacyJson = readJsonIfExists(legacyPath);
  if (!legacyJson) return { data: [], range: {} };
  return {
    data: legacyJson.candles || [],
    range: legacyJson.range || {},
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
      const isTickFrame = false;
      const existingCount = existingRange?.count || 0;
      let totalCount = existingCount;
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
          const data = await fetchChunkWithSplits({
            jobId: job.id,
            source,
            frame,
            chunk,
            chunkIndex: cIdx,
            chunkCount: chunks.length,
          });
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
            writeCandlesToDisk(job.asset, frame, normalized, chunkRange);
            const rowsCount = normalized.length;
            totalCount += rowsCount;
            pushJobLog(
              job.id,
              `Chunk ${cIdx + 1}/${chunks.length} (${frame}) ok: ${rowsCount} rows (${chunkLabel})`
            );
            pushJobLog(
              job.id,
              `Persisted chunk ${cIdx + 1}/${chunks.length} (${frame}) to disk (approx count=${totalCount})`
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

      const effectiveCount = totalCount;
      const newCount = totalCount - existingCount;

      // Nenhum dado em absoluto (nem existente, nem novo).
      if (!effectiveCount) {
        pushJobLog(job.id, `No data returned for ${frame} (${range.fromIso} -> ${range.toIso})`);
        setFrameState(job.id, {
          frameProgress: 1,
          frameStage: 'skipped',
        });
        continue;
      }

      // Modo continue, mas nenhum candle novo foi retornado para um timeframe que já tinha dados.
      if (mode === 'continue' && existingCount > 0 && newCount <= 0) {
        pushJobLog(
          job.id,
          `No new data for ${frame}; existing range already covers ${existingRange?.start || '?'} -> ${existingRange?.end || '?'
          } (count=${existingCount})`
        );
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
        const formattedTotal = Number(effectiveCount).toLocaleString('en-US');
        const formattedNew = Number(newCount).toLocaleString('en-US');
        if (mode === 'continue' && existingCount > 0) {
          pushJobLog(
            job.id,
            `Downloaded ${formattedNew} new ${frame} candles (total=${formattedTotal})`
          );
        } else {
          pushJobLog(job.id, `Downloaded ${formattedTotal} ${frame} candles`);
        }
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
  const symbol = String(asset || '').toUpperCase();
  if (!ASSET_SOURCES[symbol]) {
    throw new Error(`Asset ${symbol} is not supported for Dukascopy import`);
  }
  if (timeframe && timeframe.toLowerCase() === 'tick') {
    throw new Error('Tick imports are disabled; use M1 or higher.');
  }
  const jobId = uuid();
  const existingRanges = readExistingRanges(symbol);
  const job = {
    id: jobId,
    serverBootId,
    status: 'running',
    progress: 0,
    logs: [],
    asset: symbol,
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
    deleteExistingAssetData(symbol);
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
