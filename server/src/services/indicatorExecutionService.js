const { spawn } = require('child_process');
const path = require('path');
const { ROOT_DIR, INDICATORS_DIR } = require('../constants/paths');
const { readIndicator } = require('./indicatorFileService');
const { logDebug, logError, logWarn } = require('./logger');
const { adaptLegacyToPlots, normalizePlots } = require('./indicatorOverlayAdapter');
const {
  alignSeriesWithCandles,
  alignMarkerWithCandles,
  alignLevelWithCandles,
} = require('./indicatorOverlayAlign');

const PYTHON_BIN = process.env.THELAB_PYTHON_PATH || 'python';
const RUNNER_PATH = path.join(ROOT_DIR, 'indicator_runner', 'runner.py');

const DEFAULT_TIMEOUT_MS = 5000;

const runIndicatorById = (id, candles, options = {}) => {
  const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
  const settings = options && typeof options.settings === 'object' ? options.settings : null;

  if (!Array.isArray(candles) || candles.length === 0) {
    logWarn('runIndicatorById called with empty candles', { module: 'indicatorExecution', id });
    return Promise.resolve({
      ok: false,
      error: { type: 'InputError', message: 'candles array is required and must be non-empty' },
    });
  }

  const meta = readIndicator(id);
  if (!meta || !meta.filePath) {
    logWarn('indicator not found for id', { module: 'indicatorExecution', id });
    return Promise.resolve({
      ok: false,
      error: { type: 'NotFound', message: `indicator not found for id: ${id}` },
    });
  }

  const scriptPath = meta.filePath.includes(INDICATORS_DIR)
    ? meta.filePath
    : path.join(INDICATORS_DIR, meta.filePath);

  const payload = {
    apiVersion: 1,
    inputs: {
      open: candles.map((c) => c.open),
      high: candles.map((c) => c.high),
      low: candles.map((c) => c.low),
      close: candles.map((c) => c.close),
      volume: candles.map((c) => (typeof c.volume === 'number' ? c.volume : 0)),
    },
    settings: settings || undefined,
  };

  return new Promise((resolve) => {
    logDebug('runIndicatorById: spawning runner', {
      module: 'indicatorExecution',
      id,
      filePath: scriptPath,
      candles: candles.length,
      timeoutMs,
    });
    const child = spawn(PYTHON_BIN, [RUNNER_PATH, scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let finished = false;

    const finalize = (result) => {
      if (finished) return;
      finished = true;
      resolve(result);
    };

    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        /* ignore */
      }
      finalize({
        ok: false,
        error: { type: 'Timeout', message: `indicator execution exceeded ${timeoutMs}ms` },
      });
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      logError('indicator runner spawn error', {
        module: 'indicatorExecution',
        id,
        error: err && err.message,
      });
      finalize({
        ok: false,
        error: { type: 'SpawnError', message: err.message },
      });
    });

    child.on('close', () => {
      clearTimeout(timer);
      if (!stdout.trim()) {
        logError('indicator runner produced no output', {
          module: 'indicatorExecution',
          id,
          stderr,
        });
        finalize({
          ok: false,
          error: {
            type: 'RunnerError',
            message: 'indicator runner produced no output',
            stderr,
          },
        });
        return;
      }
      try {
        const raw = JSON.parse(stdout);
        if (!raw || typeof raw !== 'object') {
          logError('invalid JSON from indicator runner', {
            module: 'indicatorExecution',
            id,
            stdout,
          });
          finalize({
            ok: false,
            error: { type: 'RunnerError', message: 'invalid JSON from runner' },
          });
          return;
        }
        if (raw.ok === false) {
          logWarn('indicator execution returned error', {
            module: 'indicatorExecution',
            id,
            error: raw.error,
          });
          finalize({
            ok: false,
            error: raw.error || { type: 'RunnerError', message: 'indicator execution failed' },
          });
          return;
        }
        const rawSeries = raw.series || {};
        const normalizedSeries = {};
        const entries = Object.entries(rawSeries);
        if (entries.length === 0 && Array.isArray(rawSeries)) {
          normalizedSeries.main = alignSeriesWithCandles(rawSeries, candles);
        } else {
          entries.forEach(([key, value]) => {
            if (!Array.isArray(value)) return;
            const first = value[0];
            if (first && typeof first === 'object' && first.time !== undefined && first.value !== undefined) {
              normalizedSeries[key] = value;
            } else {
              normalizedSeries[key] = alignSeriesWithCandles(value, candles);
            }
          });
          if (!normalizedSeries.main && Array.isArray(rawSeries.main)) {
            normalizedSeries.main = alignSeriesWithCandles(rawSeries.main, candles);
          }
        }
        const normalizedMarkers = Array.isArray(raw.markers)
          ? raw.markers
              .map((marker) => alignMarkerWithCandles(marker, candles))
              .filter((m) => m && m.time !== undefined)
          : [];

        const normalizedLevels = Array.isArray(raw.levels)
          ? raw.levels
              .map((level) => alignLevelWithCandles(level, candles))
              .filter((l) => l && l.timeStart !== undefined && l.timeEnd !== undefined)
          : [];

        const rawPlots = Array.isArray(raw.plots) ? raw.plots : null;
        const plots = rawPlots
          ? normalizePlots(rawPlots, candles)
          : adaptLegacyToPlots(rawSeries, raw.markers, raw.levels, candles);

        finalize({
          ok: true,
          series: normalizedSeries,
          markers: normalizedMarkers,
          levels: normalizedLevels,
          plots,
          meta: raw.meta || {},
        });
      } catch (err) {
        logError('failed to parse indicator runner output', {
          module: 'indicatorExecution',
          id,
          error: err && err.message,
          stdout,
        });
        finalize({
          ok: false,
          error: {
            type: 'ParseError',
            message: `failed to parse runner output: ${(err && err.message) || String(err)}`,
            stderr,
          },
        });
      }
    });

    try {
      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    } catch (err) {
      clearTimeout(timer);
      finalize({
        ok: false,
        error: { type: 'StdinError', message: (err && err.message) || String(err) },
      });
    }
  });
};

module.exports = {
  runIndicatorById,
};
