@echo off
setlocal enabledelayedexpansion

echo 🚀 Starting Complete ScalperPro ML Trading System...
echo.

:: ================================================================
:: STEP 1: Kill all existing processes first
:: ================================================================
echo 🧹 Cleaning up existing processes...
echo.

:: Kill all Node.js processes
echo 🔄 Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ Node.js processes stopped
) else (
    echo ✅ No Node.js processes to stop
)
timeout /t 2 /nobreak >nul

:: Kill Redis if running
echo 🔄 Stopping Redis server...
taskkill /F /IM redis-server.exe >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ Redis server stopped
) else (
    echo ✅ No Redis server to stop
)

:: Kill any leftover command windows
echo 🔄 Cleaning up command windows...
taskkill /F /FI "WINDOWTITLE eq ML*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Dashboard*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Redis*" >nul 2>&1
echo ✅ Command windows cleaned up

:: Wait for ports to be freed
echo ⏱️ Waiting for ports to be freed...
timeout /t 3 /nobreak >nul

:: ================================================================
:: STEP 2: Check dependencies
:: ================================================================
echo 📦 Checking dependencies...
if not exist "node_modules" (
    echo 🔄 Installing dependencies...
    npm install
    if !errorlevel! neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependencies already installed
)

:: ================================================================
:: STEP 3: Start Redis Server (in new window)
:: ================================================================
echo 🗄️ Starting Redis server...
if exist "redis\redis-server.exe" (
    start "Redis Server" /min cmd /c "cd redis && redis-server.exe redis.windows.conf"
    echo ✅ Redis server starting in separate window...
    timeout /t 3 /nobreak >nul
) else (
    echo ⚠️ Redis server not found, continuing without Redis
)

:: ================================================================
:: STEP 4: Setup Database (optional)
:: ================================================================
echo 🗄️ Setting up database...
set DATABASE_URL=postgresql://postgres:3191@localhost:5432/trading_ml

:: Try to create database (ignore errors if already exists)
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE trading_ml;" >nul 2>&1
psql -U postgres -h localhost -p 5432 -d trading_ml -f database-schema.sql >nul 2>&1

echo ✅ Database setup completed (or skipped if PostgreSQL unavailable)

:: ================================================================
:: STEP 5: Start Dashboard (in new window)
:: ================================================================
echo 🌐 Starting Trading Dashboard...
if exist "src\app\page.tsx" (
    start "Trading Dashboard - Port 3000" cmd /c "title Trading Dashboard - Port 3000 && echo 🌐 Starting Trading Dashboard... && npm run dev:dashboard"
    echo ✅ Trading dashboard starting in separate window on port 3000
    
    :: Wait for dashboard to start compiling
    echo ⏱️ Waiting for dashboard to start...
    timeout /t 5 /nobreak >nul
) else (
    echo ❌ Dashboard source files not found
    echo   Make sure the src directory exists
    pause
    exit /b 1
)

:: ================================================================
:: STEP 6: Open Browser
:: ================================================================
echo 🌏 Opening trading dashboard in browser...
timeout /t 3 /nobreak >nul
start http://localhost:3000

:: ================================================================
:: STEP 7: Start ML Server (in new window)
:: ================================================================
echo 🤖 Starting ML Server...
if exist "ml-server.js" (
    start "ML Server - Port 8080/9999" cmd /c "title ML Server - Port 8080/9999 && echo 🤖 Starting ML Server... && echo ⏱️ This will take 20-30 seconds to load TensorFlow models... && node ml-server.js && pause"
    echo ✅ ML server starting in separate window on ports 8080 (web) and 9999 (NinjaTrader)
    
    :: Wait for ML server to initialize
    echo ⏱️ Waiting for ML server initialization...
    timeout /t 15 /nobreak >nul
) else (
    echo ❌ ml-server.js not found
    echo   Make sure you're running this from the correct directory
    pause
    exit /b 1
)

:: ================================================================
:: SYSTEM READY
:: ================================================================
echo.
echo ================================================
echo 🎉 COMPLETE TRADING SYSTEM STARTED! 🎉
echo ================================================
echo.
echo 📊 Services Running in Separate Windows:
echo   🗄️ Redis Server:        localhost:6379
echo   🐘 PostgreSQL DB:       localhost:5432/trading_ml
echo   🤖 ML Server:           http://localhost:8080
echo   🎯 NinjaTrader TCP:     localhost:9999
echo   🌐 Trading Dashboard:   http://localhost:3000
echo.
echo 📋 Quick Links:
echo   🔍 Health Check:        http://localhost:8080/health
echo   📈 ML Metrics:          http://localhost:8080/metrics
echo   🌐 Dashboard:           http://localhost:3000
echo.
echo ⚡ The system is now ready for trading!
echo   Start your NinjaTrader strategy to begin trading.
echo.
echo 🛑 To stop all processes: run stop-all-processes.bat
echo.
echo 💡 Each service runs in its own window for easy monitoring:
echo   - Check Redis window for connection logs
echo   - Check ML Server window for TensorFlow loading progress
echo   - Check Dashboard window for compilation status
echo.

pause 