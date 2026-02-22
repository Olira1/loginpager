// Test script for School Head API endpoints
const http = require('http');

let schoolHeadToken = null;

const makeRequest = (method, path, data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1${path}`,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (token) options.headers['Authorization'] = `Bearer ${token}`;

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
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
};

const runTests = async () => {
  console.log('='.repeat(50));
  console.log('SCHOOL HEAD API TEST');
  console.log('='.repeat(50));

  // 1. Login as School Head
  console.log('\n1. Login as School Head...');
  const loginRes = await makeRequest('POST', '/auth/login', {
    email: 'kebede@aass.edu.et',
    password: 'password123'
  });
  
  if (loginRes.data.success) {
    schoolHeadToken = loginRes.data.data.access_token;
    console.log('✅ Logged in as:', loginRes.data.data.user.name);
    console.log('   School:', loginRes.data.data.user.school_name);
  } else {
    console.log('❌ Login failed:', loginRes.data.error?.message);
    return;
  }

  // 2. List Grades
  console.log('\n2. List Grades...');
  const gradesRes = await makeRequest('GET', '/school/grades', null, schoolHeadToken);
  if (gradesRes.data.success) {
    console.log('✅ Found', gradesRes.data.data.items.length, 'grades:');
    gradesRes.data.data.items.forEach(g => {
      console.log(`   - ${g.name} (Level ${g.level}) - ${g.total_classes} classes, ${g.total_students} students`);
    });
  } else {
    console.log('❌ Failed:', gradesRes.data.error?.message);
  }

  // 3. List Classes
  console.log('\n3. List Classes...');
  const classesRes = await makeRequest('GET', '/school/classes', null, schoolHeadToken);
  if (classesRes.data.success) {
    console.log('✅ Found', classesRes.data.data.items.length, 'classes:');
    classesRes.data.data.items.slice(0, 5).forEach(c => {
      console.log(`   - ${c.grade_name} ${c.name} - ${c.student_count} students, Head: ${c.class_head?.name || 'None'}`);
    });
  } else {
    console.log('❌ Failed:', classesRes.data.error?.message);
  }

  // 4. Get Class Details
  console.log('\n4. Get Class Details (ID: 1)...');
  const classRes = await makeRequest('GET', '/school/classes/1', null, schoolHeadToken);
  if (classRes.data.success) {
    const c = classRes.data.data;
    console.log('✅ Class:', c.grade.name, c.name);
    console.log('   Class Head:', c.class_head?.name || 'Not assigned');
    console.log('   Students:', c.student_count);
    console.log('   Teaching Assignments:', c.teaching_assignments.length);
    c.teaching_assignments.slice(0, 3).forEach(ta => {
      console.log(`     - ${ta.subject_name}: ${ta.teacher_name}`);
    });
  } else {
    console.log('❌ Failed:', classRes.data.error?.message);
  }

  // 5. List Subjects
  console.log('\n5. List Subjects...');
  const subjectsRes = await makeRequest('GET', '/school/subjects', null, schoolHeadToken);
  if (subjectsRes.data.success) {
    console.log('✅ Found', subjectsRes.data.data.items.length, 'subjects:');
    subjectsRes.data.data.items.forEach(s => {
      console.log(`   - ${s.name}`);
    });
  } else {
    console.log('❌ Failed:', subjectsRes.data.error?.message);
  }

  // 6. List Assessment Types
  console.log('\n6. List Assessment Types...');
  const typesRes = await makeRequest('GET', '/school/assessment-types', null, schoolHeadToken);
  if (typesRes.data.success) {
    console.log('✅ Found', typesRes.data.data.items.length, 'assessment types:');
    typesRes.data.data.items.forEach(t => {
      console.log(`   - ${t.name} (${t.default_weight_percent}%)`);
    });
  } else {
    console.log('❌ Failed:', typesRes.data.error?.message);
  }

  // 7. List Teachers
  console.log('\n7. List Teachers...');
  const teachersRes = await makeRequest('GET', '/school/teachers', null, schoolHeadToken);
  if (teachersRes.data.success) {
    console.log('✅ Found', teachersRes.data.data.items.length, 'teachers:');
    teachersRes.data.data.items.forEach(t => {
      console.log(`   - ${t.name} (${t.role}) - ${t.phone}`);
    });
  } else {
    console.log('❌ Failed:', teachersRes.data.error?.message);
  }

  // 8. List Teaching Assignments
  console.log('\n8. List Teaching Assignments...');
  const assignmentsRes = await makeRequest('GET', '/school/teaching-assignments', null, schoolHeadToken);
  if (assignmentsRes.data.success) {
    console.log('✅ Found', assignmentsRes.data.data.items.length, 'teaching assignments:');
    assignmentsRes.data.data.items.slice(0, 5).forEach(a => {
      console.log(`   - ${a.teacher.name} → ${a.class.grade_name} ${a.class.name} → ${a.subject.name}`);
    });
  } else {
    console.log('❌ Failed:', assignmentsRes.data.error?.message);
  }

  // 9. Test Role Protection
  console.log('\n9. Test Role Protection (login as teacher)...');
  const teacherLogin = await makeRequest('POST', '/auth/login', {
    email: 'tigist@aass.edu.et',
    password: 'password123'
  });
  
  if (teacherLogin.data.success) {
    const teacherToken = teacherLogin.data.data.access_token;
    const forbiddenRes = await makeRequest('GET', '/school/grades', null, teacherToken);
    if (forbiddenRes.status === 403) {
      console.log('✅ Role protection working - Teacher cannot access school head routes');
    } else {
      console.log('❌ Role protection failed - Status:', forbiddenRes.status);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('SCHOOL HEAD API TESTS COMPLETE');
  console.log('='.repeat(50));
};

runTests().catch(err => {
  console.error('Test error:', err.message);
  console.log('\nMake sure the server is running: node server.js');
});




