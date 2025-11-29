const MAX_LOGS = 500;

const logs = [];

const normalizeLevel = (level) => {
  const lower = String(level || '').toLowerCase();
  if (lower === 'debug' || lower === 'info' || lower === 'warn' || lower === 'error') return lower;
  return 'info';
};

const pushLog = (entry) => {
  logs.push(entry);
  if (logs.length > MAX_LOGS) {
    logs.splice(0, logs.length - MAX_LOGS);
  }
};

const log = (level, message, meta = {}) => {
  const normalizedLevel = normalizeLevel(level);
  const entry = {
    ts: new Date().toISOString(),
    level: normalizedLevel,
    message: typeof message === 'string' ? message : String(message),
    module: meta.module || meta.source || undefined,
    ...meta,
  };

  // Avoid duplicating module/source keys when spreading meta
  delete entry.source;

  pushLog(entry);

  // Console output for dev usage
  const prefix = `[${entry.level}]`;
  // eslint-disable-next-line no-console
  console.log(prefix, entry.module ? `[${entry.module}]` : '', entry.message, meta && Object.keys(meta).length ? meta : '');
};

const getLogs = ({ level, module: moduleFilter, limit } = {}) => {
  const normalizedLevel = level ? normalizeLevel(level) : null;
  const max = typeof limit === 'number' && limit > 0 ? Math.min(limit, MAX_LOGS) : 100;
  const filtered = logs.filter((entry) => {
    if (normalizedLevel && entry.level !== normalizedLevel) return false;
    if (moduleFilter && entry.module !== moduleFilter) return false;
    return true;
  });
  return filtered.slice(-max);
};

module.exports = {
  logDebug: (message, meta) => log('debug', message, meta),
  logInfo: (message, meta) => log('info', message, meta),
  logWarn: (message, meta) => log('warn', message, meta),
  logError: (message, meta) => log('error', message, meta),
  getLogs,
};

