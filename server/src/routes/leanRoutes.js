const express = require('express');
const { startLeanBacktest, getJob, getResult } = require('../services/leanService');

const router = express.Router();

router.post('/run', (req, res) => {
  const { asset, timeframe, code, startDate, endDate, cash, feeBps, slippageBps } = req.body || {};
  if (!asset || !timeframe) {
    return res.status(400).json({ error: 'asset and timeframe are required' });
  }

  const job = startLeanBacktest({
    asset,
    timeframe,
    code,
    startDate,
    endDate,
    cash,
    feeBps,
    slippageBps,
  });
  const statusCode = job.status === 'error' ? 500 : 202;
  res.status(statusCode).json(job);
});

router.get('/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'job not found' });
  }
  res.json(job);
});

router.get('/results/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'job not found' });
  }

  if (job.status !== 'completed') {
    return res.status(202).json({ status: job.status });
  }

  const result = getResult(req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'result not available' });
  }

  res.json({ status: job.status, result });
});

module.exports = router;
