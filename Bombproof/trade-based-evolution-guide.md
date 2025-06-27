# Trade-Based Parameter Evolution Implementation

## Step 1: Add Milestone Configuration
**File:** `server/src/core/bombproof-ai-trading.js`  
**Location:** After constructor, before `initialize()`

```javascript
// Add trading milestones configuration
const TRADING_MILESTONES = {
  DISCOVERY: {
    trades: 0,
    config: {
      minConfidence: 0.50,
      maxDailyLoss: 3000,
      maxConsecutiveLosses: 7,
      minProfitTarget: 10,
      status: "Discovering patterns"
    }
  },
  FILTERING: {
    trades: 50,
    config: {
      minConfidence: 0.60,
      maxDailyLoss: 2000,
      maxConsecutiveLosses: 5,
      minProfitTarget: 15,
      status: "Filtering bad patterns"
    }
  },
  OPTIMIZING: {
    trades: 100,
    config: {
      minConfidence: 0.65,
      maxDailyLoss: 1500,
      maxConsecutiveLosses: 4,
      status: "Optimizing parameters"
    }
  },
  REFINING: {
    trades: 200,
    config: {
      minConfidence: 0.70,
      maxDailyLoss: 1000,
      maxConsecutiveLosses: 3,
      status: "Fine-tuning system"
    }
  },
  PRODUCTION: {
    trades: 300,
    config: {
      minConfidence: 0.75,
      maxDailyLoss: 1000,
      status: "Production ready"
    },
    requirements: {
      minWinRate: 0.52,
      minProfitFactor: 1.2,
      maxDrawdown: 0.15
    }
  }
};
```

## Step 2: Add Milestone Tracking
**File:** `server/src/core/bombproof-ai-trading.js`  
**Location:** In constructor

```javascript
// Add to constructor
this.milestonesReached = new Set();
this.blacklistedPatterns = new Set();
this.blacklistedHours = new Set();
this.profitableHours = [];
this.unprofitableHours = [];
```

## Step 3: Add Auto-Evolution Methods
**File:** `server/src/core/bombproof-ai-trading.js`  
**Location:** After `learnFromTrade()` method

```javascript
async checkMilestones() {
  const totalTrades = this.tradeTracker?.statistics.overall.totalTrades || 0;
  
  for (const [name, milestone] of Object.entries(TRADING_MILESTONES)) {
    if (totalTrades >= milestone.trades && !this.milestonesReached.has(name)) {
      
      // Check requirements if any
      if (milestone.requirements) {
        const stats = this.tradeTracker.statistics.overall;
        if (stats.winRate < milestone.requirements.minWinRate ||
            stats.profitFactor < milestone.requirements.minProfitFactor ||
            stats.maxDrawdown > milestone.requirements.maxDrawdown) {
          logger.warn(`Milestone ${name} reached but requirements not met`, {
            trades: totalTrades,
            requirements: milestone.requirements,
            actual: {
              winRate: stats.winRate,
              profitFactor: stats.profitFactor,
              maxDrawdown: stats.maxDrawdown
            }
          });
          continue;
        }
      }
      
      // Apply milestone configuration
      Object.entries(milestone.config).forEach(([key, value]) => {
        if (key !== 'status' && this.riskState[key] !== undefined) {
          this.riskState[key] = value;
        }
        if (this.confidenceThresholds[key] !== undefined) {
          this.confidenceThresholds.current = value;
        }
      });
      
      this.milestonesReached.add(name);
      logger.info(`🎯 Milestone reached: ${name}`, milestone.config);
      this.emit('milestoneReached', { name, config: milestone.config });
    }
  }
}

async evaluateAfterTrade() {
  const stats = this.tradeTracker?.statistics.overall || {};
  const totalTrades = stats.totalTrades || 0;
  
  // Check milestones
  await this.checkMilestones();
  
  // Pattern evaluation every 25 trades
  if (totalTrades > 0 && totalTrades % 25 === 0) {
    await this.evaluatePatterns();
  }
  
  // Hour evaluation every 30 trades
  if (totalTrades > 0 && totalTrades % 30 === 0) {
    await this.evaluateHours();
  }
  
  // Emergency adjustments
  if (stats.winRate < 0.30 && totalTrades > 20) {
    this.emergencyTighten();
  }
}

async evaluatePatterns() {
  const patterns = this.tradeTracker?.statistics.byPattern || {};
  
  Object.entries(patterns).forEach(([pattern, stats]) => {
    if (stats.trades >= 5) {
      if (stats.winRate < 0.35) {
        this.blacklistedPatterns.add(pattern);
        logger.info(`❌ Blacklisted pattern: ${pattern}`, stats);
      } else if (stats.winRate > 0.65) {
        logger.info(`✅ Profitable pattern found: ${pattern}`, stats);
      }
    }
  });
}

async evaluateHours() {
  const hours = this.tradeTracker?.statistics.byHour || {};
  
  Object.entries(hours).forEach(([hour, stats]) => {
    if (stats.trades >= 5) {
      if (stats.winRate < 0.35) {
        this.blacklistedHours.add(parseInt(hour));
        logger.info(`❌ Blacklisted hour: ${hour}:00`, stats);
      } else if (stats.winRate > 0.60) {
        this.profitableHours.push(parseInt(hour));
        logger.info(`✅ Profitable hour found: ${hour}:00`, stats);
      }
    }
  });
}

emergencyTighten() {
  this.confidenceThresholds.current = Math.min(
    this.confidenceThresholds.current + 0.10,
    0.90
  );
  logger.warn('🚨 Emergency tightening applied', {
    newConfidence: this.confidenceThresholds.current
  });
}

getProgressReport() {
  const stats = this.tradeTracker?.statistics.overall || {};
  const currentMilestone = this.getCurrentMilestone();
  const nextMilestone = this.getNextMilestone();
  
  return {
    currentPhase: currentMilestone?.config.status || 'Initializing',
    totalTrades: stats.totalTrades || 0,
    tradesToNext: nextMilestone ? nextMilestone.trades - (stats.totalTrades || 0) : 0,
    
    performance: {
      winRate: `${((stats.winRate || 0) * 100).toFixed(1)}%`,
      avgWin: `$${(stats.avgWin || 0).toFixed(2)}`,
      avgLoss: `$${(stats.avgLoss || 0).toFixed(2)}`,
      profitFactor: (stats.profitFactor || 0).toFixed(2)
    },
    
    discovered: {
      blacklistedPatterns: this.blacklistedPatterns.size,
      blacklistedHours: this.blacklistedHours.size,
      profitableHours: this.profitableHours.length
    },
    
    currentSettings: {
      confidence: this.confidenceThresholds.current,
      dailyLoss: this.riskState.maxDailyLoss,
      profitTarget: this.profitState.targetMinProfit || 25
    }
  };
}

getCurrentMilestone() {
  const totalTrades = this.tradeTracker?.statistics.overall.totalTrades || 0;
  let current = null;
  
  for (const [name, milestone] of Object.entries(TRADING_MILESTONES)) {
    if (totalTrades >= milestone.trades) {
      current = milestone;
    }
  }
  
  return current;
}

getNextMilestone() {
  const totalTrades = this.tradeTracker?.statistics.overall.totalTrades || 0;
  
  for (const [name, milestone] of Object.entries(TRADING_MILESTONES)) {
    if (totalTrades < milestone.trades) {
      return milestone;
    }
  }
  
  return null;
}
```

