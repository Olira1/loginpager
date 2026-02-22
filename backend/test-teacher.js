// Test script for Teacher API endpoints
const http = require('http');

let teacherToken = null;

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
  console.log('TEACHER API TEST');
  console.log('='.repeat(50));

  // 1. Login as Teacher
  console.log('\n1. Login as Teacher...');
  const loginRes = await makeRequest('POST', '/auth/login', {
    email: 'tigist@aass.edu.et',
    password: 'password123'
  });
  
  if (loginRes.data.success) {
    teacherToken = loginRes.data.data.access_token;
    console.log('✅ Logged in as:', loginRes.data.data.user.name);
    console.log('   Role:', loginRes.data.data.user.role);
    console.log('   School:', loginRes.data.data.user.school_name);
  } else {
    console.log('❌ Login failed:', loginRes.data.error?.message);
    return;
  }

  // 2. List Assigned Classes
  console.log('\n2. List Assigned Classes...');
  const classesRes = await makeRequest('GET', '/teacher/classes', null, teacherToken);
  if (classesRes.data.success) {
    console.log('✅ Found', classesRes.data.data.items.length, 'assigned classes:');
    classesRes.data.data.items.forEach(c => {
      console.log(`   - ${c.grade.name} ${c.class_name} - ${c.student_count} students`);
      console.log(`     Subjects: ${c.subjects.map(s => s.name).join(', ')}`);
    });
  } else {
    console.log('❌ Failed:', classesRes.data.error?.message);
  }

  // 3. List Assigned Subjects
  console.log('\n3. List Assigned Subjects...');
  const subjectsRes = await makeRequest('GET', '/teacher/subjects', null, teacherToken);
  if (subjectsRes.data.success) {
    console.log('✅ Found', subjectsRes.data.data.items.length, 'assigned subjects:');
    subjectsRes.data.data.items.forEach(s => {
      console.log(`   - ${s.subject_name} (${s.total_students} total students)`);
      s.assigned_classes.forEach(c => {
        console.log(`     • ${c.grade_name} ${c.class_name}`);
      });
    });
  } else {
    console.log('❌ Failed:', subjectsRes.data.error?.message);
  }

  // 4. Get Weight Suggestions
  console.log('\n4. Get Assessment Weight Suggestions...');
  let classId, subjectId;
  if (classesRes.data.success && classesRes.data.data.items.length > 0) {
    classId = classesRes.data.data.items[0].class_id;
    subjectId = classesRes.data.data.items[0].subjects[0]?.id;
    
    if (classId && subjectId) {
      const suggestionsRes = await makeRequest('GET', 
        `/teacher/assessment-weights/suggestions?class_id=${classId}&subject_id=${subjectId}`, 
        null, teacherToken);
      if (suggestionsRes.data.success) {
        console.log('✅ Weight suggestions:');
        suggestionsRes.data.data.suggested_weights.forEach(w => {
          console.log(`   - ${w.assessment_type_name}: ${w.weight_percent}%`);
        });
      } else {
        console.log('❌ Failed:', suggestionsRes.data.error?.message);
      }
    }
  }

  // 5. Get Student List
  console.log('\n5. Get Student List...');
  if (classId && subjectId) {
    const studentsRes = await makeRequest('GET', 
      `/teacher/classes/${classId}/students?subject_id=${subjectId}`, 
      null, teacherToken);
    if (studentsRes.data.success) {
      console.log(`✅ ${studentsRes.data.data.class.name} - ${studentsRes.data.data.subject.name}:`);
      console.log(`   Found ${studentsRes.data.data.items.length} students:`);
      studentsRes.data.data.items.slice(0, 5).forEach(s => {
        console.log(`   - ${s.full_name} (${s.gender}) - Has grades: ${s.has_grades}`);
      });
    } else {
      console.log('❌ Failed:', studentsRes.data.error?.message);
    }
  }

  // 6. Get Student Grades (need semester_id)
  console.log('\n6. Get Student Grades...');
  if (classId && subjectId) {
    const gradesRes = await makeRequest('GET', 
      `/teacher/classes/${classId}/subjects/${subjectId}/grades?semester_id=1`, 
      null, teacherToken);
    if (gradesRes.data.success) {
      console.log(`✅ Grades for ${gradesRes.data.data.class.name} - ${gradesRes.data.data.subject.name}:`);
      console.log(`   Students with grades: ${gradesRes.data.data.items.filter(i => i.grades.length > 0).length}`);
      gradesRes.data.data.items.slice(0, 3).forEach(s => {
        console.log(`   - ${s.student_name}: ${s.total_weighted_score.toFixed(2)} (${s.submission_status})`);
        if (s.grades.length > 0) {
          s.grades.forEach(g => {
            console.log(`     • ${g.assessment_type_name}: ${g.score}/${g.max_score}`);
          });
        }
      });
    } else {
      console.log('❌ Failed:', gradesRes.data.error?.message);
    }
  }

  // 7. Get Submission Status
  console.log('\n7. Get Submission Status...');
  const statusRes = await makeRequest('GET', '/teacher/submissions?semester_id=1', null, teacherToken);
  if (statusRes.data.success) {
    console.log('✅ Submission status:');
    statusRes.data.data.items.forEach(s => {
      console.log(`   - ${s.class.name} / ${s.subject.name}: ${s.status}`);
      if (s.status === 'draft') {
        console.log(`     Graded: ${s.students_graded}/${s.total_students}`);
      }
    });
  } else {
    console.log('❌ Failed:', statusRes.data.error?.message);
  }

  // 8. Test Role Protection (login as student and try to access teacher route)
  console.log('\n8. Test Role Protection (login as parent)...');
  const parentLogin = await makeRequest('POST', '/auth/login', {
    email: 'abebe.parent@example.com',
    password: 'password123'
  });
  
  if (parentLogin.data.success) {
    const parentToken = parentLogin.data.data.access_token;
    const forbiddenRes = await makeRequest('GET', '/teacher/classes', null, parentToken);
    if (forbiddenRes.status === 403) {
      console.log('✅ Role protection working - Parent cannot access teacher routes');
    } else {
      console.log('❌ Role protection failed - Status:', forbiddenRes.status);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('TEACHER API TESTS COMPLETE');
  console.log('='.repeat(50));
};

runTests().catch(err => {
  console.error('Test error:', err.message);
  console.log('\nMake sure the server is running: node server.js');
});




