const express = require('express');
const { listAssets, readCandles } = require('../services/dataCacheService');
const { getWindow, getSummary } = require('../services/marketWindowService');
const { getCoverageSnapshot } = require('../services/datasetCoverageService');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(listAssets());
});

router.get('/coverage', (req, res) => {
  const rebuild = req.query && String(req.query.rebuild || '').toLowerCase() === 'true';
  const snapshot = getCoverageSnapshot({ rebuild });
  res.json(snapshot);
});

router.get('/:asset/timeframes', (req, res) => {
  const { asset } = req.params;
  const assets = listAssets();
  const found = assets.find((a) => a.asset === asset);

  if (!found) {
    return res.status(404).json({ error: 'asset not found' });
  }
  res.json({ asset, timeframes: found.timeframes });
});

router.get('/:asset/:timeframe/summary', (req, res) => {
  const { asset, timeframe } = req.params;
  const summary = getSummary({ asset, timeframe });
  if (!summary) {
    return res.status(404).json({ error: 'dataset not found' });
  }
  res.json(summary);
});

router.get('/:asset/:timeframe', (req, res) => {
  const { asset, timeframe } = req.params;
  const { to, limit } = req.query;
  const numericLimit = limit ? Number(limit) : null;

  if (numericLimit && numericLimit > 0) {
    const window = getWindow({ asset, timeframe, to, limit: numericLimit });
    if (!window) {
      return res.status(404).json({ error: 'dataset not found' });
    }
    return res.json(window);
  }

  const data = readCandles(asset, timeframe);
  if (!data) {
    return res.status(404).json({ error: 'dataset not found' });
  }

  const payload = { ...data };
  const candles = Array.isArray(payload.candles) ? payload.candles : [];

  // Safety limit to avoid gigantic JSON responses.
  const MAX_CANDLES_RESPONSE = 50_000;
  if (candles.length > MAX_CANDLES_RESPONSE) {
    const sliced = candles.slice(candles.length - MAX_CANDLES_RESPONSE);
    const first = sliced[0];
    if (first && first.time && payload.range && payload.range.end) {
      payload.range = {
        start: first.time,
        end: payload.range.end,
      };
    }
    payload.candles = sliced;
  }

  res.json(payload);
});

module.exports = router;
