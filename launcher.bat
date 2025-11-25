@echo off
setlocal

REM Launch The Lab dev server from repo root
cd /d "%~dp0"

IF NOT EXIST node_modules (
    echo [launcher] Installing dependencies...
    call npm install
)

IF NOT EXIST server\node_modules (
    echo [launcher] Installing backend dependencies...
    pushd server
    call npm install
    popd
)

echo [launcher] Starting backend server on http://localhost:4800
start "The Lab Backend" cmd /k "cd /d %~dp0server && npm run dev"
echo [launcher] Waiting backend boot...
timeout /t 3 > nul

echo [launcher] Starting Vite dev server on http://localhost:3070
start "The Lab Dev Server" cmd /k "cd /d %~dp0 && npm run dev -- --port 3070 --strictPort"
echo [launcher] Waiting for server boot...
timeout /t 3 > nul
echo [launcher] Opening Chrome at http://localhost:3070
start "" chrome "http://localhost:3070"

endlocal
