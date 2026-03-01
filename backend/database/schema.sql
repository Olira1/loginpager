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
    code VARCHAR(20) UNIQUE,
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
-- Purpose: All system users (admin, school_head, teacher,
--          class_head, student, parent, store_house, registrar)
-- Note: Students also exist here for login, but detailed
--       student info is in the students table
-- =====================================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    username VARCHAR(255) UNIQUE,                -- Login identifier (email, student_code, staff_code, or phone)
    email VARCHAR(255) NULL UNIQUE,
    password VARCHAR(255) NOT NULL,              -- Hashed with bcrypt
    phone VARCHAR(20),
    gender ENUM('M', 'F') NULL,
    role ENUM('admin', 'school_head', 'teacher', 'class_head', 'student', 'parent', 'store_house', 'registrar') NOT NULL,
    school_id INT NULL,                          -- NULL for admin (platform-level)
    is_active BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP NULL,

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
    name VARCHAR(50) NOT NULL,                   -- e.g., "2016 E.C"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,            -- Only one should be current
    lifecycle_status ENUM('planned', 'active', 'closed', 'locked') NOT NULL DEFAULT 'planned',
    locked_at TIMESTAMP NULL,
    locked_by INT NULL,
    lock_reason VARCHAR(500) NULL,
    reopened_at TIMESTAMP NULL,
    reopened_by INT NULL,
    reopen_reason VARCHAR(500) NULL,
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
    name VARCHAR(50) NOT NULL,                   -- "First Semester" or "Second Semester"
    semester_number TINYINT NOT NULL,            -- 1 or 2
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    lifecycle_status ENUM('open', 'submission_closed', 'published', 'locked') NOT NULL DEFAULT 'open',
    submission_closed_at TIMESTAMP NULL,
    published_at TIMESTAMP NULL,
    locked_at TIMESTAMP NULL,
    locked_by INT NULL,
    lock_reason VARCHAR(500) NULL,
    reopened_at TIMESTAMP NULL,
    reopened_by INT NULL,
    reopen_reason VARCHAR(500) NULL,

    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

ALTER TABLE academic_years
ADD CONSTRAINT fk_academic_years_locked_by
FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE academic_years
ADD CONSTRAINT fk_academic_years_reopened_by
FOREIGN KEY (reopened_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE semesters
ADD CONSTRAINT fk_semesters_locked_by
FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE semesters
ADD CONSTRAINT fk_semesters_reopened_by
FOREIGN KEY (reopened_by) REFERENCES users(id) ON DELETE SET NULL;

-- =====================================================
-- TABLE 5: grades
-- Purpose: Grade levels (9, 10, 11, 12 for secondary)
-- Each school has its own grade records
-- =====================================================
CREATE TABLE grades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    level INT NOT NULL,                          -- 9, 10, 11, or 12
    name VARCHAR(50) NOT NULL,                   -- "Grade 9", "Grade 10", etc.

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
    name VARCHAR(50) NOT NULL,                   -- "A", "B", "C" or "9A", "9B"
    class_head_id INT NULL,                      -- Teacher who is class head
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
    name VARCHAR(100) NOT NULL,                  -- "Mathematics", "Physics", "English"
    is_active BOOLEAN NOT NULL DEFAULT TRUE,     -- Soft deactivation before delete

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
    user_id INT NOT NULL UNIQUE,                 -- Link to users table
    class_id INT NOT NULL,                       -- Current class
    student_id_number VARCHAR(50),               -- Student code (e.g., STU2024001)
    date_of_birth DATE,
    sex ENUM('Male', 'Female') NOT NULL,
    date_of_admission DATE,
    academic_year_id INT NULL,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLE 8b: student_enrollments
-- Purpose: Year-by-year enrollment history per student
-- =====================================================
CREATE TABLE student_enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    grade_id INT NOT NULL,
    class_id INT NOT NULL,
    status ENUM('active', 'promoted', 'repeated', 'graduated', 'withdrawn', 'transferred_out') NOT NULL DEFAULT 'active',
    entry_reason ENUM('new_registration', 'promotion', 'manual_transfer', 'correction') NOT NULL DEFAULT 'new_registration',
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    started_at DATE NULL,
    ended_at DATE NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
    FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_student_year_enrollment (student_id, academic_year_id)
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
    parent_id INT NOT NULL,                      -- References users table (role=parent)
    relationship VARCHAR(50),                    -- "father", "mother", "guardian"

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_parent (student_id, parent_id)
);

-- =====================================================
-- TABLE 10: teachers
-- Purpose: Detailed teacher information
-- Linked to users table for login credentials
-- Contains staff code, qualifications, specialization
-- =====================================================
CREATE TABLE teachers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,                 -- Link to users table
    staff_code VARCHAR(50) UNIQUE,               -- Teacher code (e.g., TCH2024001)
    date_of_birth DATE,
    qualification VARCHAR(200),
    specialization VARCHAR(100),
    school_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLE 11: teaching_assignments
