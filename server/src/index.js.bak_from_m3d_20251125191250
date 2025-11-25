const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const importRoutes = require('./routes/importRoutes');
const normalizationRoutes = require('./routes/normalizationRoutes');
const dataRoutes = require('./routes/dataRoutes');

const EXPLICIT_PORT = process.env.SERVER_PORT;
const BASE_PORT = Number(EXPLICIT_PORT || 4800);
const MAX_PORT_SHIFT = 10;

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/import', importRoutes);
app.use('/api/normalization', normalizationRoutes);
app.use('/api/data', dataRoutes);

const startServer = (port, attempt = 0) => {
  const server = app.listen(port, () => {
    if (attempt > 0) {
      console.log(`[server] Port fallback engaged after ${attempt} attempt(s).`);
    }
    console.log(`[server] Listening on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && !EXPLICIT_PORT && attempt < MAX_PORT_SHIFT) {
      const nextPort = port + 1;
      console.warn(`[server] Port ${port} is busy. Trying ${nextPort}...`);
      startServer(nextPort, attempt + 1);
    } else {
      console.error('[server] Unable to start HTTP server:', error.message);
      process.exit(1);
    }
  });
};

startServer(BASE_PORT);
