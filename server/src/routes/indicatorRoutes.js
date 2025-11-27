const express = require('express');
const { listIndicators, readIndicator, writeIndicator, ensureSeed, encodeId, deleteIndicatorFile } = require('../services/indicatorFileService');
const { setIndicatorActive } = require('../services/indicatorStateStore');

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
  const { code, filePath, active } = req.body || {};
  const item = writeIndicator(req.params.id, code ?? '', filePath, active);
  res.json({ item });
});

router.delete('/:id', (req, res) => {
  ensureSeed();
  const ok = deleteIndicatorFile(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'indicator not found' });
  }
  res.json({ success: true });
});

router.post('/:id/active', (req, res) => {
  ensureSeed();
  const { active } = req.body || {};
  const updated = setIndicatorActive(req.params.id, Boolean(active));
  if (!updated) {
    return res.status(404).json({ error: 'indicator not found' });
  }
  res.json({ success: true, active: Boolean(active) });
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
