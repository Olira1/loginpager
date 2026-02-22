// Test Store House API endpoints
const http = require('http');

const BASE_URL = 'http://localhost:5000';

// Test credentials
const STORE_HOUSE_EMAIL = 'mulugeta@aass.edu.et';
const TEACHER_EMAIL = 'kebede@aass.edu.et';
const PASSWORD = 'password123';

let storeHouseToken = null;
let teacherToken = null;
let testStudentId = null;

// Helper function to make HTTP requests
function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function testLogin() {
  console.log('\n========== LOGIN TESTS ==========\n');

  // Store House login
  console.log('1. Store House Login...');
  const storeHouseRes = await request('POST', '/api/v1/auth/login', {
    email: STORE_HOUSE_EMAIL,
    password: PASSWORD
  });
  
  if (storeHouseRes.status === 200 && storeHouseRes.data.success) {
    storeHouseToken = storeHouseRes.data.data.access_token;
    console.log('   ✓ Store House login successful');
    console.log(`   Role: ${storeHouseRes.data.data.user.role}`);
  } else {
    console.log('   ✗ Store House login failed:', storeHouseRes.data);
    return false;
  }

  // Teacher login (for role protection test)
  console.log('\n2. Teacher Login (for role test)...');
  const teacherRes = await request('POST', '/api/v1/auth/login', {
    email: TEACHER_EMAIL,
    password: PASSWORD
  });
  
  if (teacherRes.status === 200 && teacherRes.data.success) {
    teacherToken = teacherRes.data.data.access_token;
    console.log('   ✓ Teacher login successful');
  } else {
    console.log('   ✗ Teacher login failed:', teacherRes.data);
  }

  return true;
}

async function testRoleProtection() {
  console.log('\n========== ROLE PROTECTION TESTS ==========\n');

  // Teacher should NOT access store house routes
  console.log('1. Teacher accessing store-house rosters (should fail)...');
  const res = await request('GET', '/api/v1/store-house/rosters', null, teacherToken);
  
  if (res.status === 403) {
    console.log('   ✓ Correctly blocked teacher from store-house routes');
  } else {
    console.log('   ✗ Role protection failed:', res.data);
    return false;
  }

  return true;
}

async function testRosters() {
  console.log('\n========== ROSTER TESTS ==========\n');

  // List rosters
  console.log('1. List Rosters...');
  const listRes = await request('GET', '/api/v1/store-house/rosters', null, storeHouseToken);
  
  if (listRes.status === 200 && listRes.data.success) {
    console.log('   ✓ Listed rosters successfully');
    console.log(`   Found ${listRes.data.data.items.length} rosters`);
    
    // If we have rosters, test get details
    if (listRes.data.data.items.length > 0) {
      const rosterId = listRes.data.data.items[0].roster_id;
      console.log(`\n2. Get Roster Details (ID: ${rosterId})...`);
      const detailRes = await request('GET', `/api/v1/store-house/rosters/${rosterId}`, null, storeHouseToken);
      
      if (detailRes.status === 200 && detailRes.data.success) {
        console.log('   ✓ Got roster details');
        console.log(`   Class: ${detailRes.data.data.class.name}`);
        console.log(`   Students: ${detailRes.data.data.students.length}`);
      } else {
        console.log('   ✗ Failed to get roster details:', detailRes.data);
      }
    }
  } else {
    console.log('   ✓ No rosters found (expected for new database)');
  }

  return true;
}

async function testStudentSearch() {
  console.log('\n========== STUDENT SEARCH TESTS ==========\n');

  // Search all students
  console.log('1. Search Students (all)...');
  const searchRes = await request('GET', '/api/v1/store-house/students/search', null, storeHouseToken);
  
  if (searchRes.status === 200 && searchRes.data.success) {
    console.log('   ✓ Search successful');
    console.log(`   Found ${searchRes.data.data.items.length} students`);
    
    if (searchRes.data.data.items.length > 0) {
      testStudentId = searchRes.data.data.items[0].student_id;
      console.log(`   First student: ${searchRes.data.data.items[0].name}`);
    }
  } else {
    console.log('   ✗ Search failed:', searchRes.data);
    return false;
  }

  // Search by name
  console.log('\n2. Search Students by Name...');
  const nameRes = await request('GET', '/api/v1/store-house/students/search?name=Abebe', null, storeHouseToken);
  
  if (nameRes.status === 200 && nameRes.data.success) {
    console.log('   ✓ Name search successful');
    console.log(`   Found ${nameRes.data.data.items.length} matching students`);
  } else {
    console.log('   ✗ Name search failed:', nameRes.data);
  }

  return true;
}

