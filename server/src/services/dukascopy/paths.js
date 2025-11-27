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
  const files = [
    path.join(RAW_DIR, `${lower}-ticks.json`),
    path.join(RAW_DIR, `${lower}-ticks.jsonl`),
    path.join(RAW_DIR, `${lower}-ticks-meta.json`),
    path.join(DATA_DIR, `${lower}-m1.json`),
    path.join(DATA_DIR, `${lower}-m5.json`),
    path.join(DATA_DIR, `${lower}-m15.json`),
    path.join(DATA_DIR, `${lower}-m30.json`),
    path.join(DATA_DIR, `${lower}-h1.json`),
    path.join(DATA_DIR, `${lower}-h4.json`),
    path.join(DATA_DIR, `${lower}-d1.json`),
    path.join(DATA_DIR, `${lower}-mn1.json`),
  ];
  files.forEach((file) => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (error) {
        console.warn('[dukascopy] failed to delete file during restart mode', file, error);
      }
    }
  });
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
