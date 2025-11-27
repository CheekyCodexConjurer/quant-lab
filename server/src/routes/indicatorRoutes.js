const express = require('express');
const { listIndicators, readIndicator, writeIndicator, ensureSeed, encodeId } = require('../services/indicatorFileService');

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
  const { code, filePath } = req.body || {};
  const item = writeIndicator(req.params.id, code || '', filePath);
  res.json({ item });
});

// convenience route for uploads with arbitrary paths
router.post('/', (req, res) => {
  ensureSeed();
  const { code, filePath } = req.body || {};
  if (!filePath) {
    return res.status(400).json({ error: 'filePath is required' });
  }
  const id = encodeId(filePath);
  const item = writeIndicator(id, code || '', filePath);
  res.json({ item });
});

module.exports = router;
