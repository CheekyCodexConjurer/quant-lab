const express = require('express');
const { getNormalizationSettings, updateNormalizationSettings } = require('../services/normalizationService');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(getNormalizationSettings());
});

router.post('/', (req, res) => {
  const settings = updateNormalizationSettings(req.body || {});
  res.json(settings);
});

module.exports = router;
