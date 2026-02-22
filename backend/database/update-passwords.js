// Script to update user passwords with proper bcrypt hashes
// Run this after importing seed.sql to fix the passwords
// Usage: node database/update-passwords.js

require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const updatePasswords = async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'school_portal'
  });

  try {
    console.log('Connecting to database...');
    
    // Generate proper hash for "password123"
    const defaultPassword = 'password123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);
    
    console.log('Generated hash for "password123"');
    console.log('Hash:', hashedPassword);

    // Update all users with the proper hash
    const [result] = await pool.query(
      'UPDATE users SET password = ?',
      [hashedPassword]
    );

    console.log(`\n✅ Updated ${result.affectedRows} user passwords`);
    console.log('\nAll users can now login with:');
    console.log('Password: password123');

    // List all users for reference
    const [users] = await pool.query(
      'SELECT id, name, email, role FROM users ORDER BY id'
    );

    console.log('\n--- User Accounts ---');
    users.forEach(user => {
      console.log(`${user.role.padEnd(12)} | ${user.email}`);
    });

    await pool.end();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

updatePasswords();




