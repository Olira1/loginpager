import pool from './db.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigration(migrationFile) {
  try {
    console.log(`\n📦 Running migration: ${migrationFile}`)
    
    const migrationPath = path.join(__dirname, 'migrations', migrationFile)
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('SQL to execute:', sql)
    
    // Execute the entire SQL as one statement
    await pool.query(sql)
    
    console.log('✅ Migration completed successfully!')
    
    // Verify table was created
    const [tables] = await pool.query('SHOW TABLES')
    console.log('\n📋 Current tables:')
    tables.forEach(t => console.log('  -', Object.values(t)[0]))
    
    // Show structure of new table
    const [columns] = await pool.query('DESCRIBE fortune_history')
    console.log('\n� fortune_history structure:')
    columns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`))
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Get migration file from command line or use default
const migrationFile = process.argv[2] || '001_add_fortune_history.sql'
runMigration(migrationFile)
