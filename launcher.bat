@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Launch The Lab dev server from repo root
cd /d "%~dp0"

REM Configure Python environment for Indicator Execution Engine (if venv exists)
IF EXIST ".venv\Scripts\python.exe" (
    set "THELAB_PYTHON_PATH=%~dp0.venv\Scripts\python.exe"
    echo [launcher] Using Python from venv: %THELAB_PYTHON_PATH%
) ELSE (
    echo [launcher] Warning: .venv not found, falling back to system python for indicators.
)

REM Pick a free dev port (tries in order)
set PORT_CANDIDATES=3070 5173 4173
set DEV_PORT=

for %%P in (%PORT_CANDIDATES%) do (
    netstat -ano | findstr /R /C:":%%P " | findstr /C:"LISTENING" >nul
    if errorlevel 1 (
        set DEV_PORT=%%P
        goto :PORT_FOUND
    )
)

echo [launcher] Nenhuma porta livre nas opcoes: %PORT_CANDIDATES%.
echo [launcher] Feche processos nessas portas ou ajuste PORT_CANDIDATES no script.
exit /b 1

:PORT_FOUND
echo [launcher] Usando porta de desenvolvimento: %DEV_PORT%

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

echo [launcher] Starting Vite dev server on http://localhost:%DEV_PORT%
start "The Lab Dev Server" cmd /k "cd /d %~dp0 && npm run dev -- --port %DEV_PORT% --strictPort"
echo [launcher] Waiting for server boot...
timeout /t 3 > nul
echo [launcher] Opening Chrome at http://localhost:%DEV_PORT%
start "" chrome "http://localhost:%DEV_PORT%"

endlocal
