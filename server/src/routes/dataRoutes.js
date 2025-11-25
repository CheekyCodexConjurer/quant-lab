const express = require('express');
const { listAssets, readCandles } = require('../services/dataCacheService');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(listAssets());
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
