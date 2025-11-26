const express = require('express');
const { runDukascopyJob, ingestCustomFile, getJob, previewDukascopy, serverBootId, cancelJob } = require('../services/dukascopyService');

const router = express.Router();

router.post('/dukascopy', async (req, res) => {
  const { asset, timeframe, mode, startDate, endDate, fullHistory } = req.body || {};
  if (!asset || !timeframe) {
    return res.status(400).json({ error: 'asset and timeframe are required' });
  }
  const job = await runDukascopyJob({ asset, timeframe, mode, startDate, endDate, fullHistory });
  res.status(202).json(job);
});

router.post('/dukascopy/check', (req, res) => {
  const { asset } = req.body || {};
  if (!asset) {
    return res.status(400).json({ error: 'asset is required' });
  }
  const preview = previewDukascopy({ asset });
  res.json(preview);
});

router.post('/custom', async (req, res) => {
  const { filename } = req.body || {};
  if (!filename) {
    return res.status(400).json({ error: 'filename is required' });
  }
  const job = await ingestCustomFile({ filename });
  res.status(202).json(job);
});

router.get('/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'job not found', serverBootId });
  }
  res.json({ ...job, serverBootId });
});

router.post('/jobs/:id/cancel', (req, res) => {
  const job = cancelJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'job not found', serverBootId });
  }
  res.json({ ...job, serverBootId });
});

module.exports = router;
