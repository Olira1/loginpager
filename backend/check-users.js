import pool from './db.js'

async function checkUsers() {
  try {
    console.log('Fetching all users from TiDB...\n')
    
    const [users] = await pool.query('SELECT id, email, created_at FROM users')
    
    if (users.length === 0) {
      console.log('❌ No users found in database')
    } else {
      console.log(`✅ Found ${users.length} user(s):\n`)
      users.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`)
        console.log(`   Email: ${user.email}`)
        console.log(`   Created: ${user.created_at}`)
        console.log('')
      })
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error fetching users:', error.message)
    process.exit(1)
  }
}

checkUsers()
