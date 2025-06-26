@echo off
setlocal enabledelayedexpansion

echo 🛑 Stopping All Trading System Processes...
echo.

:: ================================================================
:: Kill all Node.js processes
:: ================================================================
tasklist | findstr /I "node.exe" >nul 2>&1
if !errorlevel! equ 0 (
    echo 🔄 Stopping all Node.js processes...
    taskkill /F /IM node.exe >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ All Node.js processes stopped
    ) else (
        echo ⚠️ Some Node.js processes may still be running
    )
    timeout /t 2 /nobreak >nul
) else (
    echo ✅ No Node.js processes found
)

:: ================================================================
:: Kill Redis Server
:: ================================================================
tasklist | findstr /I "redis-server.exe" >nul 2>&1
if !errorlevel! equ 0 (
    echo 🔄 Stopping Redis server...
    taskkill /F /IM redis-server.exe >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ Redis server stopped
    ) else (
        echo ⚠️ Redis server stop failed
    )
    timeout /t 1 /nobreak >nul
) else (
    echo ✅ No Redis server found
)

:: ================================================================
:: Kill any hanging command windows
:: ================================================================
echo 🔄 Cleaning up command windows...
for /f "tokens=2 delims=," %%i in ('tasklist /FI "IMAGENAME eq cmd.exe" /FO CSV ^| findstr /I "Redis\|ML\|Dashboard"') do (
    taskkill /F /PID %%i >nul 2>&1
)

:: ================================================================
:: Kill any NPM processes
:: ================================================================
tasklist | findstr /I "npm.cmd" >nul 2>&1
if !errorlevel! equ 0 (
    echo 🔄 Stopping NPM processes...
    taskkill /F /IM npm.cmd >nul 2>&1
    echo ✅ NPM processes stopped
)

echo.
echo ✅ All Trading System Processes Stopped!
echo.
echo 💡 You can now safely:
echo   • Start a new instance with start-complete-system.bat
echo   • Run tests with start-test-system.bat
echo   • Start dashboard only with start-dashboard-only.bat
echo.
echo Press any key to exit...
pause >nul 