const express = require('express');
const { listAssets, readCandles } = require('../services/dataCacheService');
const { getIndex } = require('../services/dataIndexService');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(listAssets());
});

router.get('/:asset/timeframes', (req, res) => {
  const { asset } = req.params;
  const index = getIndex();
  const entry = index[asset] || null;
  if (!entry) {
    return res.status(404).json({ error: 'asset not found' });
  }
  res.json({ asset, timeframes: entry });
});

router.get('/:asset/:timeframe', (req, res) => {
  const { asset, timeframe } = req.params;
  const data = readCandles(asset, timeframe);
  if (!data) {
    return res.status(404).json({ error: 'dataset not found' });
  }
  res.json(data);
});

module.exports = router;
