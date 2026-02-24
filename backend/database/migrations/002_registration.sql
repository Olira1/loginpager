-- =====================================================
-- Migration 002: Registration Module
-- =====================================================
-- Adds user registration fields, teachers table, and
-- student table updates for the registration system.
-- Compatible with both MySQL (MAMP) and TiDB Cloud.
-- Run AFTER: 001_add_school_fields.sql
-- =====================================================


-- =====================================================
-- 1. ALTER users TABLE
-- =====================================================

-- Add first_name and last_name columns
ALTER TABLE users ADD COLUMN first_name VARCHAR(100) NULL AFTER name;
ALTER TABLE users ADD COLUMN last_name VARCHAR(100) NULL AFTER first_name;

-- Add username column (login identifier: email, student_code, staff_code, or phone)
ALTER TABLE users ADD COLUMN username VARCHAR(255) NULL AFTER last_name;

-- Add gender column
ALTER TABLE users ADD COLUMN gender ENUM('M', 'F') NULL AFTER phone;

-- Add must_change_password flag
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE AFTER is_active;

-- Add deactivated_at timestamp
ALTER TABLE users ADD COLUMN deactivated_at TIMESTAMP NULL AFTER updated_at;

-- Make email nullable (students and parents may not have an email)
ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL;

-- Add 'registrar' to the role ENUM
ALTER TABLE users MODIFY COLUMN role ENUM(
    'admin', 'school_head', 'teacher', 'class_head',
    'student', 'parent', 'store_house', 'registrar'
) NOT NULL;

-- Populate first_name / last_name from existing name column
UPDATE users SET
    first_name = SUBSTRING_INDEX(name, ' ', 1),
    last_name = CASE
        WHEN LOCATE(' ', name) > 0 THEN SUBSTRING(name, LOCATE(' ', name) + 1)
        ELSE ''
    END
WHERE first_name IS NULL;

-- Populate username for email-based roles
UPDATE users SET username = email
WHERE role IN ('admin', 'school_head', 'teacher', 'class_head', 'store_house', 'registrar')
  AND username IS NULL AND email IS NOT NULL;

-- Populate username for parents (phone is the login identifier)
UPDATE users SET username = phone
WHERE role = 'parent' AND username IS NULL AND phone IS NOT NULL;

-- Populate username for students (student_id_number is the login identifier)
UPDATE users u
JOIN students s ON u.id = s.user_id
SET u.username = s.student_id_number
WHERE u.role = 'student' AND u.username IS NULL AND s.student_id_number IS NOT NULL;

-- Fallback: any remaining users without a username get their email
UPDATE users SET username = email
WHERE username IS NULL AND email IS NOT NULL;

-- Add unique index on username
CREATE UNIQUE INDEX idx_users_username ON users(username);


-- =====================================================
-- 2. CREATE teachers TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS teachers (
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

-- Populate teachers table from existing teacher/class_head users
INSERT INTO teachers (user_id, school_id)
SELECT id, school_id FROM users
WHERE role IN ('teacher', 'class_head') AND school_id IS NOT NULL
ON DUPLICATE KEY UPDATE school_id = VALUES(school_id);


-- =====================================================
-- 3. ALTER students TABLE
-- =====================================================

-- Add academic_year_id reference
ALTER TABLE students ADD COLUMN academic_year_id INT NULL;

ALTER TABLE students ADD CONSTRAINT fk_students_academic_year
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL;


-- =====================================================
-- 4. NEW INDEXES
-- =====================================================

CREATE INDEX idx_teachers_school ON teachers(school_id);
CREATE INDEX idx_teachers_staff_code ON teachers(staff_code);
CREATE INDEX idx_students_academic_year ON students(academic_year_id);


-- =====================================================
-- Migration 002 complete
-- =====================================================
