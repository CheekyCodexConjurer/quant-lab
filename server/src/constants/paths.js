const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const INDICATORS_DIR = path.join(ROOT_DIR, 'indicators');
const STRATEGIES_DIR = path.join(ROOT_DIR, 'strategies');

module.exports = {
  ROOT_DIR,
  INDICATORS_DIR,
  STRATEGIES_DIR,
};
