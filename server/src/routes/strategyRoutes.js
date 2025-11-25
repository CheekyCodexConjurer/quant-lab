const express = require('express');
const { listStrategies, readStrategy, writeStrategy, ensureSeed } = require('../services/strategyFileService');

const router = express.Router();

router.get('/', (_req, res) => {
  ensureSeed();
  const items = listStrategies();
  res.json({ items });
});

router.get('/:id', (req, res) => {
  ensureSeed();
  const item = readStrategy(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'strategy not found' });
  }
  res.json({ item });
});

router.post('/:id', (req, res) => {
  ensureSeed();
  const { code } = req.body || {};
  const item = writeStrategy(req.params.id, code || '');
  res.json({ item });
});

module.exports = router;
