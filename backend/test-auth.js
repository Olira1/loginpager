// Simple test script for auth endpoints
const http = require('http');

const testLogin = () => {
  const data = JSON.stringify({
    email: 'admin@schoolportal.edu.et',
    password: 'password123'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  console.log('Testing login endpoint...');
  console.log('POST /api/v1/auth/login');
  console.log('Email: admin@schoolportal.edu.et');
  console.log('');

  const req = http.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:');
      try {
        const json = JSON.parse(responseData);
        console.log(JSON.stringify(json, null, 2));
        
        if (json.success && json.data?.access_token) {
          console.log('\n✅ Login successful!');
          console.log('\nNow testing /auth/me with token...');
          testGetMe(json.data.access_token);
        } else {
          console.log('\n❌ Login failed');
        }
      } catch (e) {
        console.log(responseData);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e.message);
    console.log('\nMake sure the server is running: node server.js');
  });

  req.write(data);
  req.end();
};

const testGetMe = (token) => {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/me',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log('\nGET /api/v1/auth/me');
      console.log('Status:', res.statusCode);
      console.log('Response:');
      try {
        const json = JSON.parse(responseData);
        console.log(JSON.stringify(json, null, 2));
        
        if (json.success) {
          console.log('\n✅ Get current user successful!');
        }
      } catch (e) {
        console.log(responseData);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e.message);
  });

  req.end();
};

// Run test
testLogin();




