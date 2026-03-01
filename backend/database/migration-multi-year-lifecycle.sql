-- =====================================================
-- Migration: Multi-Year Lifecycle Foundation
-- =====================================================
-- Purpose:
-- 1) Add lifecycle columns for academic years and semesters
-- 2) Add student enrollment history table
-- 3) Add promotion and registration audit batch tables
-- 4) Add marks change audit table
-- 5) Backfill enrollment history from existing students data
--
-- Compatibility: MySQL (MAMP) + TiDB Cloud
-- =====================================================

-- =====================================================
-- 1) Lifecycle columns
-- =====================================================
ALTER TABLE academic_years
ADD COLUMN lifecycle_status ENUM('planned', 'active', 'closed', 'locked') NOT NULL DEFAULT 'planned',
ADD COLUMN locked_at TIMESTAMP NULL,
ADD COLUMN locked_by INT NULL,
ADD COLUMN lock_reason VARCHAR(500) NULL,
ADD COLUMN reopened_at TIMESTAMP NULL,
ADD COLUMN reopened_by INT NULL,
ADD COLUMN reopen_reason VARCHAR(500) NULL;

ALTER TABLE academic_years
ADD CONSTRAINT fk_academic_years_locked_by
FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE academic_years
ADD CONSTRAINT fk_academic_years_reopened_by
FOREIGN KEY (reopened_by) REFERENCES users(id) ON DELETE SET NULL;

-- Keep old is_current behavior for backward compatibility while adding lifecycle state
UPDATE academic_years
SET lifecycle_status = CASE WHEN is_current = TRUE THEN 'active' ELSE 'planned' END
WHERE lifecycle_status = 'planned';

ALTER TABLE semesters
ADD COLUMN lifecycle_status ENUM('open', 'submission_closed', 'published', 'locked') NOT NULL DEFAULT 'open',
ADD COLUMN submission_closed_at TIMESTAMP NULL,
ADD COLUMN published_at TIMESTAMP NULL,
ADD COLUMN locked_at TIMESTAMP NULL,
ADD COLUMN locked_by INT NULL,
ADD COLUMN lock_reason VARCHAR(500) NULL,
ADD COLUMN reopened_at TIMESTAMP NULL,
ADD COLUMN reopened_by INT NULL,
ADD COLUMN reopen_reason VARCHAR(500) NULL;

ALTER TABLE semesters
ADD CONSTRAINT fk_semesters_locked_by
FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE semesters
ADD CONSTRAINT fk_semesters_reopened_by
FOREIGN KEY (reopened_by) REFERENCES users(id) ON DELETE SET NULL;

UPDATE semesters
SET lifecycle_status = CASE WHEN is_current = TRUE THEN 'open' ELSE 'open' END
WHERE lifecycle_status = 'open';

-- =====================================================
-- 2) Student enrollment history
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

CREATE INDEX idx_student_enrollments_current ON student_enrollments(student_id, is_current);
CREATE INDEX idx_student_enrollments_class_year ON student_enrollments(class_id, academic_year_id);

-- Backfill historical/current enrollment from existing students snapshot
INSERT INTO student_enrollments (
    student_id,
    academic_year_id,
    grade_id,
    class_id,
    status,
    entry_reason,
    is_current,
    started_at
)
SELECT
    s.id AS student_id,
    COALESCE(s.academic_year_id, c.academic_year_id) AS academic_year_id,
    c.grade_id AS grade_id,
    s.class_id AS class_id,
    'active' AS status,
    'correction' AS entry_reason,
    TRUE AS is_current,
    s.date_of_admission AS started_at
FROM students s
JOIN classes c ON c.id = s.class_id
LEFT JOIN student_enrollments se
    ON se.student_id = s.id
   AND se.academic_year_id = COALESCE(s.academic_year_id, c.academic_year_id)
WHERE COALESCE(s.academic_year_id, c.academic_year_id) IS NOT NULL
  AND se.id IS NULL;

-- Ensure only latest enrollment remains current per student
UPDATE student_enrollments se
JOIN (
    SELECT student_id, MAX(academic_year_id) AS latest_academic_year_id
    FROM student_enrollments
    GROUP BY student_id
) latest
ON latest.student_id = se.student_id
SET se.is_current = CASE
    WHEN se.academic_year_id = latest.latest_academic_year_id THEN TRUE
    ELSE FALSE
END;

-- =====================================================
-- 3) Promotion batches
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

CREATE INDEX idx_promotion_batches_school_year ON promotion_batches(school_id, from_academic_year_id, to_academic_year_id);

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

CREATE INDEX idx_promotion_batch_items_status ON promotion_batch_items(batch_id, item_status);

-- =====================================================
-- 4) Registration operation batches
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

CREATE INDEX idx_registration_batches_school_type ON registration_batches(school_id, batch_type);

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

CREATE INDEX idx_registration_batch_rows_batch_status ON registration_batch_rows(batch_id, status);

-- =====================================================
-- 5) Marks change audit
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

CREATE INDEX idx_mark_change_audit_mark_time ON mark_change_audit(mark_id, created_at);
CREATE INDEX idx_mark_change_audit_actor_time ON mark_change_audit(changed_by, created_at);

-- =====================================================
-- Migration complete
-- =====================================================
