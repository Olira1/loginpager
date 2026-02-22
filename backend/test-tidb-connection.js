// Test TiDB Cloud Connection
// Run this with: node test-tidb-connection.js

require('dotenv').config({ path: '.env.production' });
const mysql = require('mysql2/promise');

async function testTiDBConnection() {
  console.log('🔍 Testing TiDB Cloud Connection...\n');
  
  console.log('Connection Details:');
  console.log('  Host:', process.env.DB_HOST);
  console.log('  Port:', process.env.DB_PORT);
  console.log('  User:', process.env.DB_USER);
  console.log('  Database:', process.env.DB_NAME);
  console.log('  SSL:', process.env.DB_SSL);
  console.log('');

  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
      }
    });

    console.log('✅ Successfully connected to TiDB Cloud!\n');

    // Test query: Get current time
    const [timeResult] = await connection.query('SELECT NOW() as current_db_time');
    console.log('📅 Current database time:', timeResult[0].current_db_time);

    // Test query: Show all tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('\n📊 Tables in database:');
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${Object.values(table)[0]}`);
    });

    // Test query: Count users
    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n👥 Total users: ${userCount[0].count}`);

    await connection.end();
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testTiDBConnection();
