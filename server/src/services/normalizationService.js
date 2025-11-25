const defaultSettings = {
  timezone: 'UTC-3',
  tickSize: 0.01,
  basis: 'median',
};

let currentSettings = { ...defaultSettings };

function getNormalizationSettings() {
  return currentSettings;
}

function updateNormalizationSettings(newSettings = {}) {
  currentSettings = {
    ...currentSettings,
    ...newSettings,
  };
  return currentSettings;
}

function describeNormalization() {
  const { timezone, tickSize, basis } = currentSettings;
  return `Normalization -> tz: ${timezone}, tickSize: ${tickSize}, basis: ${basis}`;
}

module.exports = {
  getNormalizationSettings,
  updateNormalizationSettings,
  describeNormalization,
};
