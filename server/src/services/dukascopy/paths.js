const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../../data');
const CONFIG_DIR = path.join(DATA_DIR, 'config');
const JOBS_FILE = path.join(CONFIG_DIR, 'jobs.json');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const BOOT_FILE = path.join(CONFIG_DIR, 'serverBootId.json');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const deleteExistingAssetData = (asset) => {
  const lower = asset.toLowerCase();

  // Apaga arquivos de ticks associados ao asset
  const tickFiles = [
    path.join(RAW_DIR, `${lower}-ticks.json`),
    path.join(RAW_DIR, `${lower}-ticks.jsonl`),
    path.join(RAW_DIR, `${lower}-ticks-meta.json`),
  ];
  tickFiles.forEach((file) => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (error) {
        console.warn('[dukascopy] failed to delete tick file during restart mode', file, error);
      }
    }
  });

  // Apaga todos os segmentos e metadados de candles (m1, h1, etc) para o asset
  try {
    if (fs.existsSync(DATA_DIR)) {
      const entries = fs.readdirSync(DATA_DIR);
      entries.forEach((name) => {
        if (!name.endsWith('.json')) return;
        if (!name.startsWith(`${lower}-`)) return;
        const file = path.join(DATA_DIR, name);
        try {
          fs.unlinkSync(file);
        } catch (error) {
          console.warn('[dukascopy] failed to delete data file during restart mode', file, error);
        }
      });
    }
  } catch (error) {
    console.warn('[dukascopy] failed to scan DATA_DIR during restart mode', error);
  }
};

module.exports = {
  DATA_DIR,
  CONFIG_DIR,
  JOBS_FILE,
  RAW_DIR,
  BOOT_FILE,
  ensureDir,
  deleteExistingAssetData,
};
