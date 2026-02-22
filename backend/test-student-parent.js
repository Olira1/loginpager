// Test script for Student and Parent API endpoints
const http = require('http');

let studentToken = null;
let parentToken = null;

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
  console.log('STUDENT & PARENT API TEST');
  console.log('='.repeat(50));

  // ==========================================
  // STUDENT TESTS
  // ==========================================
  console.log('\n--- STUDENT API ---\n');

  // 1. Login as Student
  console.log('1. Login as Student...');
  const studentLogin = await makeRequest('POST', '/auth/login', {
    email: 'abebe.k@student.aass.edu.et',
    password: 'password123'
  });
  
  if (studentLogin.data.success) {
    studentToken = studentLogin.data.data.access_token;
    console.log('✅ Logged in as:', studentLogin.data.data.user.name);
    console.log('   Role:', studentLogin.data.data.user.role);
  } else {
    console.log('❌ Login failed:', studentLogin.data.error?.message);
    return;
  }

  // 2. Get Student Profile
  console.log('\n2. Get Student Profile...');
  const profileRes = await makeRequest('GET', '/student/profile', null, studentToken);
  if (profileRes.data.success) {
    console.log('✅ Profile:');
    console.log(`   Name: ${profileRes.data.data.name}`);
    console.log(`   Class: ${profileRes.data.data.class_name}`);
    console.log(`   Grade: ${profileRes.data.data.grade_name}`);
  } else {
    console.log('❌ Failed:', profileRes.data.error?.message);
  }

  // 3. Get Semester Report
  console.log('\n3. Get Semester Report...');
  const semesterRes = await makeRequest('GET', '/student/reports/semester?semester_id=1&academic_year_id=1', null, studentToken);
  if (semesterRes.data.success) {
    console.log('✅ Semester Report:');
    console.log(`   Semester: ${semesterRes.data.data.semester}`);
    console.log(`   Total: ${semesterRes.data.data.summary.total}`);
    console.log(`   Average: ${semesterRes.data.data.summary.average}`);
    console.log(`   Rank: ${semesterRes.data.data.summary.rank_in_class}/${semesterRes.data.data.summary.total_students}`);
    console.log(`   Remark: ${semesterRes.data.data.summary.remark}`);
  } else {
    console.log('❌ Failed:', semesterRes.data.error?.message);
  }

  // 4. Get Rank
  console.log('\n4. Get Rank...');
  const rankRes = await makeRequest('GET', '/student/rank?semester_id=1&academic_year_id=1&type=semester', null, studentToken);
  if (rankRes.data.success) {
    console.log('✅ Rank Info:');
    console.log(`   Position: ${rankRes.data.data.rank.position}/${rankRes.data.data.rank.total_students}`);
    console.log(`   Total: ${rankRes.data.data.scores.total}`);
    console.log(`   Average: ${rankRes.data.data.scores.average}`);
    console.log(`   Class Average: ${rankRes.data.data.comparison.class_average}`);
    console.log(`   Above Average: ${rankRes.data.data.comparison.above_average}`);
  } else {
    console.log('❌ Failed:', rankRes.data.error?.message);
  }

  // 5. Test Role Protection
  console.log('\n5. Test Role Protection (student accessing parent route)...');
  const forbiddenRes = await makeRequest('GET', '/parent/children', null, studentToken);
  if (forbiddenRes.status === 403) {
    console.log('✅ Role protection working - Student cannot access parent routes');
  } else {
    console.log('❌ Role protection failed - Status:', forbiddenRes.status);
  }

  // ==========================================
  // PARENT TESTS
  // ==========================================
  console.log('\n--- PARENT API ---\n');

  // 6. Login as Parent
  console.log('6. Login as Parent...');
  const parentLogin = await makeRequest('POST', '/auth/login', {
    email: 'kebede.d@parent.aass.edu.et',
    password: 'password123'
  });
  
  if (parentLogin.data.success) {
    parentToken = parentLogin.data.data.access_token;
    console.log('✅ Logged in as:', parentLogin.data.data.user.name);
    console.log('   Role:', parentLogin.data.data.user.role);
  } else {
    console.log('❌ Login failed:', parentLogin.data.error?.message);
    return;
  }

  // 7. List Children
  console.log('\n7. List Children...');
  const childrenRes = await makeRequest('GET', '/parent/children', null, parentToken);
  if (childrenRes.data.success) {
    console.log('✅ Children:');
    childrenRes.data.data.items.forEach(c => {
      console.log(`   - ${c.name} (${c.class_name}, ${c.grade_name})`);
    });
  } else {
    console.log('❌ Failed:', childrenRes.data.error?.message);
  }

  // 8. Get Child's Semester Report (if there are children)
  if (childrenRes.data.success && childrenRes.data.data.items.length > 0) {
    const childId = childrenRes.data.data.items[0].student_id;
    
    console.log(`\n8. Get Child's Semester Report (ID: ${childId})...`);
    const childReportRes = await makeRequest('GET', 
      `/parent/children/${childId}/reports/semester?semester_id=1&academic_year_id=1`, 
      null, parentToken);
    if (childReportRes.data.success) {
      console.log('✅ Child Report:');
      console.log(`   Student: ${childReportRes.data.data.student.name}`);
      console.log(`   Total: ${childReportRes.data.data.summary.total}`);
      console.log(`   Average: ${childReportRes.data.data.summary.average}`);
      console.log(`   Rank: ${childReportRes.data.data.summary.rank_in_class}`);
    } else {
      console.log('❌ Failed:', childReportRes.data.error?.message);
    }

    // 9. Get Child's Rank
    console.log(`\n9. Get Child's Rank (ID: ${childId})...`);
    const childRankRes = await makeRequest('GET', 
      `/parent/children/${childId}/rank?semester_id=1&academic_year_id=1&type=semester`, 
      null, parentToken);
    if (childRankRes.data.success) {
      console.log('✅ Child Rank:');
      console.log(`   Position: ${childRankRes.data.data.rank.position}/${childRankRes.data.data.rank.total_students}`);
      console.log(`   Remark: ${childRankRes.data.data.remark}`);
    } else {
      console.log('❌ Failed:', childRankRes.data.error?.message);
    }
  }

  // 10. Test Parent-Child Protection
  console.log('\n10. Test Parent-Child Protection (accessing unlinked child)...');
  const unlinkedRes = await makeRequest('GET', 
    '/parent/children/9999/reports/semester?semester_id=1&academic_year_id=1', 
    null, parentToken);
  if (unlinkedRes.status === 403) {
    console.log('✅ Parent-child protection working - Cannot access unlinked children');
  } else {
    console.log('❌ Protection failed - Status:', unlinkedRes.status);
  }

  console.log('\n' + '='.repeat(50));
  console.log('STUDENT & PARENT API TESTS COMPLETE');
  console.log('='.repeat(50));
};

runTests().catch(err => {
  console.error('Test error:', err.message);
  console.log('\nMake sure the server is running: node server.js');
});

