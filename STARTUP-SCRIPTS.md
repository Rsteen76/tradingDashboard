# 🚀 Trading System Startup Scripts

This directory contains several startup scripts for different scenarios. **All scripts automatically kill existing processes first** to ensure clean startup.

## 📁 Available Scripts

### 🎯 **start-complete-system.bat** (MAIN - Windows CMD)
**Use this for live trading and full system in Windows Command Prompt**

**What it does:**
- ✅ Kills all existing Node.js and Redis processes
- 🗄️ Starts Redis server (separate window)
- 🐘 Sets up PostgreSQL database
- 🤖 Starts ML server with all 5 TensorFlow models (separate window)
- 🌐 Starts Next.js trading dashboard (separate window)
- 🌏 Opens browser to dashboard

**Windows opened:** Redis Server + ML Server + Trading Dashboard
**Current terminal:** Returns to prompt after starting all services
**Startup time:** 30-45 seconds (ML models take time to load)

---

### 🖥️ **start-complete-system.sh** (MAIN - Git Bash/Linux)
**Use this for live trading in Git Bash or Linux environments**

**Same functionality as .bat version but optimized for bash shells**
- Works in Git Bash for Windows
- Works on Linux/macOS
- Cross-platform process killing
- Background process management with PID tracking

---

### 🧪 **start-test-system.bat** (Windows CMD)
**Lightweight testing version for development**

**What it does:**
- ✅ Kills existing processes
- 🧪 Starts simplified ML server (separate window)
- 🌐 Starts dashboard (separate window)

**Windows opened:** Simple ML Server + Trading Dashboard
**Current terminal:** Returns to prompt after starting services
**Startup time:** ⚡ **5-10 seconds** (no complex ML models)

---

### 🌐 **start-dashboard-only.bat** (Windows CMD)
**Dashboard development mode**

**What it does:**
- ✅ Kills existing processes
- 🌐 Starts only the Next.js dashboard
- ⚡ **3-5 second startup**
- 💡 Use for frontend development without ML server

---

### 🛑 **stop-all-processes.bat/.sh**
**Complete system shutdown**

**What it does:**
- ❌ Kills all Node.js processes
- ❌ Stops Redis server
- ❌ Cleans up command windows
- 🔍 Verifies all processes stopped

---

## 🔧 Usage Instructions

### **🏆 RECOMMENDED: Windows Command Prompt (opens separate windows):**
```batch
# Full system startup
start-complete-system.bat

# Testing/development
start-test-system.bat

# Dashboard only
start-dashboard-only.bat

# Stop everything
stop-all-processes.bat
```

### **Alternative: Git Bash (Windows) or Linux/macOS (background processes):**
```bash
# Make scripts executable (first time)
chmod +x *.sh

# Full system startup
./start-complete-system.sh

# Stop everything  
./stop-all-processes.sh
```

> **💡 Why use .bat files?** Each service runs in its own window for easy monitoring:
> - **Redis Server:** Separate window to monitor connection logs
> - **ML Server:** Separate window to see TensorFlow loading progress  
> - **Trading Dashboard:** Separate window to monitor compilation status
> - **Debug connection issues:** Easy access to all logs in individual windows

---

## ⚡ Quick Troubleshooting

### **"Address already in use" errors:**
```bash
# Stop all processes first
./stop-all-processes.sh
# or
stop-all-processes.bat

# Wait 5 seconds, then restart
```

### **Dashboard won't load (Tailwind CSS errors):**
```bash
# Clear Next.js cache and restart
rm -rf .next
npm run dev:dashboard
```

### **ML Server taking too long to start:**
- **First startup:** 30-45 seconds (normal - creating TensorFlow models)
- **Subsequent startups:** 15-20 seconds
- Check logs for "✅ All Enhanced ML models loaded successfully"

### **Git Bash process killing issues:**
```bash
# Manual process cleanup
taskkill //F //IM node.exe
taskkill //F //IM redis-server.exe
```

---

## 📊 Port Reference

| Service | Port | URL |
|---------|------|-----|
| 🌐 Trading Dashboard | 3000 | http://localhost:3000 |
| 🤖 ML Server Web | 8080 | http://localhost:8080 |
| 🎯 NinjaTrader TCP | 9999 | TCP connection |
| 🗄️ Redis Server | 6379 | Internal |
| 🐘 PostgreSQL | 5432 | Internal |

---

## ⚠️ Important Notes

1. **First-time startup** of the complete system takes 30-45 seconds due to TensorFlow model initialization
2. **Redis and PostgreSQL are optional** - the system will work without them but with reduced functionality
3. **Windows users** should use `.bat` scripts in Command Prompt for best compatibility
4. **Git Bash users** should use `.sh` scripts
5. **Always stop processes before restarting** to avoid port conflicts
6. **Dashboard compilation** takes 5-10 seconds on first load due to Next.js compilation

---

## 🔗 Related Files

- `README.md` - Main project documentation
- `package.json` - Contains `dev:dashboard` and `dev` scripts
- `ml-server.js` - Main ML server
- `database-schema.sql` - PostgreSQL setup
- `redis/` - Redis server binaries 