## Step 4: Update Trade Validation
**File:** `server/src/core/bombproof-ai-trading.js`  
**Location:** In `setupDefaultValidators()`, add hour and pattern validators

```javascript
// Add pattern validator
this.tradeValidators.set('patternFilter', async (opt, pos, risk) => {
  const patterns = opt.patterns || [];
  const hasBlacklisted = patterns.some(p => this.blacklistedPatterns.has(p));
  
  return {
    passed: !hasBlacklisted,
    reason: hasBlacklisted ? 'Contains blacklisted pattern' : '',
    score: hasBlacklisted ? 0 : 1
  };
});

// Update time validator to check blacklisted hours
this.tradeValidators.set('timeFilter', async (opt, pos, risk) => {
  const hour = new Date().getHours();
  const isBlacklisted = this.blacklistedHours.has(hour);
  const restrictedHours = [20, 21, 22, 23, 0, 1, 2, 3, 4, 5];
  const isRestricted = restrictedHours.includes(hour);
  
  return {
    passed: !isBlacklisted && !isRestricted,
    reason: isBlacklisted ? `Hour ${hour} is blacklisted` : `Trading restricted during hour ${hour}`,
    score: this.profitableHours.includes(hour) ? 1 : 0.5
  };
});
```

## Step 5: Connect Evolution to Trade Completion
**File:** `server/src/core/bombproof-ai-trading.js`  
**Location:** In `learnFromTrade()` method, add at the end

```javascript
// Add at end of learnFromTrade()
await this.evaluateAfterTrade();
```

## Step 6: Add Progress Endpoint
**File:** `server.js`  
**Location:** In Socket.IO connection handler, add new event

```javascript
// Handle progress report request
socket.on('get_trading_progress', (ack) => {
  try {
    if (this.bombproofTrading) {
      const progress = this.bombproofTrading.getProgressReport();
      if (typeof ack === 'function') {
        ack(progress);
      }
    } else {
      if (typeof ack === 'function') ack({ error: 'system_unavailable' });
    }
  } catch (err) {
    logger.error('Error getting progress:', err.message);
    if (typeof ack === 'function') ack({ error: err.message });
  }
});
```

## Step 7: Update Initial Configuration
**File:** `config.js`  
**Location:** Update ML settings to start loose

```javascript
ml: {
  // Start with DISCOVERY phase parameters
  minConfidence: parseFloat(process.env.MIN_CONFIDENCE || '0.50'),
  strongConfidence: parseFloat(process.env.STRONG_CONFIDENCE || '0.60'),
  minStrength: parseFloat(process.env.MIN_STRENGTH || '0.05'),
  minProfitTarget: parseFloat(process.env.MIN_PROFIT_TARGET || '10'),
  maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS || '3000'),
  maxConsecutiveLosses: parseInt(process.env.MAX_CONSECUTIVE_LOSSES || '7'),
  // ... rest of existing config
}
```

## Testing Commands

```javascript
// Check current progress (in dashboard console)
socket.emit('get_trading_progress', (data) => console.log(data))

// Force milestone check
bombproofTrading.checkMilestones()

// View blacklisted patterns/hours
bombproofTrading.blacklistedPatterns
bombproofTrading.blacklistedHours
```

## Expected Progression

1. **Trades 0-50**: System takes many trades, learns patterns
2. **Trades 50-100**: Bad patterns filtered, confidence increases
3. **Trades 100-200**: Parameters optimize based on actual performance
4. **Trades 200-300**: Fine-tuning for consistency
5. **Trades 300+**: Production ready if requirements met

The system will automatically evolve based on actual trading results!