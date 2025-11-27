const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { exportCandlesToLean, normalizeTime } = require('./leanDataBridge');
const { defaultAlgorithm } = require('./lean/defaultAlgorithm');
const { parseNumber, parsePercent, parseEquityFromCharts, parseEquityCsv } = require('./lean/parsers');
const { LEAN_WORKSPACE_DIR, LEAN_DATA_DIR, LEAN_RESULTS_DIR, LEAN_ALGORITHMS_DIR } = require('../constants/paths');

/**
 * Serviço de integração com o Lean CLI.
 * Responsável por exportar candles, montar config, disparar o processo Lean
 * e normalizar o resultado em um objeto BacktestResult-like em memória.
 */

const jobs = new Map();

function ensureDir(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

function ensureWorkspace() {
  [LEAN_WORKSPACE_DIR, LEAN_DATA_DIR, LEAN_RESULTS_DIR, LEAN_ALGORITHMS_DIR].forEach(ensureDir);
}

function writeAlgorithm(code) {
  ensureWorkspace();
  const algoPath = path.join(LEAN_ALGORITHMS_DIR, 'Algorithm.py');
  const content = code && code.trim().length ? code : defaultAlgorithm();
  fs.writeFileSync(algoPath, content, 'utf-8');
  return algoPath;
}

function buildConfig(jobId, algorithmPath, options) {
  const jobDir = path.join(LEAN_RESULTS_DIR, jobId);
  ensureDir(jobDir);

  const startDate = options.startDate || null;
  const endDate = options.endDate || null;
  const cash = options.cash || 100000;
  const symbol = options.asset || 'SPY';
  const resolution = options.timeframe || 'Daily';
  const feeBps = typeof options.feeBps === 'number' ? options.feeBps : 0.5;
  const slippageBps = typeof options.slippageBps === 'number' ? options.slippageBps : 1;

  const config = {
    environment: 'backtesting',
    'algorithm-language': 'python',
    'algorithm-location': algorithmPath,
    'data-folder': LEAN_DATA_DIR,
    'results-destination-folder': jobDir,
    parameters: {
      symbol,
      resolution,
      cash,
      feeBps,
      slippageBps,
    },
    backtesting: {
      'start-date': startDate,
      'end-date': endDate,
      'cash-amount': cash,
    },
  };

  const configPath = path.join(jobDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  return { configPath, jobDir };
}

function parseTradesFromOrders(orders) {
  if (!orders || typeof orders !== 'object') return [];
  const items = Array.isArray(orders) ? orders : Object.values(orders);
  return items
    .filter(Boolean)
    .filter((order) => {
      const status = String(order.Status || '').toLowerCase();
      return status === 'filled' || status === 'completed' || status === '3';
    })
    .map((order, index) => {
      const time = order.Time || order.CreatedTime || Date.now();
      const quantity = Number(order.Quantity || 0);
      const direction = quantity < 0 ? 'short' : 'long';
      const price = Number(order.Price || order.FillPrice || 0);
      const profit = Number(order.Profit || order.FillQuantity ? (order.FillPrice || 0) * order.FillQuantity : 0);
      const profitPercent = order.ProfitPercent ? parsePercent(order.ProfitPercent) || 0 : 0;
      return {
        id: order.Id ? `ORD-${order.Id}` : `ORD-${index}`,
        entryTime: normalizeTime(time),
        exitTime: normalizeTime(time),
        entryPrice: price,
        exitPrice: price,
        direction,
        profit,
        profitPercent,
      };
    });
}

function findResultJson(jobDir) {
  const direct = path.join(jobDir, 'results.json');
  if (fs.existsSync(direct)) return direct;
  const result = path.join(jobDir, 'result.json');
  if (fs.existsSync(result)) return result;
  const backtest = path.join(jobDir, 'backtest.json');
  if (fs.existsSync(backtest)) return backtest;
  const nested = path.join(jobDir, 'results', 'results.json');
  if (fs.existsSync(nested)) return nested;
  return null;
}

function parseLeanResults(jobDir) {
  let raw = null;
  const resultJson = findResultJson(jobDir);
  if (resultJson) {
    try {
      raw = JSON.parse(fs.readFileSync(resultJson, 'utf-8'));
    } catch (err) {
      console.warn('[lean] failed to parse results.json', err);
    }
  }

  let equityCurve = [];
  let trades = [];
  let totalTrades = 0;
  let winRate = 0;
  let totalProfit = 0;
  let drawdown = 0;

  if (raw) {
    if (raw.Charts) {
      equityCurve = parseEquityFromCharts(raw.Charts);
    }

    if (raw.ClosedTrades) {
      const tradesArray = Array.isArray(raw.ClosedTrades) ? raw.ClosedTrades : Object.values(raw.ClosedTrades);
      trades = tradesArray
        .filter(Boolean)
        .map((trade, idx) => {
          const entryTime = normalizeTime(trade.EntryTime || trade.EntryTimeUtc || trade.EntryTimeLocal);
          const exitTime = normalizeTime(trade.ExitTime || trade.ExitTimeUtc || trade.ExitTimeLocal || entryTime);
          const direction = (trade.Direction || '').toLowerCase() === 'short' ? 'short' : 'long';
          const profit = parseNumber(trade.ProfitLoss) || 0;
          const profitPercent = parsePercent(trade.ProfitLossPercent) || 0;
          const entryPrice = parseNumber(trade.EntryPrice) || 0;
          const exitPrice = parseNumber(trade.ExitPrice) || entryPrice;
          return {
            id: trade.Id ? `TRD-${trade.Id}` : `TRD-${idx}`,
            entryTime,
            exitTime,
            entryPrice,
            exitPrice,
            direction,
            profit,
            profitPercent,
          };
        });
    } else if (raw.Orders) {
      trades = parseTradesFromOrders(raw.Orders);
    }

    const stats = raw.Statistics || raw.RuntimeStatistics || {};
    totalTrades = parseNumber(stats['Total Trades']) || trades.length || 0;
    winRate = parsePercent(stats['Win Rate']) ?? 0;
    totalProfit = parseNumber(stats['Total Net Profit']) ?? 0;
    drawdown = parsePercent(stats['Max Drawdown']) ?? 0;
  }

  if (!equityCurve.length) {
    const csvCandidate = fs.existsSync(path.join(jobDir, 'equity.csv'))
      ? path.join(jobDir, 'equity.csv')
      : path.join(jobDir, 'results', 'equity.csv');
    equityCurve = parseEquityCsv(csvCandidate);
  }

  return {
    totalTrades,
    winRate,
    totalProfit,
    drawdown,
    trades,
    equityCurve,
    rawStatistics: (raw && (raw.Statistics || raw.RuntimeStatistics)) || undefined,
  };
}

function summarizeJob(job) {
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    logs: job.logs,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    configPath: job.configPath,
    resultPath: job.resultPath,
    exitCode: job.exitCode,
    error: job.error,
  };
}

/**
 * Inicia um job de backtest Lean e retorna um snapshot do job.
 * options: { asset, timeframe, code?, startDate?, endDate?, cash?, feeBps?, slippageBps? }
 * O estado completo do job é mantido no Map `jobs` em memória.
 */
function startLeanBacktest(options) {
  ensureWorkspace();

  const jobId = uuidv4();
  const createdAt = Date.now();
  const baseJob = {
    id: jobId,
    status: 'queued',
    logs: [],
    createdAt,
    updatedAt: createdAt,
  };
  jobs.set(jobId, baseJob);

  let dataExport = null;
  try {
    dataExport = exportCandlesToLean(options.asset, options.timeframe);
    baseJob.logs.push(`[lean] exported ${dataExport.candleCount} candles to ${dataExport.filename}`);
  } catch (err) {
    baseJob.status = 'error';
    baseJob.error = err.message;
    baseJob.updatedAt = Date.now();
    jobs.set(jobId, baseJob);
    return summarizeJob(baseJob);
  }

  const algorithmPath = writeAlgorithm(options.code);
  const { configPath, jobDir } = buildConfig(jobId, algorithmPath, options);

  const leanBinary = process.env.LEAN_CLI_PATH || 'lean';
  const args = ['backtest', '--config', configPath];

  const child = spawn(leanBinary, args, { cwd: LEAN_WORKSPACE_DIR, shell: process.platform === 'win32' });

  const job = {
    ...baseJob,
    status: 'running',
    configPath,
    resultPath: jobDir,
    processId: child.pid,
  };
  jobs.set(jobId, job);

  child.stdout.on('data', (data) => {
    const line = data.toString();
    job.logs.push(line.trim());
    job.updatedAt = Date.now();
  });

  child.stderr.on('data', (data) => {
    const line = data.toString();
    job.logs.push(`[stderr] ${line.trim()}`);
    job.updatedAt = Date.now();
  });

  child.on('error', (error) => {
    job.status = 'error';
    job.error = error.message;
    job.updatedAt = Date.now();
    jobs.set(jobId, job);
  });

  child.on('exit', (code) => {
    job.exitCode = code;
    job.status = code === 0 ? 'completed' : 'error';
    job.updatedAt = Date.now();

    if (job.status === 'completed') {
      const parsed = parseLeanResults(jobDir);
      job.result = { ...parsed, source: 'lean', jobId };
    }

    if (job.status === 'error' && !job.error) {
      job.error = `Lean process exited with code ${code}`;
    }

    jobs.set(jobId, job);
  });

  return summarizeJob(job);
}

/**
 * Retorna um snapshot resumido do job Lean para o frontend.
 */
function getJob(jobId) {
  return summarizeJob(jobs.get(jobId));
}

/**
 * Retorna o resultado normalizado de um job Lean (BacktestResult-like).
 * Se ainda não estiver em memória, tenta reprocessar o resultado a partir de disco.
 */
function getResult(jobId) {
  const job = jobs.get(jobId);
  if (!job) return null;
  if (job.result) return job.result;
  if (job.resultPath && fs.existsSync(job.resultPath)) {
    const parsed = parseLeanResults(job.resultPath);
    job.result = { ...parsed, source: 'lean', jobId };
    jobs.set(jobId, job);
    return job.result;
  }
  return null;
}

module.exports = {
  startLeanBacktest,
  getJob,
  getResult,
};
