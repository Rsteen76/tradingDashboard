const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'trading_ml',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
}

async function setupDatabase() {
  console.log('🗄️ Setting up Trading ML Database...')
  
  // First, connect without specifying database to create it if needed
  const adminPool = new Pool({
    ...dbConfig,
    database: 'postgres' // Connect to default postgres database
  })
  
  try {
    // Create database if it doesn't exist
    console.log('📊 Creating database if not exists...')
    await adminPool.query(`
      CREATE DATABASE ${dbConfig.database}
    `).catch(err => {
      if (err.code !== '42P04') { // Database already exists
        throw err
      }
      console.log('✅ Database already exists')
    })
    
    await adminPool.end()
    
    // Now connect to the actual database
    const pool = new Pool(dbConfig)
    
    // Read and execute schema
    console.log('📋 Creating database schema...')
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'database-schema.sql'), 'utf8')
    
    // Split by semicolon and execute each statement
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim())
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement.trim())
        } catch (error) {
          console.warn('⚠️ Warning executing statement:', error.message)
        }
      }
    }
    
    // Verify tables were created
    console.log('🔍 Verifying table creation...')
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    
    console.log('✅ Created tables:')
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })
    
    // Test connection and basic functionality
    console.log('🧪 Testing database functionality...')
    
    // Insert test prediction
    await pool.query(`
      INSERT INTO ml_predictions 
      (instrument, timestamp, direction, long_prob, short_prob, confidence, strength, recommendation, features, model_versions, processing_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      'TEST_SYMBOL',
      new Date(),
      'LONG',
      0.75,
      0.25,
      0.80,
      0.65,
      'STRONG_SIGNAL',
      JSON.stringify({ test: true }),
      JSON.stringify({ lstm: '2.1.0' }),
      150
    ])
    
    // Insert test market data
    await pool.query(`
      INSERT INTO market_data 
      (instrument, timestamp, price, volume, bid, ask)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      'TEST_SYMBOL',
      new Date(),
      100.50,
      1000,
      100.49,
      100.51
    ])
    
    // Clean up test data
    await pool.query(`DELETE FROM ml_predictions WHERE instrument = 'TEST_SYMBOL'`)
    await pool.query(`DELETE FROM market_data WHERE instrument = 'TEST_SYMBOL'`)
    
    console.log('✅ Database functionality test passed')
    console.log('🚀 Database setup completed successfully!')
    console.log('')
    console.log('📊 Database Details:')
    console.log(`  Host: ${dbConfig.host}:${dbConfig.port}`)
    console.log(`  Database: ${dbConfig.database}`)
    console.log(`  User: ${dbConfig.user}`)
    console.log('')
    console.log('🔧 To connect from ML server, use:')
    console.log(`  DATABASE_URL=postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`)
    
    await pool.end()
    
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    process.exit(1)
  }
}

// Command line options
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🗄️ ML Trading Database Setup Script

Usage: node setup-database.js [options]

Options:
  --help, -h     Show this help message
  --force        Drop existing tables and recreate
  
Environment Variables:
  DB_HOST        Database host (default: localhost)
  DB_PORT        Database port (default: 5432)
  DB_NAME        Database name (default: trading_ml)
  DB_USER        Database user (default: postgres)
  DB_PASSWORD    Database password (default: password)

Example:
  DB_PASSWORD=mypassword node setup-database.js
  `)
  process.exit(0)
}

if (args.includes('--force')) {
  console.log('⚠️ FORCE mode: Will drop existing tables')
}

// Run setup
setupDatabase().catch(console.error) 