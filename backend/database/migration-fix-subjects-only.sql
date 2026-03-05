-- =====================================================
-- Migration: Fix subjects table (run AFTER migration-grade-year-subjects-assessments.sql)
-- Use this when the SUBJECTS section failed due to TiDB/MySQL column-add order
-- Run in TiDB Cloud SQL Editor on database: test
-- =====================================================

-- 1. Add is_active if missing (required for index and backfill)
ALTER TABLE subjects
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Add grade_id and academic_year_id (separate statements for TiDB compatibility)
ALTER TABLE subjects ADD COLUMN grade_id INT NULL AFTER school_id;
ALTER TABLE subjects ADD COLUMN academic_year_id INT NULL AFTER grade_id;

-- 3. Foreign keys
ALTER TABLE subjects
ADD CONSTRAINT fk_subjects_grade
FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE;

ALTER TABLE subjects
ADD CONSTRAINT fk_subjects_academic_year
FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;

-- 4. Unique constraint (allows same subject name per grade/year)
ALTER TABLE subjects
ADD UNIQUE KEY unique_subject_per_grade_year (school_id, grade_id, academic_year_id, name);

-- 5. Index for queries
CREATE INDEX idx_subjects_school_grade_year
ON subjects (school_id, grade_id, academic_year_id, is_active);

-- 6. Backfill: duplicate legacy subjects into per-grade/per-year scope
INSERT IGNORE INTO subjects (school_id, grade_id, academic_year_id, name, is_active)
SELECT DISTINCT
    s.school_id,
    c.grade_id,
    ta.academic_year_id,
    s.name,
    COALESCE(s.is_active, TRUE)
FROM teaching_assignments ta
JOIN classes c ON c.id = ta.class_id
JOIN subjects s ON s.id = ta.subject_id
WHERE s.grade_id IS NULL
  AND s.academic_year_id IS NULL;

-- 7. Repoint teaching_assignments to new per-grade subjects
UPDATE teaching_assignments ta
JOIN classes c ON c.id = ta.class_id
JOIN subjects old_s ON old_s.id = ta.subject_id
JOIN subjects new_s
  ON new_s.school_id = old_s.school_id
 AND new_s.name = old_s.name
 AND new_s.grade_id = c.grade_id
 AND new_s.academic_year_id = ta.academic_year_id
SET ta.subject_id = new_s.id
WHERE old_s.grade_id IS NULL
  AND old_s.academic_year_id IS NULL;
