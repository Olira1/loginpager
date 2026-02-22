// Test login locally
// Run this with: node test-login-local.js

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function testLogin() {
  console.log('🔐 Testing login...\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
      } : undefined
    });

    console.log('✅ Connected to database\n');

    // Check if admin user exists
    const [users] = await connection.query(
      'SELECT id, name, email, password, role FROM users WHERE email = ?',
      ['admin@schoolportal.com']
    );

    if (users.length === 0) {
      console.log('❌ Admin user not found!');
      console.log('Run: node seed-tidb-database.js');
      process.exit(1);
    }

    const user = users[0];
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Password Hash: ${user.password.substring(0, 20)}...`);

    // Test password
    console.log('\n🔑 Testing password "password123"...');
    const isMatch = await bcrypt.compare('password123', user.password);
    
    if (isMatch) {
      console.log('✅ Password matches!');
    } else {
      console.log('❌ Password does NOT match!');
      console.log('The password hash in database might be wrong.');
    }

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testLogin();
