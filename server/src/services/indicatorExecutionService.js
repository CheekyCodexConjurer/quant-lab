const { spawn } = require('child_process');
const path = require('path');
const { ROOT_DIR, INDICATORS_DIR } = require('../constants/paths');
const { readIndicator } = require('./indicatorFileService');

const PYTHON_BIN = process.env.THELAB_PYTHON_PATH || 'python';
const RUNNER_PATH = path.join(ROOT_DIR, 'indicator_runner', 'runner.py');

const DEFAULT_TIMEOUT_MS = 5000;

const alignSeriesWithCandles = (values, candles) => {
  if (!Array.isArray(values)) return [];
  if (!Array.isArray(candles) || candles.length === 0) {
    return values.map((value, index) => ({ time: index, value }));
  }
  const n = values.length;
  const offset = Math.max(0, candles.length - n);
  const result = [];
  for (let i = 0; i < n; i++) {
    const candle = candles[offset + i] || candles[i] || candles[candles.length - 1];
    if (!candle) continue;
    const value = values[i];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    result.push({ time: candle.time, value });
  }
  return result;
};

const runIndicatorById = (id, candles, options = {}) => {
  const timeoutMs = typeof options.timeoutMs === 'number' ? options.timeoutMs : DEFAULT_TIMEOUT_MS;

  if (!Array.isArray(candles) || candles.length === 0) {
    return Promise.resolve({
      ok: false,
      error: { type: 'InputError', message: 'candles array is required and must be non-empty' },
    });
  }

  const meta = readIndicator(id);
  if (!meta || !meta.filePath) {
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
  };

  return new Promise((resolve) => {
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
      finalize({
        ok: false,
        error: { type: 'SpawnError', message: err.message },
      });
    });

    child.on('close', () => {
      clearTimeout(timer);
      if (!stdout.trim()) {
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
          finalize({
            ok: false,
            error: { type: 'RunnerError', message: 'invalid JSON from runner' },
          });
          return;
        }
        if (raw.ok === false) {
          finalize({
            ok: false,
            error: raw.error || { type: 'RunnerError', message: 'indicator execution failed' },
          });
          return;
        }
        const series = raw.series || {};
        const mainValues = Array.isArray(series.main) ? series.main : [];
        const mainSeries = alignSeriesWithCandles(mainValues, candles);
        finalize({
          ok: true,
          series: {
            main: mainSeries,
            ...series,
          },
          markers: Array.isArray(raw.markers) ? raw.markers : [],
          levels: Array.isArray(raw.levels) ? raw.levels : [],
          meta: raw.meta || {},
        });
      } catch (err) {
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
