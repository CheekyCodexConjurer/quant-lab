const express = require('express');
const { listAssets, readCandles } = require('../services/dataCacheService');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(listAssets());
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

router.get('/:asset/:timeframe', (req, res) => {
  const { asset, timeframe } = req.params;
  const data = readCandles(asset, timeframe);
  if (!data) {
    return res.status(404).json({ error: 'dataset not found' });
  }
  res.json(data);
});

module.exports = router;
