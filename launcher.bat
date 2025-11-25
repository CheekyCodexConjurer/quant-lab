@echo off
setlocal

REM Launch The Lab dev server from repo root
cd /d "%~dp0"

IF NOT EXIST node_modules (
    echo [launcher] Installing dependencies...
    call npm install
)

echo [launcher] Starting Vite dev server on http://localhost:3070
call npm run dev -- --port 3070 --strictPort

endlocal
