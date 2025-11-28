@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM Desktop launcher for The Lab (Electron shell)
cd /d "%~dp0"

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
