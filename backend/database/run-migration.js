// Run database migrations
require('dotenv').config();
const mysql = require('mysql2/promise');

const runMigration = async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('Running migrations...\n');

    // Migration 1: Add code column to schools
    try {
      await pool.query('ALTER TABLE schools ADD COLUMN code VARCHAR(20) UNIQUE AFTER name');
      console.log('✅ Added code column to schools');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⏭️  code column already exists');
      } else {
        throw e;
      }
    }

    // Migration 2: Add status column to schools
    try {
      await pool.query("ALTER TABLE schools ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active' AFTER email");
      console.log('✅ Added status column to schools');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('⏭️  status column already exists');
      } else {
        throw e;
      }
    }

    // Update existing schools with codes
    await pool.query("UPDATE schools SET code = 'AASS', status = 'active' WHERE id = 1 AND (code IS NULL OR code = '')");
    await pool.query("UPDATE schools SET code = 'BDCS', status = 'active' WHERE id = 2 AND (code IS NULL OR code = '')");
    console.log('✅ Updated existing schools with codes');

    console.log('\n✅ All migrations complete!');
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigration();




