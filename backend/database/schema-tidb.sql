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
DROP TABLE IF EXISTS mark_change_audit;
DROP TABLE IF EXISTS marks;
DROP TABLE IF EXISTS assessment_weights;
DROP TABLE IF EXISTS weight_templates;
DROP TABLE IF EXISTS assessment_types;
DROP TABLE IF EXISTS teaching_assignments;
DROP TABLE IF EXISTS promotion_batch_items;
DROP TABLE IF EXISTS promotion_batches;
DROP TABLE IF EXISTS registration_batch_rows;
DROP TABLE IF EXISTS registration_batches;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS student_parents;
DROP TABLE IF EXISTS student_enrollments;
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
-- =====================================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    gender ENUM('M', 'F') NULL,
    role ENUM('admin', 'school_head', 'teacher', 'class_head', 'student', 'parent', 'store_house', 'registrar') NOT NULL,
    school_id INT NULL,
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
-- =====================================================
CREATE TABLE academic_years (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
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
-- =====================================================
CREATE TABLE semesters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academic_year_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    semester_number TINYINT NOT NULL,
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
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

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
    academic_year_id INT NULL,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLE 8b: student_enrollments
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
-- TABLE 10: teachers
-- =====================================================
CREATE TABLE teachers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    staff_code VARCHAR(50) UNIQUE,
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
-- TABLE 12: assessment_types
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
-- TABLE 12b: weight_templates
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
-- TABLE 14: marks
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
-- TABLE 14b: mark_change_audit
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
-- TABLE 16: student_semester_results
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
-- TABLE 17: rosters
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
-- TABLE 18: transcripts
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
-- TABLE 19: promotion_criteria
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
-- TABLE 20: promotion_batches
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
-- =====================================================
