const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
// Workspace de indicadores Python (`server/indicators` relativo ao repo).
const INDICATORS_DIR = path.join(ROOT_DIR, 'indicators');
const STRATEGIES_DIR = path.join(ROOT_DIR, 'strategies');
const LEAN_WORKSPACE_DIR = path.join(ROOT_DIR, 'lean_workspace');
const LEAN_DATA_DIR = path.join(LEAN_WORKSPACE_DIR, 'data');
const LEAN_RESULTS_DIR = path.join(LEAN_WORKSPACE_DIR, 'results');
const LEAN_ALGORITHMS_DIR = path.join(LEAN_WORKSPACE_DIR, 'algorithms');

module.exports = {
  ROOT_DIR,
  INDICATORS_DIR,
  STRATEGIES_DIR,
  LEAN_WORKSPACE_DIR,
  LEAN_DATA_DIR,
  LEAN_RESULTS_DIR,
  LEAN_ALGORITHMS_DIR,
};
