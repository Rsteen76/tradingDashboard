@echo off
echo 🎮 Testing Smart Trailing Controls
echo ====================================

echo.
echo 📊 Checking if ML server is running...
curl -s http://localhost:8080/health > nul
if %errorlevel% neq 0 (
    echo ❌ ML server not running on port 8080
    echo    Please start the ML server first
    pause
    exit /b 1
)
echo ✅ ML server is running

echo.
echo 🔍 Getting current smart trailing status...
node smart-trailing-controls.js status

echo.
echo 🎛️ Testing preset configurations...
echo.

echo 📝 Applying CONSERVATIVE preset...
node smart-trailing-controls.js preset conservative
timeout /t 2 /nobreak > nul

echo.
echo 📝 Applying BALANCED preset...
node smart-trailing-controls.js preset balanced
timeout /t 2 /nobreak > nul

echo.
echo 📝 Applying AGGRESSIVE preset...
node smart-trailing-controls.js preset aggressive
timeout /t 2 /nobreak > nul

echo.
echo 🛑 Testing disable command...
node smart-trailing-controls.js disable
timeout /t 2 /nobreak > nul

echo.
echo ✅ Testing enable command...
node smart-trailing-controls.js enable
timeout /t 2 /nobreak > nul

echo.
echo 🎯 Final status check...
node smart-trailing-controls.js status

echo.
echo ✅ Smart trailing control tests completed!
echo.
echo 💡 Check your NinjaTrader strategy output window to see the commands being received.
echo.
pause 