-- Purpose: Which teacher teaches which subject in which class
-- A teacher can teach multiple subjects/classes
-- =====================================================
CREATE TABLE teaching_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id INT NOT NULL,                     -- References users (role=teacher or class_head)
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
-- TABLE 12: assessment_types
-- Purpose: Types of assessments defined by School Head
-- Examples: Test, Quiz, Assignment, Mid-exam, Final
-- School Head sets default weight percentages
-- =====================================================
CREATE TABLE assessment_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,                  -- "Test", "Quiz", "Mid-Exam", "Final"
    default_weight_percent DECIMAL(5,2),         -- School Head's suggested weight (e.g., 10.00)

    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assessment_type (school_id, name)
);

-- =====================================================
-- TABLE 12b: weight_templates
-- Purpose: School Head defines weight templates that
-- teachers can use as starting points for their weights
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
-- TABLE 13: assessment_weights
-- Purpose: Teacher-defined weights for their subject/class
-- Teachers can adjust weights from School Head's suggestions
-- Total weights for a subject should equal 100%
-- =====================================================
CREATE TABLE assessment_weights (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teaching_assignment_id INT NOT NULL,
    assessment_type_id INT NOT NULL,
    semester_id INT NOT NULL,
    weight_percent DECIMAL(5,2) NOT NULL,        -- e.g., 15.00 for 15%

    FOREIGN KEY (teaching_assignment_id) REFERENCES teaching_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    UNIQUE KEY unique_weight (teaching_assignment_id, assessment_type_id, semester_id)
);

-- =====================================================
-- TABLE 14: marks
-- Purpose: Individual student assessment scores
-- Teachers enter marks per assessment type
-- =====================================================
CREATE TABLE marks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    teaching_assignment_id INT NOT NULL,
    assessment_type_id INT NOT NULL,
    semester_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,                 -- Raw score (e.g., 8 out of 10)
    max_score DECIMAL(5,2) NOT NULL,             -- Maximum possible (e.g., 10)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (teaching_assignment_id) REFERENCES teaching_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_type_id) REFERENCES assessment_types(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    UNIQUE KEY unique_mark (student_id, teaching_assignment_id, assessment_type_id, semester_id)
);

-- =====================================================
-- TABLE 14b: mark_change_audit
-- Purpose: Immutable audit trail for marks changes
-- =====================================================
CREATE TABLE mark_change_audit (
    id INT PRIMARY KEY AUTO_INCREMENT,
    mark_id INT NULL,
    action ENUM('insert', 'update', 'delete') NOT NULL,
    old_score DECIMAL(5,2) NULL,
    new_score DECIMAL(5,2) NULL,
    old_max_score DECIMAL(5,2) NULL,
    new_max_score DECIMAL(5,2) NULL,
    changed_by INT NULL,
    change_reason VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (mark_id) REFERENCES marks(id) ON DELETE SET NULL,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLE 15: grade_submissions
-- Purpose: Track teacher grade submission status
-- Teachers submit grades for Class Head review
-- =====================================================
CREATE TABLE grade_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teaching_assignment_id INT NOT NULL,
    semester_id INT NOT NULL,
    status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
    submitted_at TIMESTAMP NULL,
    reviewed_by INT NULL,                        -- Class Head who reviewed
    reviewed_at TIMESTAMP NULL,
    comments TEXT,

    FOREIGN KEY (teaching_assignment_id) REFERENCES teaching_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_submission (teaching_assignment_id, semester_id)
);

-- =====================================================
-- TABLE 16: student_semester_results
-- Purpose: Compiled results per student per semester
-- Calculated by Class Head: total, average, rank, remark
-- =====================================================
CREATE TABLE student_semester_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    semester_id INT NOT NULL,
    total_score DECIMAL(7,2),                    -- Sum of all subject scores
    average_score DECIMAL(5,2),                  -- Average of all subjects
    rank_in_class INT,                           -- Position in class
    absent_days INT DEFAULT 0,
    conduct VARCHAR(50),                         -- "Good", "Very Good", "Excellent"
    remark ENUM('Promoted', 'Not Promoted', 'Pending') DEFAULT 'Pending',
    is_published BOOLEAN DEFAULT FALSE,          -- Visible to students/parents
    published_at TIMESTAMP NULL,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    UNIQUE KEY unique_result (student_id, semester_id)
);

-- =====================================================
-- TABLE 17: rosters
-- Purpose: Store House receives class rosters from Class Head
-- Archive of class performance records
-- =====================================================
CREATE TABLE rosters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_id INT NOT NULL,
    semester_id INT NOT NULL,
    submitted_by INT NOT NULL,                   -- Class Head who sent it
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    roster_data JSON,                            -- Full roster data in JSON format

    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_roster (class_id, semester_id)
);

