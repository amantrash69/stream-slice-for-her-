@echo off
title StreamSlice Launcher
echo ===================================================
echo           Starting StreamSlice App...
echo ===================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: 1. Stop any stale process on port 8000 or 5173 to prevent conflicts
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo Stopping stale process on port 8000 [PID: %%a]
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: 2. Launch FastAPI Backend in a new terminal window with cmd /k
echo [1/3] Starting FastAPI Backend on port 8000...
start "StreamSlice Backend (Port 8000)" cmd /k "cd /d "%ROOT_DIR%backend" && (if exist .venv\Scripts\activate.bat call .venv\Scripts\activate.bat) & python main.py"

:: 3. Launch Vite Frontend in a new terminal window with cmd /k
echo [2/3] Starting Vite Frontend on port 5173...
start "StreamSlice Frontend (Port 5173)" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

:: 4. 5-second pause so FastAPI has time to bind to port 8000
echo [3/3] Waiting for servers to initialize (5s)...
timeout /t 5 /nobreak >nul 2>nul || ping -n 6 127.0.0.1 >nul

:: 5. Open Google Chrome pointing to frontend URL (with fallback to default browser)
echo Opening StreamSlice in Google Chrome...
set "APP_URL=http://localhost:5173"

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" %APP_URL%
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" %APP_URL%
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" %APP_URL%
) else (
    start chrome %APP_URL% 2>nul || start %APP_URL%
)

echo.
echo ===================================================
echo   StreamSlice is running!
echo   - Backend:  http://127.0.0.1:8000
echo   - Frontend: http://localhost:5173
echo.
echo   Keep both terminal windows open while using the app.
echo ===================================================
