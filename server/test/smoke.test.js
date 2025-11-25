const fetch = require('node-fetch');

const BASE_URL = process.env.SERVER_URL || 'http://localhost:4800';

async function run() {
  const health = await fetch(`${BASE_URL}/health`).then((res) => res.json());
  console.log('[smoke] health:', health.status);

  const norm = await fetch(`${BASE_URL}/api/normalization`).then((res) => res.json());
  console.log('[smoke] normalization basis:', norm.basis);

  const job = await fetch(`${BASE_URL}/api/import/dukascopy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asset: 'CL1!', timeframe: 'H1' }),
  }).then((res) => res.json());
  console.log('[smoke] job status:', job.status);
}

run().catch((err) => {
  console.error('[smoke] failed', err);
  process.exit(1);
});