-- =====================================================
-- TABLE 18: transcripts
-- Purpose: Generated student transcripts
-- Store House generates and stores transcripts
-- =====================================================
CREATE TABLE transcripts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    generated_by INT NOT NULL,                   -- Store House user
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transcript_data JSON,                        -- Full transcript in JSON format

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLE 19: promotion_criteria
-- Purpose: Admin-defined rules for student promotion
-- Defines passing thresholds
-- =====================================================
CREATE TABLE promotion_criteria (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,                  -- "Standard Secondary Criteria"
    passing_average DECIMAL(5,2) NOT NULL,       -- Minimum average to pass (e.g., 50.00)
    passing_per_subject DECIMAL(5,2) NOT NULL,   -- Minimum per subject (e.g., 40.00)
    max_failing_subjects INT NOT NULL,           -- Max subjects allowed to fail (e.g., 2)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABLE 20: promotion_batches
-- Purpose: Track promotion preview/commit operations
-- =====================================================
CREATE TABLE promotion_batches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    batch_code VARCHAR(50) NOT NULL UNIQUE,
    school_id INT NOT NULL,
    from_academic_year_id INT NOT NULL,
    to_academic_year_id INT NOT NULL,
    promotion_criteria_id INT NULL,
    status ENUM('preview', 'committed', 'cancelled') NOT NULL DEFAULT 'preview',
    summary_json JSON NULL,
    created_by INT NOT NULL,
    committed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (from_academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
    FOREIGN KEY (to_academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
    FOREIGN KEY (promotion_criteria_id) REFERENCES promotion_criteria(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLE 21: promotion_batch_items
-- Purpose: Student-level outcomes per promotion batch
-- =====================================================
CREATE TABLE promotion_batch_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    batch_id INT NOT NULL,
    student_id INT NOT NULL,
    from_enrollment_id INT NULL,
    to_enrollment_id INT NULL,
    decision ENUM('promoted', 'repeated', 'graduated', 'withdrawn') NOT NULL,
    from_grade_level INT NULL,
    to_grade_level INT NULL,
    from_class_id INT NULL,
    to_class_id INT NULL,
    item_status ENUM('planned', 'applied', 'skipped', 'failed') NOT NULL DEFAULT 'planned',
    error_message VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (batch_id) REFERENCES promotion_batches(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (from_enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL,
    FOREIGN KEY (to_enrollment_id) REFERENCES student_enrollments(id) ON DELETE SET NULL,
    FOREIGN KEY (from_class_id) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (to_class_id) REFERENCES classes(id) ON DELETE SET NULL,
    UNIQUE KEY unique_batch_student (batch_id, student_id)
);

-- =====================================================
-- TABLE 22: registration_batches
-- Purpose: Audit manual/upload registration operations
-- =====================================================
CREATE TABLE registration_batches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    batch_code VARCHAR(50) NOT NULL UNIQUE,
    school_id INT NOT NULL,
    batch_type ENUM('students_manual', 'students_upload', 'teachers_manual', 'teachers_upload') NOT NULL,
    source_file_name VARCHAR(255) NULL,
    total_rows INT NOT NULL DEFAULT 0,
    successful_rows INT NOT NULL DEFAULT 0,
    failed_rows INT NOT NULL DEFAULT 0,
    summary_json JSON NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLE 23: registration_batch_rows
-- Purpose: Row-level registration outcomes
-- =====================================================
CREATE TABLE registration_batch_rows (
    id INT PRIMARY KEY AUTO_INCREMENT,
    batch_id INT NOT NULL,
    `row_number` INT NULL,
    entity_type ENUM('student', 'teacher', 'parent') NOT NULL,
    entity_id INT NULL,
    status ENUM('success', 'failed', 'skipped') NOT NULL,
    error_code VARCHAR(100) NULL,
    error_message VARCHAR(500) NULL,
    row_data_json JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (batch_id) REFERENCES registration_batches(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_academic_year ON students(academic_year_id);
CREATE INDEX idx_marks_student ON marks(student_id);
CREATE INDEX idx_marks_semester ON marks(semester_id);
CREATE INDEX idx_teaching_assignments_teacher ON teaching_assignments(teacher_id);
CREATE INDEX idx_teaching_assignments_class ON teaching_assignments(class_id);
CREATE INDEX idx_teachers_school ON teachers(school_id);
CREATE INDEX idx_teachers_staff_code ON teachers(staff_code);
CREATE INDEX idx_student_enrollments_current ON student_enrollments(student_id, is_current);
CREATE INDEX idx_student_enrollments_class_year ON student_enrollments(class_id, academic_year_id);
CREATE INDEX idx_promotion_batches_school_year ON promotion_batches(school_id, from_academic_year_id, to_academic_year_id);
CREATE INDEX idx_promotion_batch_items_status ON promotion_batch_items(batch_id, item_status);
CREATE INDEX idx_registration_batches_school_type ON registration_batches(school_id, batch_type);
CREATE INDEX idx_registration_batch_rows_batch_status ON registration_batch_rows(batch_id, status);
CREATE INDEX idx_mark_change_audit_mark_time ON mark_change_audit(mark_id, created_at);
CREATE INDEX idx_mark_change_audit_actor_time ON mark_change_audit(changed_by, created_at);

-- =====================================================
-- SCHEMA COMPLETE
-- Next: Run seed.sql to add mock data
-- =====================================================
