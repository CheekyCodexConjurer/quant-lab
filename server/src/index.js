const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { hydrateJobsFromDisk, serverBootId } = require('./services/dukascopyService');
const importRoutes = require('./routes/importRoutes');
const normalizationRoutes = require('./routes/normalizationRoutes');
const dataRoutes = require('./routes/dataRoutes');
const indicatorRoutes = require('./routes/indicatorRoutes');
const strategyRoutes = require('./routes/strategyRoutes');
const leanRoutes = require('./routes/leanRoutes');
const licenseRoutes = require('./routes/licenseRoutes');
const pathsRoutes = require('./routes/pathsRoutes');
const indicatorExecutionRoutes = require('./routes/indicatorExecutionRoutes');
const debugRoutes = require('./routes/debugRoutes');

const PORT = process.env.SERVER_PORT || 4800;

const app = express();
app.use(cors());
app.disable('etag');
// Accept reasonably large indicator payloads (candles) without truncation.
app.use(express.json({ limit: '20mb' }));
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), serverBootId });
});

app.use('/api/import', importRoutes);
app.use('/api/normalization', normalizationRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/indicators', indicatorRoutes);
app.use('/api/indicator-exec', indicatorExecutionRoutes);
app.use('/api/strategies', strategyRoutes);
app.use('/api/lean', leanRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/paths', pathsRoutes);
app.use('/api/debug', debugRoutes);

const distPath = path.resolve(__dirname, '..', '..', 'dist');

app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

hydrateJobsFromDisk();

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
