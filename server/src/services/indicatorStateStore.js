const fs = require('fs');
const path = require('path');
const { INDICATORS_DIR } = require('../constants/paths');

const STATE_PATH = path.join(INDICATORS_DIR, 'indicator-state.json');

const ensureDir = () => {
  if (!fs.existsSync(INDICATORS_DIR)) {
    fs.mkdirSync(INDICATORS_DIR, { recursive: true });
  }
};

const loadState = () => {
  ensureDir();
  if (!fs.existsSync(STATE_PATH)) return {};
  try {
    const raw = fs.readFileSync(STATE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveState = (state) => {
  ensureDir();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
};

const getIndicatorActive = (id) => {
  const state = loadState();
  return Boolean(state[id]);
};

const setIndicatorActive = (id, active) => {
  if (!id) return false;
  const state = loadState();
  state[id] = Boolean(active);
  saveState(state);
  return true;
};

const removeIndicator = (id) => {
  const state = loadState();
  if (state[id] === undefined) return;
  delete state[id];
  saveState(state);
};

module.exports = {
  loadState,
  saveState,
  getIndicatorActive,
  setIndicatorActive,
  removeIndicator,
};
