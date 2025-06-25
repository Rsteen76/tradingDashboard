@echo off
echo 🚀 Starting Complete ScalperPro ML Trading System...
echo.

:: Start Redis Server
echo 📊 Starting Redis Server...
start "Redis Server" cmd /c "cd /d d:\Coding\TradingDashboard\redis && redis-server.exe redis.windows.conf"
timeout /t 2 /nobreak > nul

:: Setup PostgreSQL Database (if needed)
echo 🗄️ Setting up PostgreSQL Database...
echo   Note: Make sure PostgreSQL is installed and running on your system
echo   Default connection: postgresql://postgres:3191@localhost:5432/trading_ml
echo.
set DB_PASSWORD=3191
node setup-database.js
if errorlevel 1 (
    echo ❌ Database setup failed - continuing anyway...
    echo.
)

:: Start ML Server
echo 📡 Starting ML Server...
start "ML Server" cmd /c "cd /d d:\Coding\TradingDashboard && node server/ml-server.js"
timeout /t 3 /nobreak > nul

:: Start Web Dashboard  
echo 🌐 Starting Web Dashboard...
start "Web Dashboard" cmd /c "cd /d d:\Coding\TradingDashboard && npm run dev"
timeout /t 5 /nobreak > nul

echo.
echo ✅ Complete Trading System Started!
echo.
echo 🔗 Active Services:
echo   📊 Redis Server: localhost:6379
echo   🗄️ PostgreSQL: localhost:5432/trading_ml  
echo   📡 ML Server: http://localhost:8080
echo   🌐 Dashboard: http://localhost:3000
echo   🎯 NinjaTrader: localhost:9999
echo.
echo 📋 System URLs:
echo   Dashboard: http://localhost:3000
echo   ML API: http://localhost:8080/health
echo.
echo Press any key to open dashboard in browser...
pause > nul

start http://localhost:3000 