const express = require('express');
const { getLogs, logInfo } = require('../services/logger');
const { getWindow, getSummary } = require('../services/marketWindowService');
const { listIndicators, readIndicator } = require('../services/indicatorFileService');
const { runIndicatorById } = require('../services/indicatorExecutionService');
const datasetCoverageService = require('../services/datasetCoverageService');

const router = express.Router();

const parseCommand = (inputRaw) => {
  const input = String(inputRaw || '').trim();
  if (!input) return { cmd: 'help', args: [] };
  const parts = input.split(/\s+/);
  const [cmd, ...rest] = parts;
  return { cmd: cmd.toLowerCase(), args: rest };
};

const buildResponse = (lines, extra = {}) => ({
  ok: true,
  lines,
  ...extra,
});

router.get('/health', async (_req, res) => {
  try {
    const indicators = listIndicators();
    const coverage = await datasetCoverageService.getDatasetCoverage();
    const assets = Array.isArray(coverage?.assets) ? coverage.assets : coverage || [];
    const cl = assets.find((a) => String(a.asset || '').toUpperCase() === 'CL1!');

    const summary = cl && Array.isArray(cl.timeframes) && cl.timeframes.length
      ? getSummary({ asset: 'cl1!', timeframe: cl.timeframes[0] })
      : null;

    res.json({
      ok: true,
      debugEnabled: Boolean(process.env.THELAB_DEBUG),
      indicators: {
        total: indicators.length,
        active: indicators.filter((i) => i.active).length,
      },
      datasets: {
        assets: assets.map((a) => a.asset),
        cl1: cl || null,
        sampleSummary: summary || null,
      },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: { type: 'DebugHealthError', message: error.message || String(error) },
    });
  }
});

router.get('/logs', (req, res) => {
  const { level, module, limit } = req.query || {};
  const parsedLimit = limit ? Number(limit) : undefined;
  const entries = getLogs({ level, module, limit: parsedLimit });
  res.json({ ok: true, entries });
});

router.post('/shutdown', (req, res) => {
  // Local-only helper to allow the desktop shell to request a clean backend restart.
  res.json({ ok: true, message: 'Backend shutting down' });
  setTimeout(() => {
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  }, 100);
});

