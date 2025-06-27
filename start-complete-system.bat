@echo off
echo Starting Trading System...

rem Kill existing processes
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM redis-server.exe >nul 2>&1
timeout /t 2 /nobreak >nul

rem Start Redis
pushd redis
start "Redis Server" redis-server.exe redis.windows.conf
popd
timeout /t 2 /nobreak >nul

rem Start ML Server
pushd server
echo Starting ML Server from %CD%
call npm install
start "ML Server" cmd /c "npm run dev"
popd
timeout /t 5 /nobreak >nul

rem Start Dashboard
echo Starting Dashboard...
call npm install
start "Trading Dashboard" cmd /c "set HOST=0.0.0.0 && npm run dev:dashboard"
timeout /t 5 /nobreak >nul

start http://localhost:3000

echo System started! Press any key to close this window...
pause >nul 