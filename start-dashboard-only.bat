@echo off
setlocal enabledelayedexpansion

echo 🌐 Starting Dashboard Only (Development Mode)...
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
taskkill /F /FI "WINDOWTITLE eq Dashboard*" >nul 2>&1
echo ✅ Command windows cleaned up
echo.

:: ================================================================
:: STEP 2: Start Web Dashboard Only (in new window)
:: ================================================================
echo 🌐 Starting Trading Dashboard...
if exist "src\app\page.tsx" (
    start "Trading Dashboard - Port 3000" cmd /c "title Trading Dashboard - Port 3000 && echo 🌐 Starting Trading Dashboard... && npm run dev:dashboard"
    echo ✅ Trading dashboard starting in separate window on port 3000
    
    :: Wait for dashboard to compile
    echo ⏱️ Waiting for dashboard to compile...
    timeout /t 8 /nobreak >nul
) else (
    echo ❌ Dashboard source files not found
    echo   Make sure the src directory exists
    pause
    exit /b 1
)

:: ================================================================
:: STEP 3: Open Browser
:: ================================================================
echo 🌏 Opening trading dashboard in browser...
timeout /t 3 /nobreak >nul
start http://localhost:3000

:: ================================================================
:: DASHBOARD READY
:: ================================================================
echo.
echo ================================================
echo 🌐 DASHBOARD DEVELOPMENT MODE STARTED! 🌐
echo ================================================
echo.
echo 📊 Service Running:
echo   🌐 Trading Dashboard:   http://localhost:3000
echo.
echo 📋 Development Features:
echo   🔄 Hot reload enabled
echo   🐛 Development debugging
echo   ⚡ Fast compilation
echo.
echo 💡 Perfect for:
echo   🎨 UI development and styling
echo   🧪 Frontend component testing
echo   📱 Responsive design work
echo.
echo 🛑 To stop dashboard: run stop-all-processes.bat or close the Dashboard window
echo.
echo 💡 Monitor dashboard compilation in the separate window:
echo   - Check for TypeScript/React errors
echo   - Watch for successful compilation messages
echo   - Monitor hot reload status
echo.

pause 