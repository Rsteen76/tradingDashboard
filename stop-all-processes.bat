@echo off
echo 🛑 Stopping all trading system processes...

rem Kill Node.js processes (ML Server and Dashboard)
echo 🔄 Stopping Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
echo ✅ Node.js processes stopped

rem Kill Redis server
echo 🔄 Stopping Redis server...
taskkill /F /IM redis-server.exe >nul 2>&1
echo ✅ Redis server stopped

echo.
echo ✅ All processes stopped successfully!
echo    You can restart the system with: start-complete-system.bat
echo.

rem Wait for user input
echo Press any key to continue...
pause >nul 