router.post('/terminal', async (req, res) => {
  const { input } = req.body || {};
  const { cmd, args } = parseCommand(input);

  const lines = [];
  const write = (text) => {
    lines.push(String(text));
  };

  try {
    switch (cmd) {
      case 'help': {
        write('Available commands:');
        write('- help');
        write('- health');
        write('- list indicators');
        write('- inspect indicator <id>');
        write('- run indicator <id> [--asset=CL1!] [--tf=M15] [--len=1000]');
        write('- inspect dataset <asset> <timeframe>');
        return res.json(buildResponse(lines));
      }
      case 'health': {
        logInfo('debugTerminal: health', { module: 'debug' });
        const indicators = listIndicators();
        const coverage = await datasetCoverageService.getDatasetCoverage();
        const assets = Array.isArray(coverage?.assets) ? coverage.assets : coverage || [];
        write(`Backend OK. Indicators: ${indicators.length} (active: ${indicators.filter((i) => i.active).length})`);
        write(`Datasets: ${assets.map((a) => a.asset).join(', ') || 'none'}`);
        return res.json(buildResponse(lines, { indicators, assets }));
      }
      case 'list': {
        if (args[0] && args[0].toLowerCase() === 'indicators') {
          const indicators = listIndicators();
          if (!indicators.length) {
            write('No indicators found.');
          } else {
            indicators.forEach((ind) => {
              write(
                `${ind.id}  active=${ind.active ? 'yes' : 'no'}  path=${ind.filePath}`,
              );
            });
          }
          return res.json(buildResponse(lines, { indicators }));
        }
        write('Unknown list target. Try: list indicators');
        return res.json(buildResponse(lines));
      }
      case 'inspect': {
        const target = (args[0] || '').toLowerCase();
        if (target === 'indicator') {
          const id = args[1];
          if (!id) {
            write('Usage: inspect indicator <id>');
            return res.json(buildResponse(lines));
          }
          const item = readIndicator(id);
          if (!item) {
            write(`Indicator not found: ${id}`);
            return res.json(buildResponse(lines));
          }
          write(`Indicator: ${item.id}`);
          write(`Name: ${item.name}`);
          write(`Path: ${item.filePath}`);
          write(`Last modified: ${new Date(item.lastModified).toISOString()}`);
          write(`Size: ${item.sizeBytes} bytes`);
          return res.json(buildResponse(lines, { indicator: item }));
        }
        if (target === 'dataset') {
          const asset = args[1];
          const timeframe = args[2];
          if (!asset || !timeframe) {
            write('Usage: inspect dataset <asset> <timeframe>');
            return res.json(buildResponse(lines));
          }
          const summary = getSummary({ asset: asset.toLowerCase(), timeframe: timeframe.toLowerCase() });
          if (!summary) {
            write(`No dataset found for ${asset}/${timeframe}`);
            return res.json(buildResponse(lines));
          }
          write(`Dataset ${asset}/${timeframe}`);
          write(`Range: ${summary.range?.start} -> ${summary.range?.end}`);
          write(`Count: ${summary.count}`);
          return res.json(buildResponse(lines, { summary }));
        }
        write('Unknown inspect target. Try: inspect indicator <id> or inspect dataset <asset> <timeframe>');
        return res.json(buildResponse(lines));
      }
      case 'run': {
        const target = (args[0] || '').toLowerCase();
        if (target !== 'indicator') {
          write('Usage: run indicator <id> [--asset=CL1!] [--tf=M15] [--len=1000]');
          return res.json(buildResponse(lines));
        }
        const id = args[1];
        if (!id) {
          write('Usage: run indicator <id> [--asset=CL1!] [--tf=M15] [--len=1000]');
          return res.json(buildResponse(lines));
        }
        let asset = 'cl1!';
        let timeframe = 'm15';
        let length = 1000;
        args.slice(2).forEach((token) => {
          const m = /^--([^=]+)=(.+)$/.exec(token);
          if (!m) return;
          const key = m[1].toLowerCase();
          const value = m[2];
          if (key === 'asset') asset = value.toLowerCase();
          if (key === 'tf' || key === 'timeframe') timeframe = value.toLowerCase();
          if (key === 'len' || key === 'length') {
            const n = Number(value);
            if (Number.isFinite(n) && n > 0) length = Math.floor(n);
          }
        });
        const window = getWindow({ asset, timeframe, limit: length });
        if (!window || !Array.isArray(window.candles) || !window.candles.length) {
          write(`No candles for ${asset}/${timeframe}`);
          return res.json(buildResponse(lines));
        }
        write(`Running indicator ${id} on ${asset}/${timeframe} with ${window.candles.length} candles...`);
        const result = await runIndicatorById(id, window.candles);
        if (!result.ok) {
          write(`ERROR: ${result.error?.type || 'IndicatorError'} - ${result.error?.message || ''}`);
          return res.json(buildResponse(lines, { result }));
        }
        const main = Array.isArray(result.series?.main) ? result.series.main : [];
        write(`OK. main.length=${main.length}`);
        if (main[0]) {
          write(`first: time=${main[0].time} value=${main[0].value}`);
        }
        if (main[main.length - 1]) {
          const last = main[main.length - 1];
          write(`last: time=${last.time} value=${last.value}`);
        }
        return res.json(buildResponse(lines, { resultSummary: { mainLength: main.length } }));
      }
      default: {
        write(`Unknown command: ${cmd}`);
        write('Type "help" for available commands.');
        return res.json(buildResponse(lines));
      }
    }
  } catch (error) {
    return res.status(500).json({
      ok: false,
      lines,
      error: { type: 'DebugTerminalError', message: error.message || String(error) },
    });
  }
});

module.exports = router;
