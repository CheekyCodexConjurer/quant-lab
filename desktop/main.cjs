const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let backendProcess = null;
const BACKEND_PORT = process.env.SERVER_PORT || 4800;

function isBackendRunning() {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: '127.0.0.1',
        port: BACKEND_PORT,
        path: '/health',
        timeout: 800,
      },
      (res) => {
        res.resume();
        resolve(true);
      }
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function requestBackendShutdown() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: BACKEND_PORT,
        path: '/api/debug/shutdown',
        method: 'POST',
        timeout: 1500,
      },
      (res) => {
        res.resume();
        res.on('end', resolve);
      }
    );

    req.on('error', () => resolve());
    req.on('timeout', () => {
      req.destroy();
      resolve();
    });

    req.end();
  });
}

function startBackend() {
  if (backendProcess) {
    return;
  }

  const serverEntry = path.resolve(__dirname, '..', 'server', 'src', 'index.js');

  backendProcess = spawn('node', [serverEntry], {
    env: {
      ...process.env,
      SERVER_PORT: String(BACKEND_PORT),
    },
    stdio: 'inherit',
  });

  backendProcess.on('exit', () => {
    backendProcess = null;
  });
}

function createMainWindow() {
  const iconPath = path.resolve(__dirname, '..', 'the-lab.ico');

  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay?.workAreaSize || { width: 1920, height: 1080 };
  const baseWidth = Math.min(1600, Math.max(1280, Math.floor(workArea.width * 0.85)));
  const baseHeight = Math.min(900, Math.max(800, Math.floor(workArea.height * 0.85)));

  const mainWindow = new BrowserWindow({
    width: baseWidth,
    height: baseHeight,
    minWidth: 1024,
    minHeight: 640,
    title: 'The Lab',
    backgroundColor: '#020617',
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const targetUrl = `http://127.0.0.1:${BACKEND_PORT}`;
  mainWindow.loadURL(targetUrl).catch((err) => {
    console.error('[desktop] Failed to load frontend URL:', targetUrl, err);
  });
}

app.on('ready', async () => {
  const running = await isBackendRunning().catch(() => false);
  if (running) {
    console.log(`[desktop] Existing backend detected on port ${BACKEND_PORT}, requesting shutdown...`);
    await requestBackendShutdown();
    // give a moment for the process to exit
    await new Promise((resolve) => setTimeout(resolve, 500));
    const stillRunning = await isBackendRunning().catch(() => false);
    if (stillRunning) {
      console.log(`[desktop] Backend still running after shutdown request, reusing existing instance.`);
    } else {
      startBackend();
    }
  } else {
    startBackend();
  }
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch {
      // ignore
    }
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
