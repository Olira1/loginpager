// Check Users in TiDB Database
// Run this with: node check-users.js

require('dotenv').config({ path: '.env.production' });
const mysql = require('mysql2/promise');

async function checkUsers() {
  console.log('👥 Checking users in TiDB Cloud...\n');

  try {
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

    // Get all users
    const [users] = await connection.query(`
      SELECT id, name, email, role, school_id, is_active 
      FROM users 
      ORDER BY role, id
    `);

    console.log(`📊 Total Users: ${users.length}\n`);

    // Group by role
    const roles = ['admin', 'school_head', 'teacher', 'class_head', 'student', 'parent', 'store_house'];
    
    roles.forEach(role => {
      const roleUsers = users.filter(u => u.role === role);
      if (roleUsers.length > 0) {
        console.log(`\n${role.toUpperCase().replace('_', ' ')} (${roleUsers.length}):`);
        roleUsers.forEach(user => {
          console.log(`  ${user.id}. ${user.name}`);
          console.log(`     Email: ${user.email}`);
          console.log(`     School ID: ${user.school_id || 'N/A'}`);
          console.log(`     Active: ${user.is_active ? 'Yes' : 'No'}`);
        });
      }
    });

    // Get counts by role
    console.log('\n\n📈 Summary by Role:');
    const [roleCounts] = await connection.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role 
      ORDER BY role
    `);
    
    roleCounts.forEach(row => {
      console.log(`  ${row.role}: ${row.count}`);
    });

    // Check students
    const [studentCount] = await connection.query('SELECT COUNT(*) as count FROM students');
    console.log(`\n👨‍🎓 Students with full records: ${studentCount[0].count}`);

    // Check schools
    const [schools] = await connection.query('SELECT id, name, school_head_id FROM schools');
    console.log(`\n🏫 Schools: ${schools.length}`);
    schools.forEach(school => {
      console.log(`  ${school.id}. ${school.name} (Head: User #${school.school_head_id || 'None'})`);
    });

    await connection.end();
    console.log('\n✅ Check complete!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Check failed!');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
