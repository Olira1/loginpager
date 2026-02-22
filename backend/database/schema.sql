-- =====================================================
-- SCHOOL PORTAL DATABASE SCHEMA
-- Ethiopian Secondary School Grade Management System
-- =====================================================
-- Run this file in phpMyAdmin (MAMP) to create all tables
-- Database: school_portal
-- =====================================================

-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS school_portal;
USE school_portal;

-- =====================================================
-- TABLE 1: schools
-- Purpose: Store school information
-- Relationship: One school has many users, grades, classes
-- =====================================================
CREATE TABLE schools (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500),
    phone VARCHAR(20),
    email VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    school_head_id INT NULL,                    -- Will be updated after users table
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE 2: users
-- Purpose: All system users (admin, school_head, teacher, 
--          class_head, student, parent, store_house)
-- Note: Students also exist here for login, but detailed 
--       student info is in the students table
-- =====================================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,             -- Hashed with bcrypt
    phone VARCHAR(20),
    role ENUM('admin', 'school_head', 'teacher', 'class_head', 'student', 'parent', 'store_house') NOT NULL,
    school_id INT NULL,                         -- NULL for admin (platform-level)
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
-- Purpose: Track academic years (Ethiopian calendar)
-- Example: 2016 E.C, 2017 E.C
-- =====================================================
CREATE TABLE academic_years (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,                  -- e.g., "2016 E.C"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,           -- Only one should be current
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE 4: semesters
-- Purpose: First and Second semester per academic year
-- Ethiopian schools have 2 semesters per year
-- =====================================================
CREATE TABLE semesters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academic_year_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,                  -- "First Semester" or "Second Semester"
    semester_number TINYINT NOT NULL,           -- 1 or 2
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLE 5: grades
-- Purpose: Grade levels (9, 10, 11, 12 for secondary)
-- Each school has its own grade records
-- =====================================================
CREATE TABLE grades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    level INT NOT NULL,                         -- 9, 10, 11, or 12
    name VARCHAR(50) NOT NULL,                  -- "Grade 9", "Grade 10", etc.
    
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    UNIQUE KEY unique_grade_per_school (school_id, level)
);

-- =====================================================
-- TABLE 6: classes
-- Purpose: Sections within a grade (9A, 9B, 10A, etc.)
-- Each class has a class head (teacher)
-- =====================================================
CREATE TABLE classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    grade_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,                  -- "A", "B", "C" or "9A", "9B"
    class_head_id INT NULL,                     -- Teacher who is class head
    academic_year_id INT NOT NULL,
    
    FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
    FOREIGN KEY (class_head_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLE 7: subjects
-- Purpose: Subjects taught in the school
-- Each school defines its own subjects
-- =====================================================
CREATE TABLE subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,                 -- "Mathematics", "Physics", "English"
    
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    UNIQUE KEY unique_subject_per_school (school_id, name)
);

-- =====================================================
-- TABLE 8: students
-- Purpose: Detailed student information
-- Linked to users table for login credentials
-- Contains bio data needed for rosters and transcripts
-- =====================================================
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,                -- Link to users table
    class_id INT NOT NULL,                      -- Current class
    student_id_number VARCHAR(50),              -- School's student ID
    date_of_birth DATE,
    sex ENUM('Male', 'Female') NOT NULL,
    date_of_admission DATE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLE 9: student_parents
-- Purpose: Link students to their parents (many-to-many)
-- One parent can have multiple children in the school
-- One student can have multiple parents registered
-- =====================================================
CREATE TABLE student_parents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    parent_id INT NOT NULL,                     -- References users table (role=parent)
    relationship VARCHAR(50),                   -- "Father", "Mother", "Guardian"
    
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_parent (student_id, parent_id)
);

-- =====================================================
-- TABLE 10: teaching_assignments
-- Purpose: Which teacher teaches which subject in which class
-- A teacher can teach multiple subjects/classes
-- =====================================================
CREATE TABLE teaching_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id INT NOT NULL,                    -- References users (role=teacher or class_head)
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
-- Purpose: Types of assessments defined by School Head
-- Examples: Test, Quiz, Assignment, Mid-exam, Final
-- School Head sets default weight percentages
-- =====================================================
CREATE TABLE assessment_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,                 -- "Test", "Quiz", "Mid-Exam", "Final"
    default_weight_percent DECIMAL(5,2),        -- School Head's suggested weight (e.g., 10.00)
    
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assessment_type (school_id, name)
);

