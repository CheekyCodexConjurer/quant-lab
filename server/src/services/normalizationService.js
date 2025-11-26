const fs = require('fs');
const path = require('path');

const defaultSettings = {
  timezone: 'UTC-3',
  tickSize: 0.01,
  basis: 'median',
  gapQuantization: {
    enabled: false,
  },
};

const CONFIG_DIR = path.join(__dirname, '../../data/config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'normalization.json');

const ensureConfigDir = () => {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
};

const loadSettingsFromDisk = () => {
  try {
    ensureConfigDir();
    if (!fs.existsSync(CONFIG_FILE)) return { ...defaultSettings };
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...defaultSettings,
      ...(parsed || {}),
      gapQuantization: { ...defaultSettings.gapQuantization, ...(parsed?.gapQuantization || {}) },
    };
  } catch (err) {
    console.warn('[normalization] failed to load settings, using defaults', err);
    return { ...defaultSettings };
  }
};

const saveSettingsToDisk = (settings) => {
  try {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[normalization] failed to persist settings', err);
  }
};

let currentSettings = loadSettingsFromDisk();

function getNormalizationSettings() {
  return currentSettings;
}

function updateNormalizationSettings(newSettings = {}) {
  currentSettings = {
    ...currentSettings,
    ...newSettings,
    gapQuantization: {
      ...currentSettings.gapQuantization,
      ...(newSettings.gapQuantization || {}),
    },
  };
  saveSettingsToDisk(currentSettings);
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
