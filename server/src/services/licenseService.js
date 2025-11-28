const normalizeKey = (rawKey) => {
  if (typeof rawKey !== 'string') return '';
  return rawKey.trim();
};

const detectModeFromKey = (rawKey) => {
  const key = normalizeKey(rawKey);
  if (!key) return 'internal';
  if (key.toUpperCase().startsWith('TLAB-')) return 'early-access';
  return 'expired';
};

function validateLicenseKey(rawKey) {
  const normalizedKey = normalizeKey(rawKey);
  const mode = detectModeFromKey(normalizedKey);

  const isValid = mode === 'early-access';
  const reason =
    mode === 'early-access'
      ? 'Key accepted locally for Early Access.'
      : mode === 'expired'
        ? 'Key format not recognized for Early Access; treated as expired locally.'
        : 'No key provided; running in internal mode.';

  return {
    key: normalizedKey || null,
    mode,
    isValid,
    source: 'local-only',
    reason,
  };
}

module.exports = {
  validateLicenseKey,
};

