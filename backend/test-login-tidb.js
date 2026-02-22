// Test Login Against TiDB Cloud
// This tests if login works with TiDB database

require('dotenv').config({ path: '.env.production' });
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function testLogin() {
  console.log('🔍 Testing Login Against TiDB Cloud...\n');

  try {
    // Create connection to TiDB
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

    console.log('✅ Connected to TiDB Cloud\n');

    // Test credentials
    const testEmail = 'henok@aass.edu.et';
    const testPassword = 'password123';

    console.log(`Testing login with:`);
    console.log(`  Email: ${testEmail}`);
    console.log(`  Password: ${testPassword}\n`);

    // Query for user
    const [users] = await connection.query(
      'SELECT * FROM users WHERE email = ?',
      [testEmail]
    );

    if (users.length === 0) {
      console.log('❌ User not found in database!');
      console.log('\nAvailable users:');
      const [allUsers] = await connection.query('SELECT id, name, email, role FROM users LIMIT 10');
      console.table(allUsers);
      await connection.end();
      return;
    }

    const user = users[0];
    console.log('✅ User found in database:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Active: ${user.is_active}`);
    console.log(`  School ID: ${user.school_id}\n`);

    // Test password
    console.log('🔐 Testing password...');
    const isPasswordValid = await bcrypt.compare(testPassword, user.password);

    if (isPasswordValid) {
      console.log('✅ Password is CORRECT!\n');
      console.log('🎉 Login would succeed!');
      
      // Get school info
      if (user.school_id) {
        const [schools] = await connection.query(
          'SELECT name, status FROM schools WHERE id = ?',
          [user.school_id]
        );
        if (schools.length > 0) {
          console.log(`\nSchool: ${schools[0].name}`);
          console.log(`Status: ${schools[0].status}`);
        }
      }
    } else {
      console.log('❌ Password is INCORRECT!');
      console.log('\nThis means the password hash in the database does not match "password123"');
      console.log('Expected hash: $2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK');
      console.log(`Actual hash:   ${user.password}`);
    }

    await connection.end();
    console.log('\n✅ Test completed');

  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
  }
}

testLogin();
