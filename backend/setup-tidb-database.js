// Setup TiDB Database Tables
// Run this with: node setup-tidb-database.js

require('dotenv').config({ path: '.env.production' });
const mysql = require('mysql2/promise');

async function setupDatabase() {
  console.log('🔧 Setting up TiDB Cloud Database...\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
      },
      multipleStatements: true
    });

    console.log('✅ Connected to TiDB Cloud\n');

    // Drop existing tables (including old loginpage tables that may exist)
    console.log('🗑️  Dropping existing tables...');
    await connection.query('DROP TABLE IF EXISTS conversion_history');
    await connection.query('DROP TABLE IF EXISTS fortune_history');
    await connection.query('DROP TABLE IF EXISTS transcripts');
    await connection.query('DROP TABLE IF EXISTS rosters');
    await connection.query('DROP TABLE IF EXISTS student_semester_results');
    await connection.query('DROP TABLE IF EXISTS grade_submissions');
    await connection.query('DROP TABLE IF EXISTS marks');
    await connection.query('DROP TABLE IF EXISTS assessment_weights');
    await connection.query('DROP TABLE IF EXISTS weight_templates');
    await connection.query('DROP TABLE IF EXISTS assessment_types');
    await connection.query('DROP TABLE IF EXISTS teaching_assignments');
    await connection.query('DROP TABLE IF EXISTS student_parents');
    await connection.query('DROP TABLE IF EXISTS students');
    await connection.query('DROP TABLE IF EXISTS subjects');
    await connection.query('DROP TABLE IF EXISTS classes');
    await connection.query('DROP TABLE IF EXISTS grades');
    await connection.query('DROP TABLE IF EXISTS semesters');
    await connection.query('DROP TABLE IF EXISTS academic_years');
    await connection.query('DROP TABLE IF EXISTS users');
    await connection.query('DROP TABLE IF EXISTS schools');
    await connection.query('DROP TABLE IF EXISTS promotion_criteria');
    console.log('✅ Dropped existing tables\n');

    // Create tables
    console.log('📊 Creating tables...\n');

    console.log('  Creating schools...');
    await connection.query(`
      CREATE TABLE schools (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(500),
        phone VARCHAR(20),
        email VARCHAR(255),
        status ENUM('active', 'inactive') DEFAULT 'active',
        school_head_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('  Creating users...');
    await connection.query(`
      CREATE TABLE users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role ENUM('admin', 'school_head', 'teacher', 'class_head', 'student', 'parent', 'store_house') NOT NULL,
        school_id INT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
      )
    `);

    console.log('  Adding school_head foreign key...');
    await connection.query(`
      ALTER TABLE schools 
      ADD CONSTRAINT fk_school_head 
      FOREIGN KEY (school_head_id) REFERENCES users(id) ON DELETE SET NULL
    `);

    console.log('  Creating academic_years...');
    await connection.query(`
      CREATE TABLE academic_years (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_current BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('  Creating semesters...');
    await connection.query(`
      CREATE TABLE semesters (
        id INT PRIMARY KEY AUTO_INCREMENT,
        academic_year_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        semester_number TINYINT NOT NULL,
        start_date DATE,
        end_date DATE,
        is_current BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
      )
    `);

    console.log('  Creating grades...');
    await connection.query(`
      CREATE TABLE grades (
        id INT PRIMARY KEY AUTO_INCREMENT,
        school_id INT NOT NULL,
        level INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        UNIQUE KEY unique_grade_per_school (school_id, level)
      )
    `);

    console.log('  Creating classes...');
    await connection.query(`
      CREATE TABLE classes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        grade_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        class_head_id INT NULL,
        academic_year_id INT NOT NULL,
        FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
        FOREIGN KEY (class_head_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
      )
    `);

    console.log('  Creating subjects...');
    await connection.query(`
      CREATE TABLE subjects (
        id INT PRIMARY KEY AUTO_INCREMENT,
        school_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        UNIQUE KEY unique_subject_per_school (school_id, name)
      )
    `);

    console.log('  Creating students...');
    await connection.query(`
      CREATE TABLE students (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL UNIQUE,
        class_id INT NOT NULL,
        student_id_number VARCHAR(50),
        date_of_birth DATE,
        sex ENUM('Male', 'Female') NOT NULL,
        date_of_admission DATE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
      )
    `);

    console.log('  Creating student_parents...');
    await connection.query(`
      CREATE TABLE student_parents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        parent_id INT NOT NULL,
        relationship VARCHAR(50),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_student_parent (student_id, parent_id)
      )
    `);

    console.log('  Creating teaching_assignments...');
    await connection.query(`
      CREATE TABLE teaching_assignments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        teacher_id INT NOT NULL,
        class_id INT NOT NULL,
        subject_id INT NOT NULL,
        academic_year_id INT NOT NULL,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
        UNIQUE KEY unique_assignment (teacher_id, class_id, subject_id, academic_year_id)
      )
    `);

    console.log('  Creating assessment_types...');
    await connection.query(`
      CREATE TABLE assessment_types (
        id INT PRIMARY KEY AUTO_INCREMENT,
        school_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        default_weight_percent DECIMAL(5,2),
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        UNIQUE KEY unique_assessment_type (school_id, name)
      )
    `);

    console.log('  Creating weight_templates...');
    await connection.query(`
      CREATE TABLE weight_templates (
        id INT PRIMARY KEY AUTO_INCREMENT,
        school_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        weights JSON NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
      )
    `);

    console.log('  Creating assessment_weights...');
    await connection.query(`
      CREATE TABLE assessment_weights (
        id INT PRIMARY KEY AUTO_INCREMENT,
        teaching_assignment_id INT NOT NULL,
        assessment_type_id INT NOT NULL,
        semester_id INT NOT NULL,
        weight_percent DECIMAL(5,2) NOT NULL,
        FOREIGN KEY (teaching_assignment_id) REFERENCES teaching_assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id) ON DELETE CASCADE,
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
        UNIQUE KEY unique_weight (teaching_assignment_id, assessment_type_id, semester_id)
      )
    `);

    console.log('  Creating marks...');
    await connection.query(`
      CREATE TABLE marks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        teaching_assignment_id INT NOT NULL,
        assessment_type_id INT NOT NULL,
        semester_id INT NOT NULL,
        score DECIMAL(5,2) NOT NULL,
        max_score DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (teaching_assignment_id) REFERENCES teaching_assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id) ON DELETE CASCADE,
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
        UNIQUE KEY unique_mark (student_id, teaching_assignment_id, assessment_type_id, semester_id)
      )
    `);

    console.log('  Creating grade_submissions...');
    await connection.query(`
      CREATE TABLE grade_submissions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        teaching_assignment_id INT NOT NULL,
        semester_id INT NOT NULL,
        status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
        submitted_at TIMESTAMP NULL,
        reviewed_by INT NULL,
        reviewed_at TIMESTAMP NULL,
        comments TEXT,
        FOREIGN KEY (teaching_assignment_id) REFERENCES teaching_assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY unique_submission (teaching_assignment_id, semester_id)
      )
    `);

    console.log('  Creating student_semester_results...');
    await connection.query(`
      CREATE TABLE student_semester_results (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        semester_id INT NOT NULL,
        total_score DECIMAL(7,2),
        average_score DECIMAL(5,2),
        rank_in_class INT,
        absent_days INT DEFAULT 0,
        conduct VARCHAR(50),
        remark ENUM('Promoted', 'Not Promoted', 'Pending') DEFAULT 'Pending',
        is_published BOOLEAN DEFAULT FALSE,
        published_at TIMESTAMP NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
        UNIQUE KEY unique_result (student_id, semester_id)
      )
    `);

    console.log('  Creating rosters...');
    await connection.query(`
      CREATE TABLE rosters (
        id INT PRIMARY KEY AUTO_INCREMENT,
        class_id INT NOT NULL,
        semester_id INT NOT NULL,
        submitted_by INT NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        roster_data JSON,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
        FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_roster (class_id, semester_id)
      )
    `);

    console.log('  Creating transcripts...');
    await connection.query(`
      CREATE TABLE transcripts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        generated_by INT NOT NULL,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        transcript_data JSON,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('  Creating promotion_criteria...');
    await connection.query(`
      CREATE TABLE promotion_criteria (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        passing_average DECIMAL(5,2) NOT NULL,
        passing_per_subject DECIMAL(5,2) NOT NULL,
        max_failing_subjects INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('\n✅ All tables created successfully!\n');

    // Show tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📊 Tables in database:');
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${Object.values(table)[0]}`);
    });

    await connection.end();
    console.log('\n🎉 Database setup complete!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Setup failed!');
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

setupDatabase();
