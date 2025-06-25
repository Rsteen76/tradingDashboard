@echo off
echo 🧹 Cleaning up existing processes...
echo.

:: Kill all Node.js processes
tasklist | findstr /I "node.exe" >nul
if %errorlevel% equ 0 (
    echo 🔄 Stopping existing Node.js processes...
    taskkill /F /IM node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)

:: Kill Redis if running
tasklist | findstr /I "redis-server.exe" >nul
if %errorlevel% equ 0 (
    echo 🔄 Stopping existing Redis server...
    taskkill /F /IM redis-server.exe >nul 2>&1
    timeout /t 1 /nobreak >nul
)

echo ✅ Cleanup completed!
echo.

:: Start Redis Server
echo 📊 Starting Redis Server...
start "Redis Server" cmd /c "cd /d d:\Coding\TradingDashboard\redis && redis-server.exe redis.windows.conf"
timeout /t 3 /nobreak >nul

:: Setup PostgreSQL Database
echo 🗄️ Setting up PostgreSQL Database...
set DB_PASSWORD=3191
node setup-database.js
if errorlevel 1 (
    echo ⚠️ Database setup had issues - continuing anyway...
    echo.
)

:: Start ML Server (the working TensorFlow version)
echo 🤖 Starting ML Server with TensorFlow...
start "ML Server" cmd /c "cd /d d:\Coding\TradingDashboard && node ml-server.js"
timeout /t 10 /nobreak >nul

:: Start Web Dashboard  
echo 🌐 Starting Web Dashboard...
start "Web Dashboard" cmd /c "cd /d d:\Coding\TradingDashboard && npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo ✅ Fresh Trading System Started!
echo.
echo 🔗 Active Services:
echo   📊 Redis Server: localhost:6379
echo   🗄️ PostgreSQL: localhost:5432/trading_ml  
echo   🤖 ML Server: http://localhost:8080 (with TensorFlow)
echo   🌐 Dashboard: http://localhost:3000
echo   🎯 NinjaTrader: localhost:9999 (ready for connection)
echo.
echo 📋 URLs to check:
echo   Dashboard: http://localhost:3000
echo   ML Server: http://localhost:8080
echo.
echo 💡 Your NinjaTrader strategy should auto-reconnect within 5 seconds
echo.
echo Press any key to open dashboard...
pause >nul
start http://localhost:3000 