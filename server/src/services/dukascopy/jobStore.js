const fs = require('fs');
const { JOBS_FILE, BOOT_FILE, ensureDir } = require('./paths');

const jobs = new Map();

const safeWriteJson = (filepath, payload) => {
  const tmp = `${filepath}.tmp`;
  const dir = require('path').dirname(filepath);
  ensureDir(dir);
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
  fs.renameSync(tmp, filepath);
};

const loadOrCreateBootId = () => {
  ensureDir(require('path').dirname(BOOT_FILE));
  if (fs.existsSync(BOOT_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(BOOT_FILE, 'utf8'));
      if (saved?.serverBootId) return saved.serverBootId;
    } catch (error) {
      console.warn('[dukascopy] failed to read serverBootId, regenerating', error);
    }
  }
  const { v4: uuid } = require('uuid');
  const fresh = uuid();
  fs.writeFileSync(BOOT_FILE, JSON.stringify({ serverBootId: fresh, savedAt: new Date().toISOString() }, null, 2));
  return fresh;
};

const serverBootId = loadOrCreateBootId();

const persistJobsToDisk = () => {
  const payload = {
    serverBootId,
    jobs: Array.from(jobs.values()),
    savedAt: new Date().toISOString(),
  };
  safeWriteJson(JOBS_FILE, payload);
};

const hydrateJobsFromDisk = () => {
  if (!fs.existsSync(JOBS_FILE)) return;
  try {
    const saved = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
    if (!saved?.jobs || !Array.isArray(saved.jobs)) return;
    saved.jobs.forEach((job) => {
      if (job.serverBootId && job.serverBootId !== serverBootId) {
        if (job.status === 'running') {
          job.status = 'error';
          job.error = 'Server restarted before completion.';
          const alreadyHasRestartLog = (job.logs || []).some((l) =>
            (l.message || '').includes('Server restarted; job cannot be resumed automatically')
          );
          if (!alreadyHasRestartLog) {
            job.logs = [
              ...(job.logs || []),
              { timestamp: new Date().toISOString(), message: 'Server restarted; job cannot be resumed automatically. Please restart the import.' },
            ];
          }
        }
      }
      job.serverBootId = serverBootId;
      jobs.set(job.id, job);
    });
    persistJobsToDisk();
  } catch (error) {
    console.warn('[dukascopy] failed to hydrate jobs', error);
  }
};

const getJobFromDisk = (jobId) => {
  if (!fs.existsSync(JOBS_FILE)) return null;
  try {
    const saved = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
    const match = saved?.jobs?.find?.((job) => job.id === jobId) || null;
    if (match && match.serverBootId && match.serverBootId !== serverBootId) {
      return null;
    }
    return match || null;
  } catch (error) {
    console.warn('[dukascopy] failed to read job from disk', error);
    return null;
  }
};

module.exports = {
  jobs,
  serverBootId,
  persistJobsToDisk,
  hydrateJobsFromDisk,
  getJobFromDisk,
  safeWriteJson,
};
