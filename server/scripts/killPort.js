/* Kill any process listening on SERVER_PORT (default 4800).
 * Designed to be called before starting the backend dev server
 * to avoid EADDRINUSE without precisar fazer netstat/taskkill manual. */

const { execSync } = require('child_process');

const port = Number(process.env.SERVER_PORT || 4800);

if (!Number.isFinite(port) || port <= 0) {
  process.exit(0);
}

try {
  if (process.platform === 'win32') {
    // Windows: netstat + taskkill
    const output = execSync(`netstat -ano | findstr :${port}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();

    const lines = output.split(/\r?\n/).filter((line) => line.trim().length);
    const pids = new Set();

    lines.forEach((line) => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) {
        pids.add(pid);
      }
    });

    pids.forEach((pid) => {
      try {
        execSync(`taskkill /PID ${pid} /F`, {
          stdio: 'ignore',
        });
      } catch {
        // Se falhar (já morreu, permissão, etc.), seguimos em frente.
      }
    });
  } else {
    // Unix-like: lsof + kill -9 (xargs -r evita erro se não houver PIDs)
    execSync(`lsof -ti tcp:${port} | xargs -r kill -9`, {
      stdio: 'ignore',
    });
  }
} catch {
  // Se nenhum processo estiver usando a porta ou o comando não existir, apenas ignoramos.
}

