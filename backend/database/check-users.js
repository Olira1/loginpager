// Check users in database
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsers() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('=== Users in Database ===\n');

  // Get all users grouped by role
  const [users] = await pool.query(
    'SELECT id, name, email, role, password FROM users ORDER BY role, id'
  );

  const byRole = {};
  users.forEach(u => {
    if (!byRole[u.role]) byRole[u.role] = [];
    byRole[u.role].push(u);
  });

  for (const role in byRole) {
    console.log(`\n--- ${role.toUpperCase()} ---`);
    byRole[role].forEach(u => {
      const isHashed = u.password.startsWith('$2');
      console.log(`  ${u.email} | Hashed: ${isHashed ? 'YES' : 'NO'}`);
    });
  }

  await pool.end();
}

checkUsers().catch(err => console.error('Error:', err.message));

