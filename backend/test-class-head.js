// Test script for Class Head API endpoints
const http = require('http');

let classHeadToken = null;

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
  console.log('CLASS HEAD API TEST');
  console.log('='.repeat(50));

  // 1. Login as Class Head
  console.log('\n1. Login as Class Head...');
  const loginRes = await makeRequest('POST', '/auth/login', {
    email: 'berhanu@aass.edu.et',
    password: 'password123'
  });
  
  if (loginRes.data.success) {
    classHeadToken = loginRes.data.data.access_token;
    console.log('✅ Logged in as:', loginRes.data.data.user.name);
    console.log('   Role:', loginRes.data.data.user.role);
    console.log('   School:', loginRes.data.data.user.school_name);
  } else {
    console.log('❌ Login failed:', loginRes.data.error?.message);
    return;
  }

  // 2. List Students in Class
  console.log('\n2. List Students in Class...');
  const studentsRes = await makeRequest('GET', '/class-head/students', null, classHeadToken);
  if (studentsRes.data.success) {
    console.log(`✅ Class: ${studentsRes.data.data.class.name} (${studentsRes.data.data.class.grade_name})`);
    console.log(`   Found ${studentsRes.data.data.items.length} students:`);
    studentsRes.data.data.items.slice(0, 5).forEach(s => {
      console.log(`   - ${s.full_name} (${s.gender})`);
    });
  } else {
    console.log('❌ Failed:', studentsRes.data.error?.message);
  }

  // 3. Get Submission Checklist
  console.log('\n3. Get Submission Checklist (Semester 1)...');
  const checklistRes = await makeRequest('GET', '/class-head/submissions/checklist?semester_id=1', null, classHeadToken);
  if (checklistRes.data.success) {
    console.log(`✅ ${checklistRes.data.data.class.name} - ${checklistRes.data.data.semester}:`);
    console.log(`   Subjects: ${checklistRes.data.data.total_subjects}`);
    console.log(`   Submitted: ${checklistRes.data.data.submitted_count}, Pending: ${checklistRes.data.data.pending_count}`);
    checklistRes.data.data.subjects.slice(0, 5).forEach(s => {
      console.log(`   - ${s.subject_name}: ${s.status} (${s.students_graded}/${s.total_students})`);
    });
  } else {
    console.log('❌ Failed:', checklistRes.data.error?.message);
  }

  // 4. Get Student Rankings
  console.log('\n4. Get Student Rankings...');
  const rankingsRes = await makeRequest('GET', '/class-head/students/rankings?semester_id=1', null, classHeadToken);
  if (rankingsRes.data.success) {
    console.log(`✅ Class Average: ${rankingsRes.data.data.class_average}`);
    console.log('   Top 5 Students:');
    rankingsRes.data.data.items.slice(0, 5).forEach(s => {
      console.log(`   ${s.rank}. ${s.student_name} - Total: ${s.total}, Avg: ${s.average} (${s.remark})`);
    });
  } else {
    console.log('❌ Failed:', rankingsRes.data.error?.message);
  }

  // 5. Get Class Snapshot
  console.log('\n5. Get Class Snapshot...');
  const snapshotRes = await makeRequest('GET', '/class-head/reports/class-snapshot?semester_id=1', null, classHeadToken);
  if (snapshotRes.data.success) {
    console.log(`✅ Class: ${snapshotRes.data.data.class.name}`);
    console.log(`   Subjects: ${snapshotRes.data.data.subjects.join(', ')}`);
    console.log('   Top 3 Students:');
    snapshotRes.data.data.items.slice(0, 3).forEach(s => {
      console.log(`   ${s.rank}. ${s.student_name} - Total: ${s.total}, Avg: ${s.average}`);
    });
  } else {
    console.log('❌ Failed:', snapshotRes.data.error?.message);
  }

  // 6. Compile Grades
  console.log('\n6. Compile Grades...');
  const compileRes = await makeRequest('POST', '/class-head/compile-grades', {
    semester_id: 1,
    academic_year_id: 1
  }, classHeadToken);
  if (compileRes.data.success) {
    console.log(`✅ Compilation ${compileRes.data.data.compilation_status}`);
    console.log(`   Students compiled: ${compileRes.data.data.students_compiled}`);
    console.log(`   Class average: ${compileRes.data.data.class_average}`);
  } else {
    console.log('❌ Failed:', compileRes.data.error?.message);
  }

  // 7. Get Student Report
  console.log('\n7. Get Student Report (Student ID: 1)...');
  const reportRes = await makeRequest('GET', 
    '/class-head/reports/student/1?semester_id=1&academic_year_id=1&type=semester', 
    null, classHeadToken);
  if (reportRes.data.success) {
    console.log(`✅ Student: ${reportRes.data.data.student.name}`);
    console.log(`   Class: ${reportRes.data.data.student.class_name}`);
    console.log(`   Total: ${reportRes.data.data.summary.total}`);
    console.log(`   Average: ${reportRes.data.data.summary.average}`);
    console.log(`   Rank: ${reportRes.data.data.summary.rank_in_class || 'N/A'}`);
    console.log(`   Subjects: ${reportRes.data.data.subjects.length}`);
  } else {
    console.log('❌ Failed:', reportRes.data.error?.message);
  }

  // 8. Test Class Head can access Teacher endpoints
  console.log('\n8. Test Class Head accessing Teacher endpoints...');
  const teacherClassesRes = await makeRequest('GET', '/teacher/classes', null, classHeadToken);
  if (teacherClassesRes.data.success) {
    console.log('✅ Class Head can access Teacher endpoints');
    console.log(`   Assigned classes: ${teacherClassesRes.data.data.items.length}`);
  } else {
    console.log('❌ Failed:', teacherClassesRes.data.error?.message);
  }

  // 9. Test Role Protection
  console.log('\n9. Test Role Protection (login as teacher)...');
  const teacherLogin = await makeRequest('POST', '/auth/login', {
    email: 'tigist@aass.edu.et',
    password: 'password123'
  });
  
  if (teacherLogin.data.success) {
    const teacherToken = teacherLogin.data.data.access_token;
    const forbiddenRes = await makeRequest('GET', '/class-head/students', null, teacherToken);
    if (forbiddenRes.status === 403) {
      console.log('✅ Role protection working - Regular teacher cannot access class head routes');
    } else {
      console.log('❌ Role protection failed - Status:', forbiddenRes.status);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('CLASS HEAD API TESTS COMPLETE');
  console.log('='.repeat(50));
};

runTests().catch(err => {
  console.error('Test error:', err.message);
  console.log('\nMake sure the server is running: node server.js');
});



