const express = require('express');
const { validateLicenseKey } = require('../services/licenseService');

const router = express.Router();

router.post('/validate', (req, res) => {
  const body = req.body || {};
  const key = typeof body.key === 'string' ? body.key : '';
  const result = validateLicenseKey(key);
  res.json(result);
});

module.exports = router;

