const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const { ROOT_DIR } = require('../constants/paths');

const router = express.Router();

const resolveWorkspacePath = (inputPath) => {
  const raw = String(inputPath || '');
  if (!raw) return null;
  const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  if (path.isAbsolute(normalized)) {
    return path.resolve(normalized);
  }
  const safe = normalized.replace(/^(\.\.\/)+/, '');
  return path.resolve(path.join(ROOT_DIR, safe));
};

router.post('/open', (req, res) => {
  const { filePath } = req.body || {};
  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: 'filePath is required' });
  }

  const resolved = resolveWorkspacePath(filePath);
  if (!resolved) {
    return res.status(400).json({ error: 'Invalid filePath' });
  }

  try {
    const platform = process.platform;
    if (platform === 'win32') {
      const args = ['/select,', resolved];
      const child = spawn('explorer.exe', args, { detached: true, stdio: 'ignore' });
      child.unref();
    } else if (platform === 'darwin') {
      const child = spawn('open', ['-R', resolved], { detached: true, stdio: 'ignore' });
      child.unref();
    } else {
      const dir = path.dirname(resolved);
      const child = spawn('xdg-open', [dir], { detached: true, stdio: 'ignore' });
      child.unref();
    }
    res.json({ success: true });
  } catch (error) {
    // Best-effort helper; log and return 500 on failure.
    console.error('[paths] Failed to open folder', error);
    res.status(500).json({ error: 'Failed to open folder' });
  }
});

module.exports = router;

