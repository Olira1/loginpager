-- STEP 1: Create core tables (no foreign keys yet)
-- Copy and run this first

USE test;

-- Drop existing tables
DROP TABLE IF EXISTS promotion_criteria;

-- Create schools table (no foreign keys yet)
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

-- Create users table
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create academic_years table
CREATE TABLE academic_years (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create semesters table
CREATE TABLE semesters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academic_year_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    semester_number TINYINT NOT NULL,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE
);

-- Create grades table
CREATE TABLE grades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    level INT NOT NULL,
    name VARCHAR(50) NOT NULL
);

-- Create classes table
CREATE TABLE classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    grade_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    class_head_id INT NULL,
    academic_year_id INT NOT NULL
);

-- Create subjects table
CREATE TABLE subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    name VARCHAR(100) NOT NULL
);

-- Create students table
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    class_id INT NOT NULL,
    student_id_number VARCHAR(50),
    date_of_birth DATE,
    sex ENUM('Male', 'Female') NOT NULL,
    date_of_admission DATE
);

-- Create student_parents table
CREATE TABLE student_parents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    parent_id INT NOT NULL,
    relationship VARCHAR(50)
);

-- Create teaching_assignments table
CREATE TABLE teaching_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id INT NOT NULL,
    class_id INT NOT NULL,
    subject_id INT NOT NULL,
    academic_year_id INT NOT NULL
);

-- Create assessment_types table
CREATE TABLE assessment_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    default_weight_percent DECIMAL(5,2)
);

-- Create weight_templates table
CREATE TABLE weight_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    weights JSON NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create assessment_weights table
CREATE TABLE assessment_weights (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teaching_assignment_id INT NOT NULL,
    assessment_type_id INT NOT NULL,
    semester_id INT NOT NULL,
    weight_percent DECIMAL(5,2) NOT NULL
);

-- Create marks table
CREATE TABLE marks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    teaching_assignment_id INT NOT NULL,
    assessment_type_id INT NOT NULL,
    semester_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create grade_submissions table
CREATE TABLE grade_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teaching_assignment_id INT NOT NULL,
    semester_id INT NOT NULL,
    status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
    submitted_at TIMESTAMP NULL,
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    comments TEXT
);

-- Create student_semester_results table
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
    published_at TIMESTAMP NULL
);

-- Create rosters table
CREATE TABLE rosters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_id INT NOT NULL,
    semester_id INT NOT NULL,
    submitted_by INT NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    roster_data JSON
);

-- Create transcripts table
CREATE TABLE transcripts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    generated_by INT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transcript_data JSON
);

-- Create promotion_criteria table
CREATE TABLE promotion_criteria (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    passing_average DECIMAL(5,2) NOT NULL,
    passing_per_subject DECIMAL(5,2) NOT NULL,
    max_failing_subjects INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Check tables were created
SHOW TABLES;
