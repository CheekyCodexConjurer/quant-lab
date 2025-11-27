const express = require('express');
const { runDukascopyJob, ingestCustomFile, getJob, previewDukascopy, serverBootId, cancelJob } = require('../services/dukascopyService');

const router = express.Router();

router.post('/dukascopy', async (req, res) => {
  const { asset, timeframe, mode, startDate, endDate, fullHistory } = req.body || {};
  if (!asset || !timeframe) {
    return res.status(400).json({ error: 'asset and timeframe are required' });
  }
  try {
    const job = await runDukascopyJob({ asset, timeframe, mode, startDate, endDate, fullHistory });
    res.status(202).json(job);
  } catch (error) {
    const message = (error && error.message) || 'Failed to start Dukascopy import';
    const isUserError =
      message.includes('not supported for Dukascopy import') || message.includes('Tick imports are disabled');
    const statusCode = isUserError ? 400 : 500;
    console.error('[import] dukascopy job failed to start', error);
    res.status(statusCode).json({ error: message });
  }
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