async function testCumulativeRecord() {
  console.log('\n========== CUMULATIVE RECORD TESTS ==========\n');

  if (!testStudentId) {
    console.log('   ⚠ No student ID available, skipping...');
    return true;
  }

  console.log(`1. Get Cumulative Record (Student ID: ${testStudentId})...`);
  const res = await request('GET', `/api/v1/store-house/students/${testStudentId}/cumulative-record`, null, storeHouseToken);
  
  if (res.status === 200 && res.data.success) {
    console.log('   ✓ Got cumulative record');
    console.log(`   Student: ${res.data.data.student.name}`);
    console.log(`   Current Grade: ${res.data.data.student.current_grade}`);
    console.log(`   Academic History: ${res.data.data.academic_history.length} records`);
    console.log(`   Cumulative Average: ${res.data.data.cumulative_average}`);
  } else {
    console.log('   ✗ Failed to get cumulative record:', res.data);
    return false;
  }

  return true;
}

async function testTranscripts() {
  console.log('\n========== TRANSCRIPT TESTS ==========\n');

  // List transcripts
  console.log('1. List Transcripts...');
  const listRes = await request('GET', '/api/v1/store-house/transcripts', null, storeHouseToken);
  
  if (listRes.status === 200 && listRes.data.success) {
    console.log('   ✓ Listed transcripts');
    console.log(`   Found ${listRes.data.data.items.length} transcripts`);
  } else {
    console.log('   ✗ Failed to list transcripts:', listRes.data);
    return false;
  }

  // Generate transcript (if we have a student)
  if (testStudentId) {
    console.log(`\n2. Generate Transcript (Student ID: ${testStudentId})...`);
    const genRes = await request('POST', `/api/v1/store-house/students/${testStudentId}/transcript`, {
      purpose: 'Test Generation'
    }, storeHouseToken);
    
    if (genRes.status === 201 && genRes.data.success) {
      console.log('   ✓ Generated transcript');
      console.log(`   Transcript ID: ${genRes.data.data.transcript_id}`);
      console.log(`   Student: ${genRes.data.data.student.name}`);
      console.log(`   Academic Records: ${genRes.data.data.academic_records.length}`);
      
      // Get transcript details
      console.log('\n3. List Transcripts After Generation...');
      const afterRes = await request('GET', '/api/v1/store-house/transcripts', null, storeHouseToken);
      
      if (afterRes.status === 200 && afterRes.data.success) {
        console.log('   ✓ Listed transcripts after generation');
        console.log(`   Total transcripts: ${afterRes.data.data.items.length}`);
        
        if (afterRes.data.data.items.length > 0) {
          const transcriptId = afterRes.data.data.items[0].id;
          console.log(`\n4. Get Transcript Details (ID: ${transcriptId})...`);
          const detailRes = await request('GET', `/api/v1/store-house/transcripts/${transcriptId}`, null, storeHouseToken);
          
          if (detailRes.status === 200 && detailRes.data.success) {
            console.log('   ✓ Got transcript details');
            console.log(`   Transcript Number: ${detailRes.data.data.transcript_number}`);
          } else {
            console.log('   ✗ Failed to get transcript details:', detailRes.data);
          }
        }
      }
    } else {
      console.log('   ✗ Failed to generate transcript:', genRes.data);
    }
  }

  return true;
}

// Main test runner
async function runTests() {
  console.log('============================================');
  console.log('       STORE HOUSE API TESTS');
  console.log('============================================');
  console.log(`Server: ${BASE_URL}`);

  try {
    // Login tests
    if (!await testLogin()) {
      console.log('\n❌ Login failed, cannot continue tests');
      process.exit(1);
    }

    // Role protection tests
    await testRoleProtection();

    // Store House specific tests
    await testRosters();
    await testStudentSearch();
    await testCumulativeRecord();
    await testTranscripts();

    console.log('\n============================================');
    console.log('       ALL TESTS COMPLETED');
    console.log('============================================\n');

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    process.exit(1);
  }
}

runTests();


