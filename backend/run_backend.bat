@echo off
title StreamSlice Backend (Port 8000)
cd /d "%~dp0"

echo ===================================================
echo             StreamSlice API Backend
echo ===================================================
echo.

if exist .venv\Scripts\activate.bat (
    echo Activating .venv virtual environment...
    call .venv\Scripts\activate.bat
) else if exist venv\Scripts\activate.bat (
    echo Activating venv virtual environment...
    call venv\Scripts\activate.bat
)

echo Starting FastAPI server with Python...
python main.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Backend failed to start.
    pause
)
