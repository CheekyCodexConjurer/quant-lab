const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { exportCandlesToLean, normalizeTime } = require('./leanDataBridge');
const { LEAN_WORKSPACE_DIR, LEAN_DATA_DIR, LEAN_RESULTS_DIR, LEAN_ALGORITHMS_DIR } = require('../constants/paths');

const jobs = new Map();

function ensureDir(targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

function ensureWorkspace() {
  [LEAN_WORKSPACE_DIR, LEAN_DATA_DIR, LEAN_RESULTS_DIR, LEAN_ALGORITHMS_DIR].forEach(ensureDir);
}

function defaultAlgorithm() {
  return [
    "from AlgorithmImports import *",
    "",
    "class LocalLeanExample(QCAlgorithm):",
    "    def Initialize(self):",
    "        self.SetStartDate(2020, 1, 1)",
    "        self.SetEndDate(2020, 6, 1)",
    "        cash = self.GetParameter('cash') or 100000",
    "        self.SetCash(float(cash))",
    "        symbol = self.GetParameter('symbol') or 'SPY'",
    "        resolution = self.GetParameter('resolution') or 'Minute'",
    "        fee_bps = float(self.GetParameter('feeBps') or 0.5)",
    "        slippage_bps = float(self.GetParameter('slippageBps') or 1)",
    "        self.symbol = self.AddEquity(symbol, self._parse_resolution(resolution)).Symbol",
    "        self.SetSecurityInitializer(lambda sec: self._configure_costs(sec, fee_bps, slippage_bps))",
    "        self.short = self.SMA(self.symbol, 9, Resolution.Daily)",
    "        self.long = self.SMA(self.symbol, 21, Resolution.Daily)",
    "        self.SetWarmup(30)",
    "",
    "    def _parse_resolution(self, value):",
    "        mapping = {",
    "            'tick': Resolution.Tick,",
    "            'second': Resolution.Second,",
    "            'minute': Resolution.Minute,",
    "            'hour': Resolution.Hour,",
    "            'daily': Resolution.Daily,",
    "            'day': Resolution.Daily,",
    "        }",
    "        return mapping.get((value or '').lower(), Resolution.Minute)",
    "",
    "    def _configure_costs(self, security, fee_bps, slippage_bps):",
    "        # bps -> decimal",
    "        fee = float(fee_bps) / 10000.0",
    "        slippage = float(slippage_bps) / 10000.0",
    "        security.SetFeeModel(ConstantFeeModel(fee))",
    "        security.SetSlippageModel(ConstantSlippageModel(slippage))",
    "",
    "    def OnData(self, data: Slice):",
    "        if self.IsWarmingUp:",
    "            return",
    "        if not (self.short.IsReady and self.long.IsReady):",
    "            return",
    "        holdings = self.Portfolio[self.symbol].Quantity",
    "        if holdings <= 0 and self.short.Current.Value > self.long.Current.Value:",
    "            self.SetHoldings(self.symbol, 1)",
    "        elif holdings > 0 and self.short.Current.Value < self.long.Current.Value:",
    "            self.Liquidate(self.symbol)",
  ].join('\n');
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

function fromOADate(value) {
  const millis = (value - 25569) * 86400 * 1000;
  return new Date(millis);
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[$,%]/g, '').replace(/,/g, '').trim();
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
}

function parsePercent(value) {
  const num = parseNumber(value);
  if (num === null) return null;
  const hasPercent = typeof value === 'string' && value.includes('%');
  return hasPercent ? num / 100 : num;
}

function parseEquityFromCharts(charts) {
  if (!charts || typeof charts !== 'object') return [];
  const chartNames = Object.keys(charts);
  for (const chartName of chartNames) {
    const chart = charts[chartName];
    if (!chart?.Series) continue;
    const seriesNames = Object.keys(chart.Series);
    for (const seriesName of seriesNames) {
      const series = chart.Series[seriesName];
      if (!series?.Values || !Array.isArray(series.Values)) continue;
      return series.Values.map((point) => {
        const { x, y } = point || {};
        const time = typeof x === 'number' ? fromOADate(x).toISOString() : normalizeTime(x);
        return { time, value: Number(y || 0) };
      });
    }
  }
  return [];
}

function parseEquityCsv(csvPath) {
  if (!fs.existsSync(csvPath)) return [];
  const [header, ...rows] = fs.readFileSync(csvPath, 'utf-8').split(/\r?\n/).filter(Boolean);
  if (!header || !header.toLowerCase().includes('time')) return [];
  return rows.map((line) => {
    const [timeRaw, valueRaw] = line.split(',');
    const value = Number(valueRaw || 0);
    return { time: normalizeTime(timeRaw), value };
  });
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

function getJob(jobId) {
  return summarizeJob(jobs.get(jobId));
}

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
