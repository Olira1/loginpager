// Test API login endpoint
// Run this with: node test-api-login.js
// Make sure backend is running first!

const axios = require('axios');

async function testLogin() {
  console.log('🔐 Testing login API endpoint...\n');

  try {
    const response = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'admin@schoolportal.com',
      password: 'password123'
    });

    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Login failed!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testLogin();
