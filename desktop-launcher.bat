@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Desktop launcher for The Lab (Electron shell)
cd /d "%~dp0"

REM Configure Python environment for Indicator Execution Engine (if venv exists)
IF EXIST ".venv\Scripts\python.exe" (
    set "THELAB_PYTHON_PATH=%~dp0.venv\Scripts\python.exe"
    echo [desktop] Using Python from venv: %THELAB_PYTHON_PATH%
) ELSE (
    echo [desktop] Warning: .venv not found, falling back to system python for indicators.
)

IF NOT EXIST node_modules (
    echo [desktop] Installing root dependencies...
    call npm install
)

IF NOT EXIST server\node_modules (
    echo [desktop] Installing backend dependencies...
    pushd server
    call npm install
    popd
)

IF NOT EXIST desktop\node_modules (
    echo [desktop] Installing desktop shell dependencies...
    pushd desktop
    call npm install
    popd
)

echo [desktop] Building frontend bundle...
call npm run build

echo [desktop] Starting The Lab desktop shell...
start "" /b npm run dev --prefix desktop

endlocal
