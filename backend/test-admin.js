// Test script for Admin API endpoints
const http = require('http');

let adminToken = null;

const makeRequest = (method, path, data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseData) });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('='.repeat(50));
  console.log('ADMIN API TEST');
  console.log('='.repeat(50));

  // 1. Login as admin
  console.log('\n1. Login as Admin...');
  const loginRes = await makeRequest('POST', '/auth/login', {
    email: 'admin@schoolportal.edu.et',
    password: 'password123'
  });
  
  if (loginRes.data.success) {
    adminToken = loginRes.data.data.access_token;
    console.log('✅ Logged in as:', loginRes.data.data.user.name);
  } else {
    console.log('❌ Login failed:', loginRes.data.error?.message);
    return;
  }

  // 2. Get platform statistics
  console.log('\n2. Get Platform Statistics...');
  const statsRes = await makeRequest('GET', '/admin/statistics', null, adminToken);
  if (statsRes.data.success) {
    console.log('✅ Statistics:');
    console.log('   Schools:', statsRes.data.data.schools.total, '(active:', statsRes.data.data.schools.active + ')');
    console.log('   Users:', statsRes.data.data.users.total);
    console.log('   Students:', statsRes.data.data.students.total);
  } else {
    console.log('❌ Failed:', statsRes.data.error?.message);
  }

  // 3. List schools
  console.log('\n3. List Schools...');
  const schoolsRes = await makeRequest('GET', '/admin/schools', null, adminToken);
  if (schoolsRes.data.success) {
    console.log('✅ Found', schoolsRes.data.data.items.length, 'schools:');
    schoolsRes.data.data.items.forEach(s => {
      console.log(`   - ${s.name} (${s.code}) - ${s.status}`);
    });
  } else {
    console.log('❌ Failed:', schoolsRes.data.error?.message);
  }

  // 4. Get school details
  console.log('\n4. Get School Details (ID: 1)...');
  const schoolRes = await makeRequest('GET', '/admin/schools/1', null, adminToken);
  if (schoolRes.data.success) {
    const s = schoolRes.data.data;
    console.log('✅ School:', s.name);
    console.log('   Code:', s.code);
    console.log('   Status:', s.status);
    console.log('   School Head:', s.school_head?.name || 'Not assigned');
    console.log('   Students:', s.statistics.total_students);
    console.log('   Teachers:', s.statistics.total_teachers);
    console.log('   Classes:', s.statistics.total_classes);
  } else {
    console.log('❌ Failed:', schoolRes.data.error?.message);
  }

  // 5. List promotion criteria
  console.log('\n5. List Promotion Criteria...');
  const criteriaRes = await makeRequest('GET', '/admin/promotion-criteria', null, adminToken);
  if (criteriaRes.data.success) {
    console.log('✅ Found', criteriaRes.data.data.items.length, 'criteria:');
    criteriaRes.data.data.items.forEach(c => {
      console.log(`   - ${c.name} (pass avg: ${c.passing_average}, max fail: ${c.max_failing_subjects})`);
    });
  } else {
    console.log('❌ Failed:', criteriaRes.data.error?.message);
  }

  // 6. Test role protection (try with non-admin)
  console.log('\n6. Test Role Protection (login as teacher)...');
  const teacherLogin = await makeRequest('POST', '/auth/login', {
    email: 'tigist@aass.edu.et',
    password: 'password123'
  });
  
  if (teacherLogin.data.success) {
    const teacherToken = teacherLogin.data.data.access_token;
    const forbiddenRes = await makeRequest('GET', '/admin/schools', null, teacherToken);
    if (forbiddenRes.status === 403) {
      console.log('✅ Role protection working - Teacher cannot access admin routes');
    } else {
      console.log('❌ Role protection failed - Status:', forbiddenRes.status);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('ADMIN API TESTS COMPLETE');
  console.log('='.repeat(50));
};

runTests().catch(err => {
  console.error('Test error:', err.message);
  console.log('\nMake sure the server is running: node server.js');
});




