const express = require('express');
const { listStrategies, readStrategy, writeStrategy, ensureSeed, encodeId, deleteStrategy } = require('../services/strategyFileService');

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
  const { code, filePath } = req.body || {};
  const item = writeStrategy(req.params.id, code || '', filePath);
  res.json({ item });
});

router.post('/', (req, res) => {
  ensureSeed();
  const { code, filePath } = req.body || {};
  if (!filePath) {
    return res.status(400).json({ error: 'filePath is required' });
  }
  const id = encodeId(filePath);
  const item = writeStrategy(id, code || '', filePath);
  res.json({ item });
});

router.delete('/:id', (req, res) => {
  ensureSeed();
  const ok = deleteStrategy(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'strategy not found' });
  }
  res.json({ ok: true });
});

module.exports = router;
