@echo off
title StreamSlice Frontend (Port 5173)
cd /d "%~dp0"

echo ===================================================
echo             StreamSlice Vite Frontend
echo ===================================================
echo.

echo Starting Vite development server...
cmd /c "npm run dev"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Frontend failed to start.
    pause
)
