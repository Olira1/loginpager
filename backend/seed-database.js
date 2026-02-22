// Seed MAMP Local Database with Test Data
// Run this with: node seed-database.js
// Run AFTER: node setup-database.js
// Includes data from seed.sql + seed_10A.sql (all demo accounts)

require('dotenv').config();
const mysql = require('mysql2/promise');

async function seedDatabase() {
  let connection;

  try {
    console.log('🌱 Seeding MAMP local database...\n');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || '2schoolportal'
    });

    console.log('✅ Connected to MySQL (MAMP)\n');

    // bcrypt hash for "password123" (10 rounds)
    const pw = '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK';

    // 1. Admin (id=1)
    console.log('👤 Creating admin...');
    await connection.query(`
      INSERT INTO users (name, email, password, phone, role, school_id) VALUES
      ('System Admin', 'admin@schoolportal.edu.et', '${pw}', '0911000000', 'admin', NULL)
    `);

    // 2. Schools
    console.log('🏫 Creating schools...');
    await connection.query(`
      INSERT INTO schools (name, address, phone, email) VALUES
      ('Addis Ababa Secondary School', 'Bole, Addis Ababa', '0111234567', 'info@aass.edu.et'),
      ('Bahir Dar Comprehensive School', 'Bahir Dar City', '0582201234', 'info@bdcs.edu.et')
    `);

    // 3. School Heads (id=2, id=3)
    console.log('👔 Creating school heads...');
    await connection.query(`
      INSERT INTO users (name, email, password, phone, role, school_id) VALUES
      ('Ato Kebede Alemu', 'kebede@aass.edu.et', '${pw}', '0912111111', 'school_head', 1),
      ('Ato Tadesse Bekele', 'tadesse@bdcs.edu.et', '${pw}', '0913222222', 'school_head', 2)
    `);
    await connection.query('UPDATE schools SET school_head_id = 2 WHERE id = 1');
    await connection.query('UPDATE schools SET school_head_id = 3 WHERE id = 2');

    // 4. Academic Years
    console.log('📅 Creating academic years...');
    await connection.query(`
      INSERT INTO academic_years (name, start_date, end_date, is_current) VALUES
      ('2015 E.C', '2022-09-01', '2023-06-30', FALSE),
      ('2016 E.C', '2023-09-01', '2024-06-30', FALSE),
      ('2017 E.C', '2024-09-01', '2025-06-30', TRUE)
    `);

    // 5. Semesters
    console.log('📆 Creating semesters...');
    await connection.query(`
      INSERT INTO semesters (academic_year_id, name, semester_number, start_date, end_date, is_current) VALUES
      (1, 'First Semester', 1, '2022-09-01', '2023-01-31', FALSE),
      (1, 'Second Semester', 2, '2023-02-01', '2023-06-30', FALSE),
      (2, 'First Semester', 1, '2023-09-01', '2024-01-31', FALSE),
      (2, 'Second Semester', 2, '2024-02-01', '2024-06-30', FALSE),
      (3, 'First Semester', 1, '2024-09-01', '2025-01-31', TRUE),
      (3, 'Second Semester', 2, '2025-02-01', '2025-06-30', FALSE)
    `);

    // 6. Grades
    console.log('📊 Creating grades...');
    await connection.query(`
      INSERT INTO grades (school_id, level, name) VALUES
      (1, 9, 'Grade 9'), (1, 10, 'Grade 10'), (1, 11, 'Grade 11'), (1, 12, 'Grade 12'),
      (2, 9, 'Grade 9'), (2, 10, 'Grade 10'), (2, 11, 'Grade 11'), (2, 12, 'Grade 12')
    `);

    // 7. Subjects
    console.log('📚 Creating subjects...');
    await connection.query(`
      INSERT INTO subjects (school_id, name) VALUES
      (1, 'Mathematics'), (1, 'Physics'), (1, 'Chemistry'), (1, 'Biology'),
      (1, 'English'), (1, 'Amharic'), (1, 'History'), (1, 'Geography'),
      (1, 'Civics'), (1, 'Information Technology'),
      (2, 'Mathematics'), (2, 'Physics'), (2, 'Chemistry'), (2, 'Biology'),
      (2, 'English'), (2, 'Amharic'), (2, 'History'), (2, 'Geography')
    `);

    // 8. Teachers School 1 (ids: 4-8) + Class Heads (ids: 9-10)
    console.log('👨‍🏫 Creating teachers & class heads (School 1)...');
    await connection.query(`
      INSERT INTO users (name, email, password, phone, role, school_id) VALUES
      ('W/ro Tigist Haile', 'tigist@aass.edu.et', '${pw}', '0914333333', 'teacher', 1),
      ('Ato Dawit Mengistu', 'dawit@aass.edu.et', '${pw}', '0915444444', 'teacher', 1),
      ('W/ro Sara Tesfaye', 'sara@aass.edu.et', '${pw}', '0916555555', 'teacher', 1),
      ('Ato Yohannes Girma', 'yohannes@aass.edu.et', '${pw}', '0917666666', 'teacher', 1),
      ('W/ro Meron Abebe', 'meron@aass.edu.et', '${pw}', '0918777777', 'teacher', 1),
      ('Ato Berhanu Tadesse', 'berhanu@aass.edu.et', '${pw}', '0919888888', 'class_head', 1),
      ('W/ro Hiwot Desta', 'hiwot@aass.edu.et', '${pw}', '0920999999', 'class_head', 1)
    `);

    // 9. Teachers School 2 (ids: 11-12)
    console.log('👨‍🏫 Creating teachers (School 2)...');
    await connection.query(`
      INSERT INTO users (name, email, password, phone, role, school_id) VALUES
      ('Ato Solomon Hailu', 'solomon@bdcs.edu.et', '${pw}', '0921111000', 'teacher', 2),
      ('W/ro Bethlehem Asefa', 'bethlehem@bdcs.edu.et', '${pw}', '0922222000', 'class_head', 2)
    `);

    // 10. Classes
    console.log('🎓 Creating classes...');
    await connection.query(`
      INSERT INTO classes (grade_id, name, class_head_id, academic_year_id) VALUES
      (1, '9A', 9, 3), (1, '9B', 10, 3),
      (2, '10A', 9, 3), (2, '10B', 10, 3),
      (3, '11A', 9, 3), (4, '12A', 10, 3),
      (5, '9A', 12, 3), (6, '10A', 12, 3)
    `);

    // 11. Students for Class 9A (user ids: 13-22, student ids: 1-10)
    console.log('👨‍🎓 Creating students (Class 9A)...');
    await connection.query(`
      INSERT INTO users (name, email, password, phone, role, school_id) VALUES
      ('Abebe Kebede', 'abebe.k@student.aass.edu.et', '${pw}', '0930111111', 'student', 1),
      ('Birtukan Tadesse', 'birtukan.t@student.aass.edu.et', '${pw}', '0930222222', 'student', 1),
      ('Chala Girma', 'chala.g@student.aass.edu.et', '${pw}', '0930333333', 'student', 1),
      ('Dagmawit Haile', 'dagmawit.h@student.aass.edu.et', '${pw}', '0930444444', 'student', 1),
      ('Eyob Mengistu', 'eyob.m@student.aass.edu.et', '${pw}', '0930555555', 'student', 1),
      ('Frehiwot Bekele', 'frehiwot.b@student.aass.edu.et', '${pw}', '0930666666', 'student', 1),
      ('Getachew Alemu', 'getachew.a@student.aass.edu.et', '${pw}', '0930777777', 'student', 1),
      ('Hanna Tesfaye', 'hanna.t@student.aass.edu.et', '${pw}', '0930888888', 'student', 1),
      ('Ibrahim Mohammed', 'ibrahim.m@student.aass.edu.et', '${pw}', '0930999999', 'student', 1),
      ('Jerusalem Desta', 'jerusalem.d@student.aass.edu.et', '${pw}', '0931000000', 'student', 1)
    `);
    await connection.query(`
      INSERT INTO students (user_id, class_id, student_id_number, date_of_birth, sex, date_of_admission) VALUES
      (13, 1, 'AASS-2017-001', '2009-03-15', 'Male', '2024-09-01'),
      (14, 1, 'AASS-2017-002', '2009-07-22', 'Female', '2024-09-01'),
      (15, 1, 'AASS-2017-003', '2009-01-10', 'Male', '2024-09-01'),
      (16, 1, 'AASS-2017-004', '2009-11-05', 'Female', '2024-09-01'),
      (17, 1, 'AASS-2017-005', '2009-05-30', 'Male', '2024-09-01'),
      (18, 1, 'AASS-2017-006', '2009-09-18', 'Female', '2024-09-01'),
      (19, 1, 'AASS-2017-007', '2009-02-25', 'Male', '2024-09-01'),
      (20, 1, 'AASS-2017-008', '2009-08-12', 'Female', '2024-09-01'),
      (21, 1, 'AASS-2017-009', '2009-04-08', 'Male', '2024-09-01'),
      (22, 1, 'AASS-2017-010', '2009-12-20', 'Female', '2024-09-01')
    `);

    // 12. Parents for 9A (user ids: 23-27)
    console.log('👨‍👩‍👧 Creating parents (9A)...');
    await connection.query(`
      INSERT INTO users (name, email, password, phone, role, school_id) VALUES
      ('Ato Kebede Desta', 'kebede.d@parent.aass.edu.et', '${pw}', '0941111111', 'parent', 1),
      ('W/ro Almaz Haile', 'almaz.h@parent.aass.edu.et', '${pw}', '0942222222', 'parent', 1),
      ('Ato Tadesse Girma', 'tadesse.g@parent.aass.edu.et', '${pw}', '0943333333', 'parent', 1),
      ('W/ro Tigist Mengistu', 'tigist.m@parent.aass.edu.et', '${pw}', '0944444444', 'parent', 1),
      ('Ato Mohammed Ali', 'mohammed.a@parent.aass.edu.et', '${pw}', '0945555555', 'parent', 1)
    `);
    await connection.query(`
      INSERT INTO student_parents (student_id, parent_id, relationship) VALUES
      (1, 23, 'Father'), (2, 24, 'Mother'), (3, 25, 'Father'), (4, 26, 'Mother'),
      (5, 23, 'Father'), (6, 24, 'Mother'), (7, 25, 'Father'), (8, 26, 'Mother'),
      (9, 27, 'Father'), (10, 27, 'Father')
    `);

    // 13. Store House (user id: 28)
    console.log('🏪 Creating store house user...');
    await connection.query(`
      INSERT INTO users (name, email, password, phone, role, school_id) VALUES
      ('Ato Mulugeta Assefa', 'mulugeta@aass.edu.et', '${pw}', '0950111111', 'store_house', 1)
    `);

    // 14. Assessment Types
    console.log('📝 Creating assessment types...');
    await connection.query(`
      INSERT INTO assessment_types (school_id, name, default_weight_percent) VALUES
      (1, 'Class Test', 10.00), (1, 'Quiz', 10.00), (1, 'Assignment', 10.00),
      (1, 'Project', 10.00), (1, 'Mid-Exam', 20.00), (1, 'Final Exam', 40.00),
      (2, 'Class Test', 15.00), (2, 'Quiz', 10.00), (2, 'Assignment', 5.00),
      (2, 'Mid-Exam', 20.00), (2, 'Final Exam', 50.00)
    `);

    // 15. Teaching Assignments for 9A
    console.log('📖 Creating teaching assignments (9A)...');
    await connection.query(`
      INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, academic_year_id) VALUES
      (4, 1, 1, 3), (5, 1, 2, 3), (6, 1, 3, 3), (7, 1, 4, 3),
      (8, 1, 5, 3), (9, 1, 6, 3), (4, 1, 7, 3), (5, 1, 8, 3)
    `);

    // 16. Assessment Weights for 9A
    console.log('⚖️  Creating assessment weights (9A)...');
    await connection.query(`
      INSERT INTO assessment_weights (teaching_assignment_id, assessment_type_id, semester_id, weight_percent) VALUES
      (1,1,5,10), (1,2,5,10), (1,3,5,10), (1,4,5,10), (1,5,5,20), (1,6,5,40),
      (2,1,5,15), (2,2,5,5), (2,3,5,10), (2,4,5,10), (2,5,5,20), (2,6,5,40)
    `);

    // 17. Sample Marks
    console.log('📊 Creating sample marks...');
    await connection.query(`
      INSERT INTO marks (student_id, teaching_assignment_id, assessment_type_id, semester_id, score, max_score) VALUES
      (1,1,1,5,8.5,10), (1,1,2,5,9.0,10), (1,1,3,5,8.0,10), (1,1,4,5,8.5,10), (1,1,5,5,17.0,20), (1,1,6,5,35.0,40),
      (2,1,1,5,9.0,10), (2,1,2,5,8.5,10), (2,1,3,5,9.0,10), (2,1,4,5,9.5,10), (2,1,5,5,18.0,20), (2,1,6,5,38.0,40),
      (3,1,1,5,7.0,10), (3,1,2,5,6.5,10), (3,1,3,5,7.5,10), (3,1,4,5,7.0,10), (3,1,5,5,14.0,20), (3,1,6,5,28.0,40),
      (4,1,1,5,9.5,10), (4,1,2,5,9.0,10), (4,1,3,5,9.5,10), (4,1,4,5,10.0,10), (4,1,5,5,19.0,20), (4,1,6,5,39.0,40),
      (5,1,1,5,6.0,10), (5,1,2,5,5.5,10), (5,1,3,5,6.0,10), (5,1,4,5,5.0,10), (5,1,5,5,12.0,20), (5,1,6,5,24.0,40)
    `);

    // 18. Promotion Criteria
    console.log('📋 Creating promotion criteria...');
    await connection.query(`
      INSERT INTO promotion_criteria (name, passing_average, passing_per_subject, max_failing_subjects, is_active) VALUES
      ('Ethiopian Secondary Standard', 50.00, 40.00, 2, TRUE)
    `);

    // ====== SEED_10A DATA ======

    // 19. Henok - Class Head for 10A (user id: 29)
    console.log('\n📖 Adding Class 10A data...');
    console.log('👨‍🎓 Creating class head Henok...');
    await connection.query(`
      INSERT INTO users (name, email, password, phone, role, school_id) VALUES
      ('Ato Henok Gebremedhin', 'henok@aass.edu.et', '${pw}', '0960111111', 'class_head', 1)
    `);

    // 20. New teachers for 10A (ids: 30, 31)
    console.log('👨‍🏫 Creating teachers Rahel & Fikadu...');
    await connection.query(`
      INSERT INTO users (name, email, password, phone, role, school_id) VALUES
      ('W/ro Rahel Wondwossen', 'rahel@aass.edu.et', '${pw}', '0960222222', 'teacher', 1),
      ('Ato Fikadu Lemma', 'fikadu@aass.edu.et', '${pw}', '0960333333', 'teacher', 1)
    `);

    // Update Class 10A (class_id=3) with Henok as class head
    await connection.query('UPDATE classes SET class_head_id = 29 WHERE id = 3');

    // 21. Students for 10A (user ids: 32-41, student ids: 11-20)
    console.log('👨‍🎓 Creating students (Class 10A)...');
    await connection.query(`
      INSERT INTO users (name, email, password, phone, role, school_id) VALUES
      ('Kidist Alemayehu', 'kidist.a@student.aass.edu.et', '${pw}', '0970111111', 'student', 1),
      ('Leul Bekele', 'leul.b@student.aass.edu.et', '${pw}', '0970222222', 'student', 1),
      ('Mahlet Desta', 'mahlet.d@student.aass.edu.et', '${pw}', '0970333333', 'student', 1),
      ('Natnael Eshetu', 'natnael.e@student.aass.edu.et', '${pw}', '0970444444', 'student', 1),
      ('Olana Teferi', 'olana.t@student.aass.edu.et', '${pw}', '0970555555', 'student', 1),
      ('Petros Girma', 'petros.g@student.aass.edu.et', '${pw}', '0970666666', 'student', 1),
      ('Ruth Hailu', 'ruth.h@student.aass.edu.et', '${pw}', '0970777777', 'student', 1),
      ('Samuel Tekle', 'samuel.t@student.aass.edu.et', '${pw}', '0970888888', 'student', 1),
      ('Tsion Abate', 'tsion.a@student.aass.edu.et', '${pw}', '0970999999', 'student', 1),
      ('Yared Worku', 'yared.w@student.aass.edu.et', '${pw}', '0971000000', 'student', 1)
    `);
    await connection.query(`
      INSERT INTO students (user_id, class_id, student_id_number, date_of_birth, sex, date_of_admission) VALUES
      (32, 3, 'AASS-2017-011', '2008-01-20', 'Female', '2024-09-01'),
      (33, 3, 'AASS-2017-012', '2008-05-14', 'Male', '2024-09-01'),
      (34, 3, 'AASS-2017-013', '2008-09-03', 'Female', '2024-09-01'),
      (35, 3, 'AASS-2017-014', '2008-02-28', 'Male', '2024-09-01'),
      (36, 3, 'AASS-2017-015', '2008-07-11', 'Male', '2024-09-01'),
      (37, 3, 'AASS-2017-016', '2008-11-19', 'Male', '2024-09-01'),
      (38, 3, 'AASS-2017-017', '2008-04-07', 'Female', '2024-09-01'),
      (39, 3, 'AASS-2017-018', '2008-08-25', 'Male', '2024-09-01'),
      (40, 3, 'AASS-2017-019', '2008-06-13', 'Female', '2024-09-01'),
      (41, 3, 'AASS-2017-020', '2008-10-30', 'Male', '2024-09-01')
    `);

    // 22. Parents for 10A (user ids: 42-46)
    console.log('👨‍👩‍👧 Creating parents (10A)...');
    await connection.query(`
      INSERT INTO users (name, email, password, phone, role, school_id) VALUES
      ('Ato Alemayehu Tadesse', 'alemayehu.t@parent.aass.edu.et', '${pw}', '0980111111', 'parent', 1),
      ('W/ro Selamawit Bekele', 'selamawit.b@parent.aass.edu.et', '${pw}', '0980222222', 'parent', 1),
      ('Ato Eshetu Worku', 'eshetu.w@parent.aass.edu.et', '${pw}', '0980333333', 'parent', 1),
      ('W/ro Abebech Girma', 'abebech.g@parent.aass.edu.et', '${pw}', '0980444444', 'parent', 1),
      ('Ato Hailu Teferi', 'hailu.t@parent.aass.edu.et', '${pw}', '0980555555', 'parent', 1)
    `);
    await connection.query(`
      INSERT INTO student_parents (student_id, parent_id, relationship) VALUES
      (11, 42, 'Father'), (12, 43, 'Mother'), (13, 44, 'Father'), (14, 45, 'Mother'),
      (15, 42, 'Father'), (16, 43, 'Mother'), (17, 44, 'Father'), (18, 45, 'Mother'),
      (19, 46, 'Father'), (20, 46, 'Father')
    `);

    // 23. Teaching Assignments for 10A (assignment ids: 9-16)
    console.log('📖 Creating teaching assignments (10A)...');
    await connection.query(`
      INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, academic_year_id) VALUES
      (30, 3, 1, 3), (31, 3, 2, 3), (6, 3, 3, 3), (7, 3, 4, 3),
      (8, 3, 5, 3), (29, 3, 6, 3), (30, 3, 7, 3), (31, 3, 8, 3)
    `);

    // 24. Assessment Weights for 10A
    console.log('⚖️  Creating assessment weights (10A)...');
    await connection.query(`
      INSERT INTO assessment_weights (teaching_assignment_id, assessment_type_id, semester_id, weight_percent) VALUES
      (9,1,5,10), (9,2,5,10), (9,3,5,10), (9,4,5,10), (9,5,5,20), (9,6,5,40),
      (10,1,5,15), (10,2,5,5), (10,3,5,10), (10,4,5,10), (10,5,5,20), (10,6,5,40),
      (11,1,5,10), (11,2,5,10), (11,3,5,10), (11,4,5,10), (11,5,5,20), (11,6,5,40),
      (12,1,5,10), (12,2,5,10), (12,3,5,10), (12,4,5,10), (12,5,5,20), (12,6,5,40),
      (13,1,5,10), (13,2,5,10), (13,3,5,10), (13,4,5,10), (13,5,5,20), (13,6,5,40),
      (14,1,5,10), (14,2,5,10), (14,3,5,10), (14,4,5,10), (14,5,5,20), (14,6,5,40),
      (15,1,5,10), (15,2,5,10), (15,3,5,10), (15,4,5,10), (15,5,5,20), (15,6,5,40),
      (16,1,5,15), (16,2,5,5), (16,3,5,10), (16,4,5,10), (16,5,5,20), (16,6,5,40)
    `);

    // Summary
    console.log('\n✅ Database seeded successfully!\n');
    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [studentCount] = await connection.query('SELECT COUNT(*) as count FROM students');
    const [schoolCount] = await connection.query('SELECT COUNT(*) as count FROM schools');
    console.log(`📊 Summary: ${userCount[0].count} users, ${studentCount[0].count} students, ${schoolCount[0].count} schools`);

    console.log('\n🔑 Demo Credentials (password: password123):');
    console.log('  Admin:       admin@schoolportal.edu.et');
    console.log('  School Head: kebede@aass.edu.et');
    console.log('  Class Head:  henok@aass.edu.et (10A), berhanu@aass.edu.et (9A)');
    console.log('  Teacher:     yohannes@aass.edu.et, sara@aass.edu.et');
    console.log('  Student:     kidist.a@student.aass.edu.et');
    console.log('  Parent:      alemayehu.t@parent.aass.edu.et');
    console.log('  Store House: mulugeta@aass.edu.et');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error('\nMake sure you ran "node setup-database.js" first');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit(0);
  }
}

seedDatabase();
