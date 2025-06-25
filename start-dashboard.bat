@echo off
echo 🚀 Starting ScalperPro ML Trading Dashboard...
echo.

:: Start ML Server
echo 📡 Starting ML Server...
start "ML Server" cmd /c "cd /d d:\Coding\TradingDashboard && node ml-server.js"
timeout /t 3 /nobreak > nul

:: Start Web Dashboard  
echo 🌐 Starting Web Dashboard...
start "Web Dashboard" cmd /c "cd /d d:\Coding\TradingDashboard && npm run dev"
timeout /t 5 /nobreak > nul

echo.
echo ✅ Dashboard System Started!
echo.
echo 📊 Dashboard URL: http://localhost:3000
echo 🎯 NinjaTrader TCP: localhost:9999
echo 🖥️  Server API: http://localhost:8080
echo.
echo Press any key to open dashboard in browser...
pause > nul

start http://localhost:3000
