const { Pool } = require('pg')

async function setupDatabase() {
  console.log('🗄️ Setting up Trading ML Database...')
  
  // Try to connect to PostgreSQL
  let pool
  try {
    // First try to connect to default postgres database
    pool = new Pool({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: 'postgres',
      connectionTimeoutMillis: 5000
    })
    
    await pool.query('SELECT NOW()')
    console.log('✅ PostgreSQL connection successful!')
    
  } catch (error) {
    console.log('❌ PostgreSQL not available:', error.message)
    console.log('📝 To set up PostgreSQL:')
    console.log('   1. Install PostgreSQL from https://www.postgresql.org/download/')
    console.log('   2. Set password with: set POSTGRES_PASSWORD=your_password')
    console.log('   3. Run this script again')
    return
  }
  
  try {
    // Create database
    console.log('📊 Creating trading_ml database...')
    await pool.query('CREATE DATABASE trading_ml')
    console.log('✅ Database created successfully!')
  } catch (error) {
    if (error.code === '42P04') {
      console.log('✅ Database trading_ml already exists')
    } else {
      console.log('❌ Error creating database:', error.message)
    }
  }
  
  await pool.end()
  
  // Connect to the trading_ml database
  try {
    pool = new Pool({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: 'trading_ml',
      connectionTimeoutMillis: 5000
    })
    
    console.log('📋 Creating tables...')
    
    // Create ml_predictions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ml_predictions (
        id SERIAL PRIMARY KEY,
        instrument VARCHAR(50),
        timestamp TIMESTAMP,
        direction VARCHAR(10),
        long_prob DECIMAL(5,4),
        short_prob DECIMAL(5,4),
        confidence DECIMAL(5,4),
        strength DECIMAL(5,4),
        recommendation VARCHAR(20),
        features JSONB,
        model_versions JSONB,
        processing_time INTEGER
      )
    `)
    console.log('✅ ml_predictions table created')
    
    // Create market_data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_data (
        instrument VARCHAR(50),
        timestamp TIMESTAMP,
        price DECIMAL(10,2),
        volume INTEGER,
        bid DECIMAL(10,2),
        ask DECIMAL(10,2),
        high DECIMAL(10,2),
        low DECIMAL(10,2),
        close DECIMAL(10,2),
        open DECIMAL(10,2),
        rsi DECIMAL(5,2),
        ema_alignment DECIMAL(5,4),
        macd DECIMAL(10,4),
        bollinger_upper DECIMAL(10,2),
        bollinger_lower DECIMAL(10,2),
        bollinger_middle DECIMAL(10,2),
        atr DECIMAL(10,4),
        obv BIGINT,
        vwap DECIMAL(10,2),
        PRIMARY KEY (instrument, timestamp)
      )
    `)
    console.log('✅ market_data table created')
    
    // Create training_data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS training_data (
        id SERIAL PRIMARY KEY,
        model_name VARCHAR(50),
        timestamp TIMESTAMP DEFAULT NOW(),
        features FLOAT[],
        label JSONB
      )
    `)
    console.log('✅ training_data table created')
    
    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ml_predictions_instrument_timestamp 
      ON ml_predictions(instrument, timestamp)
    `)
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_market_data_instrument 
      ON market_data(instrument)
    `)
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_training_data_model_timestamp 
      ON training_data(model_name, timestamp)
    `)
    
    console.log('✅ Indexes created')
    
    // Test the connection with a simple query
    const result = await pool.query('SELECT COUNT(*) FROM ml_predictions')
    console.log(`✅ Database setup complete! ml_predictions has ${result.rows[0].count} records`)
    
    await pool.end()
    
  } catch (error) {
    console.log('❌ Error setting up tables:', error.message)
    if (pool) await pool.end()
  }
}

// Run setup
setupDatabase().catch(console.error) 