-- =====================================================
-- TABLE 11b: weight_templates
-- Purpose: School Head defines weight templates that
-- teachers can use as starting points for their weights
-- =====================================================
CREATE TABLE weight_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    weights JSON NOT NULL,                         -- [{ assessment_type_id, assessment_type_name, weight_percent, max_score }]
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLE 12: assessment_weights
-- Purpose: Teacher-defined weights for their subject/class
-- Teachers can adjust weights from School Head's suggestions
-- Total weights for a subject should equal 100%
-- =====================================================
CREATE TABLE assessment_weights (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teaching_assignment_id INT NOT NULL,
    assessment_type_id INT NOT NULL,
    semester_id INT NOT NULL,
    weight_percent DECIMAL(5,2) NOT NULL,       -- e.g., 15.00 for 15%
    
    FOREIGN KEY (teaching_assignment_id) REFERENCES teaching_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    UNIQUE KEY unique_weight (teaching_assignment_id, assessment_type_id, semester_id)
);

-- =====================================================
-- TABLE 13: marks
-- Purpose: Individual student assessment scores
-- Teachers enter marks per assessment type
-- =====================================================
CREATE TABLE marks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    teaching_assignment_id INT NOT NULL,
    assessment_type_id INT NOT NULL,
    semester_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,                -- Raw score (e.g., 8 out of 10)
    max_score DECIMAL(5,2) NOT NULL,            -- Maximum possible (e.g., 10)
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
-- Purpose: Track teacher grade submission status
-- Teachers submit grades for Class Head review
-- =====================================================
CREATE TABLE grade_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teaching_assignment_id INT NOT NULL,
    semester_id INT NOT NULL,
    status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
    submitted_at TIMESTAMP NULL,
    reviewed_by INT NULL,                       -- Class Head who reviewed
    reviewed_at TIMESTAMP NULL,
    comments TEXT,
    
    FOREIGN KEY (teaching_assignment_id) REFERENCES teaching_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_submission (teaching_assignment_id, semester_id)
);

-- =====================================================
-- TABLE 15: student_semester_results
-- Purpose: Compiled results per student per semester
-- Calculated by Class Head: total, average, rank, remark
-- =====================================================
CREATE TABLE student_semester_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    semester_id INT NOT NULL,
    total_score DECIMAL(7,2),                   -- Sum of all subject scores
    average_score DECIMAL(5,2),                 -- Average of all subjects
    rank_in_class INT,                          -- Position in class
    absent_days INT DEFAULT 0,
    conduct VARCHAR(50),                        -- "Good", "Very Good", "Excellent"
    remark ENUM('Promoted', 'Not Promoted', 'Pending') DEFAULT 'Pending',
    is_published BOOLEAN DEFAULT FALSE,         -- Visible to students/parents
    published_at TIMESTAMP NULL,
    
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    UNIQUE KEY unique_result (student_id, semester_id)
);

-- =====================================================
-- TABLE 16: rosters
-- Purpose: Store House receives class rosters from Class Head
-- Archive of class performance records
-- =====================================================
CREATE TABLE rosters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_id INT NOT NULL,
    semester_id INT NOT NULL,
    submitted_by INT NOT NULL,                  -- Class Head who sent it
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    roster_data JSON,                           -- Full roster data in JSON format
    
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_roster (class_id, semester_id)
);

-- =====================================================
-- TABLE 17: transcripts
-- Purpose: Generated student transcripts
-- Store House generates and stores transcripts
-- =====================================================
CREATE TABLE transcripts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    generated_by INT NOT NULL,                  -- Store House user
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transcript_data JSON,                       -- Full transcript in JSON format
    
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLE 18: promotion_criteria
-- Purpose: Admin-defined rules for student promotion
-- Defines passing thresholds
-- =====================================================
CREATE TABLE promotion_criteria (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,                 -- "Standard Secondary Criteria"
    passing_average DECIMAL(5,2) NOT NULL,      -- Minimum average to pass (e.g., 50.00)
    passing_per_subject DECIMAL(5,2) NOT NULL,  -- Minimum per subject (e.g., 40.00)
    max_failing_subjects INT NOT NULL,          -- Max subjects allowed to fail (e.g., 2)
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
-- Next: Run seed.sql to add mock data
-- =====================================================

