const express = require('express');
const { listIndicators, readIndicator, writeIndicator, ensureSeed } = require('../services/indicatorFileService');

const router = express.Router();

router.get('/', (_req, res) => {
  ensureSeed();
  const items = listIndicators();
  res.json({ items });
});

router.get('/:id', (req, res) => {
  ensureSeed();
  const item = readIndicator(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'indicator not found' });
  }
  res.json({ item });
});

router.post('/:id', (req, res) => {
  ensureSeed();
  const { code } = req.body || {};
  const item = writeIndicator(req.params.id, code || '');
  res.json({ item });
});

module.exports = router;
