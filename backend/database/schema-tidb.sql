-- =====================================================
-- SCHOOL PORTAL DATABASE SCHEMA FOR TIDB CLOUD
-- Run this in TiDB SQL Editor
-- =====================================================

-- Make sure you're using the test database
USE test;

-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS transcripts;
DROP TABLE IF EXISTS rosters;
DROP TABLE IF EXISTS student_semester_results;
DROP TABLE IF EXISTS grade_submissions;
DROP TABLE IF EXISTS marks;
DROP TABLE IF EXISTS assessment_weights;
DROP TABLE IF EXISTS weight_templates;
DROP TABLE IF EXISTS assessment_types;
DROP TABLE IF EXISTS teaching_assignments;
DROP TABLE IF EXISTS student_parents;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS semesters;
DROP TABLE IF EXISTS academic_years;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS schools;
DROP TABLE IF EXISTS promotion_criteria;

-- =====================================================
-- TABLE 1: schools
-- =====================================================
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
);

-- =====================================================
-- TABLE 2: users
-- =====================================================
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
);

-- Add foreign key for school_head after users table exists
ALTER TABLE schools 
ADD CONSTRAINT fk_school_head 
FOREIGN KEY (school_head_id) REFERENCES users(id) ON DELETE SET NULL;

-- =====================================================
-- TABLE 3: academic_years
-- =====================================================
CREATE TABLE academic_years (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE 4: semesters
-- =====================================================
CREATE TABLE semesters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academic_year_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    semester_number TINYINT NOT NULL,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLE 5: grades
-- =====================================================
CREATE TABLE grades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    level INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    UNIQUE KEY unique_grade_per_school (school_id, level)
);

-- =====================================================
-- TABLE 6: classes
-- =====================================================
CREATE TABLE classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    grade_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    class_head_id INT NULL,
    academic_year_id INT NOT NULL,
    
    FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
    FOREIGN KEY (class_head_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLE 7: subjects
-- =====================================================
CREATE TABLE subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    UNIQUE KEY unique_subject_per_school (school_id, name)
);

-- =====================================================
-- TABLE 8: students
-- =====================================================
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
);

-- =====================================================
-- TABLE 9: student_parents
-- =====================================================
CREATE TABLE student_parents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    parent_id INT NOT NULL,
    relationship VARCHAR(50),
    
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_parent (student_id, parent_id)
);

-- =====================================================
-- TABLE 10: teaching_assignments
-- =====================================================
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
);

-- =====================================================
-- TABLE 11: assessment_types
-- =====================================================
CREATE TABLE assessment_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    default_weight_percent DECIMAL(5,2),
    
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assessment_type (school_id, name)
);

-- =====================================================
-- TABLE 11b: weight_templates
-- =====================================================
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
);

-- =====================================================
-- TABLE 12: assessment_weights
-- =====================================================
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
);

-- =====================================================
-- TABLE 13: marks
-- =====================================================
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
);

-- =====================================================
-- TABLE 14: grade_submissions
-- =====================================================
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
);

-- =====================================================
-- TABLE 15: student_semester_results
-- =====================================================
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
);

-- =====================================================
-- TABLE 16: rosters
-- =====================================================
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
);

-- =====================================================
-- TABLE 17: transcripts
-- =====================================================
CREATE TABLE transcripts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    generated_by INT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transcript_data JSON,
    
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLE 18: promotion_criteria
-- =====================================================
CREATE TABLE promotion_criteria (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    passing_average DECIMAL(5,2) NOT NULL,
    passing_per_subject DECIMAL(5,2) NOT NULL,
    max_failing_subjects INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_marks_student ON marks(student_id);
CREATE INDEX idx_marks_semester ON marks(semester_id);
CREATE INDEX idx_teaching_assignments_teacher ON teaching_assignments(teacher_id);
CREATE INDEX idx_teaching_assignments_class ON teaching_assignments(class_id);

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================
