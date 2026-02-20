import pool from './db.js'

async function testConnection() {
  try {
    console.log('Testing database connection...')
    
    const connection = await pool.getConnection()
    console.log('✅ Connected to MySQL database successfully!')
    
    // Test query
    const [rows] = await connection.query('SELECT 1 + 1 AS result')
    console.log('✅ Test query successful:', rows[0])
    
    // Check if users table exists
    const [tables] = await connection.query('SHOW TABLES')
    console.log('✅ Tables in database:', tables)
    
    connection.release()
    console.log('\n✅ Database connection test passed!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Database connection failed:')
    console.error('Error:', error.message)
    console.error('\nPlease check:')
    console.error('1. MAMP is running')
    console.error('2. MySQL port is 8889 (default MAMP port)')
    console.error('3. Database "fortune" exists')
    console.error('4. User "fortune" has access to the database')
    console.error('5. Password is correct')
    process.exit(1)
  }
}

testConnection()
