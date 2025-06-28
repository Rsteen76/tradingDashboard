@echo off
echo ================================================
echo          Manual Trade System Startup
echo ================================================

echo.
echo Starting ML Trading Server...
cd server
start "ML Server" cmd /k "npm run dev"

echo.
echo Waiting for server to initialize...
timeout /t 5 /nobreak > nul

echo.
echo Starting Dashboard...
cd ..
start "Dashboard" cmd /k "npm run dev"

echo.
echo ================================================
echo   Manual Trade System Started Successfully!
echo ================================================
echo.
echo Server: http://localhost:3001
echo Dashboard: http://localhost:3000
echo.
echo Use the Manual Trade Panel to test trading functionality.
echo.
echo To test manually, run: node test-manual-trades.js
echo.
pause 