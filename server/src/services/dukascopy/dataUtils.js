const fs = require('fs');
const path = require('path');
const { ensureDir } = require('./paths');
const { safeWriteJson } = require('./jobStore');

const readJsonIfExists = (filepath) => {
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (error) {
    console.warn('[dukascopy] failed to parse existing file', filepath, error);
    return null;
  }
};

const mergeByTime = (existing = [], incoming = [], timeField = 'time') => {
  const combined = [...existing, ...incoming];
  combined.sort((a, b) => {
    const ta = new Date(a[timeField]).getTime();
    const tb = new Date(b[timeField]).getTime();
    return ta - tb;
  });
  const deduped = [];
  let lastTime = null;
  combined.forEach((item) => {
    const t = new Date(item[timeField]).getTime();
    if (Number.isNaN(t)) return;
    if (lastTime === t) {
      deduped[deduped.length - 1] = item;
    } else {
      deduped.push(item);
      lastTime = t;
    }
  });
  return deduped;
};

const writeJson = (filepath, payload) => {
  const dir = path.dirname(filepath);
  ensureDir(dir);
  safeWriteJson(filepath, payload);
};

module.exports = {
  readJsonIfExists,
  mergeByTime,
  writeJson,
};
