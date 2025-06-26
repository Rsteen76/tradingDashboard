@echo off
setlocal enabledelayedexpansion

echo 🧪 Starting TEST ScalperPro ML Trading System...
echo.

:: ================================================================
:: STEP 1: Kill existing processes first
:: ================================================================
echo 🧹 Cleaning up existing processes...

:: Kill all Node.js processes
echo 🔄 Stopping existing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ Node.js processes stopped
) else (
    echo ✅ No existing Node.js processes found
)
timeout /t 2 /nobreak >nul

:: Kill command windows
echo 🔄 Cleaning up command windows...
taskkill /F /FI "WINDOWTITLE eq ML*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Dashboard*" >nul 2>&1
echo ✅ Command windows cleaned up
echo.

:: ================================================================
:: STEP 2: Start Dashboard (in new window)
:: ================================================================
echo 🌐 Starting Trading Dashboard...
if exist "src\app\page.tsx" (
    start "Trading Dashboard - Port 3000" cmd /c "title Trading Dashboard - Port 3000 && echo 🌐 Starting Trading Dashboard... && npm run dev:dashboard"
    echo ✅ Trading dashboard starting in separate window on port 3000
    timeout /t 5 /nobreak >nul
) else (
    echo ❌ Dashboard source files not found
    pause
    exit /b 1
)

:: ================================================================
:: STEP 3: Open Browser
:: ================================================================
echo 🌏 Opening dashboard in browser...
timeout /t 3 /nobreak >nul
start http://localhost:3000

:: ================================================================
:: STEP 4: Start Simple ML Server (in new window)
:: ================================================================
echo 🧪 Starting Simple ML Server for testing...
if exist "ml-server-simple.js" (
    start "Simple ML Server - Port 8080/9999" cmd /c "title Simple ML Server - Port 8080/9999 && echo 🧪 Starting Simple ML Server... && echo ⏱️ This will take a few seconds to initialize... && node ml-server-simple.js && pause"
    echo ✅ Simple ML server starting in separate window
    timeout /t 5 /nobreak >nul
) else if exist "ml-server.js" (
    start "ML Server (Test Mode) - Port 8080/9999" cmd /c "title ML Server Test Mode - Port 8080/9999 && echo 🧪 Starting ML Server in test mode... && echo ⏱️ This will take 20-30 seconds to load TensorFlow models... && node ml-server.js && pause"
    echo ✅ ML server starting in test mode in separate window
    timeout /t 10 /nobreak >nul
) else (
    echo ❌ No ML server found (looking for ml-server-simple.js or ml-server.js)
    pause
    exit /b 1
)

:: ================================================================
:: TEST SYSTEM READY
:: ================================================================
echo.
echo ================================================
echo 🧪 TEST TRADING SYSTEM STARTED! 🧪
echo ================================================
echo.
echo 📊 Test Services Running in Separate Windows:
echo   🧪 Simple ML Server:    http://localhost:8080
echo   🎯 NinjaTrader TCP:     localhost:9999
echo   🌐 Trading Dashboard:   http://localhost:3000
echo.
echo 📋 Quick Links:
echo   🔍 Health Check:        http://localhost:8080/health
echo   🌐 Dashboard:           http://localhost:3000
echo.
echo ⚡ The test system is ready!
echo   This is a lightweight version for testing NinjaTrader connectivity.
echo.
echo 🛑 To stop all processes: run stop-all-processes.bat
echo.
echo 💡 Monitor each service in its own window:
echo   - Check ML Server window for startup status
echo   - Check Dashboard window for compilation
echo.

pause 