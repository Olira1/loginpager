-- =====================================================
-- Migration: Scope subjects/assessments by grade/year
-- =====================================================
-- Purpose:
-- 1) Make subjects independent per grade + academic year
-- 2) Make assessment configuration independent per academic year
-- Compatibility: MySQL (MAMP) + TiDB Cloud
-- =====================================================

-- ---------- SUBJECTS ----------
ALTER TABLE subjects
ADD COLUMN grade_id INT NULL AFTER school_id,
ADD COLUMN academic_year_id INT NULL AFTER grade_id;

ALTER TABLE subjects
ADD CONSTRAINT fk_subjects_grade
FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE;

ALTER TABLE subjects
ADD CONSTRAINT fk_subjects_academic_year
FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;

-- Keep a non-unique school_id index so dropping the old unique key
-- does not break FK index requirements.
CREATE INDEX idx_subjects_school_fk
ON subjects (school_id);

ALTER TABLE subjects
DROP INDEX unique_subject_per_school;

ALTER TABLE subjects
ADD UNIQUE KEY unique_subject_per_grade_year (school_id, grade_id, academic_year_id, name);

CREATE INDEX idx_subjects_school_grade_year
ON subjects (school_id, grade_id, academic_year_id, is_active);

-- Backfill: duplicate legacy (school-wide) subjects into per-grade/per-year scope
-- based on existing teaching assignments, then repoint assignments.
INSERT IGNORE INTO subjects (school_id, grade_id, academic_year_id, name, is_active)
SELECT DISTINCT
    s.school_id,
    c.grade_id,
    ta.academic_year_id,
    s.name,
    s.is_active
FROM teaching_assignments ta
JOIN classes c ON c.id = ta.class_id
JOIN subjects s ON s.id = ta.subject_id
WHERE s.grade_id IS NULL
  AND s.academic_year_id IS NULL;

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

-- ---------- ASSESSMENT TYPES ----------
ALTER TABLE assessment_types
ADD COLUMN academic_year_id INT NULL AFTER school_id;

ALTER TABLE assessment_types
ADD CONSTRAINT fk_assessment_types_academic_year
FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;

-- Keep a non-unique school_id index so dropping the old unique key
-- does not break FK index requirements.
CREATE INDEX idx_assessment_types_school_fk
ON assessment_types (school_id);

ALTER TABLE assessment_types
DROP INDEX unique_assessment_type;

ALTER TABLE assessment_types
ADD UNIQUE KEY unique_assessment_type_per_year (school_id, academic_year_id, name);

CREATE INDEX idx_assessment_types_school_year
ON assessment_types (school_id, academic_year_id, name);

-- Backfill: duplicate legacy assessment types per academic year from used marks/weights
INSERT IGNORE INTO assessment_types (school_id, academic_year_id, name, default_weight_percent)
SELECT DISTINCT
    at.school_id,
    ta.academic_year_id,
    at.name,
    at.default_weight_percent
FROM assessment_types at
JOIN classes c ON c.academic_year_id IS NOT NULL
JOIN grades g ON g.id = c.grade_id AND g.school_id = at.school_id
JOIN teaching_assignments ta ON ta.class_id = c.id
WHERE at.academic_year_id IS NULL;

UPDATE assessment_weights aw
JOIN teaching_assignments ta ON ta.id = aw.teaching_assignment_id
JOIN assessment_types old_at ON old_at.id = aw.assessment_type_id
JOIN assessment_types new_at
  ON new_at.school_id = old_at.school_id
 AND new_at.name = old_at.name
 AND new_at.academic_year_id = ta.academic_year_id
SET aw.assessment_type_id = new_at.id
WHERE old_at.academic_year_id IS NULL;

UPDATE marks m
JOIN teaching_assignments ta ON ta.id = m.teaching_assignment_id
JOIN assessment_types old_at ON old_at.id = m.assessment_type_id
JOIN assessment_types new_at
  ON new_at.school_id = old_at.school_id
 AND new_at.name = old_at.name
 AND new_at.academic_year_id = ta.academic_year_id
SET m.assessment_type_id = new_at.id
WHERE old_at.academic_year_id IS NULL;

-- ---------- WEIGHT TEMPLATES ----------
ALTER TABLE weight_templates
ADD COLUMN academic_year_id INT NULL AFTER school_id;

ALTER TABLE weight_templates
ADD CONSTRAINT fk_weight_templates_academic_year
FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE;

CREATE INDEX idx_weight_templates_school_year
ON weight_templates (school_id, academic_year_id, is_default);

-- Backfill: copy legacy templates to each academic year used by classes in the school
INSERT IGNORE INTO weight_templates (school_id, academic_year_id, name, description, weights, is_default, created_at, updated_at)
SELECT
    wt.school_id,
    ay.id AS academic_year_id,
    wt.name,
    wt.description,
    wt.weights,
    wt.is_default,
    wt.created_at,
    wt.updated_at
FROM weight_templates wt
JOIN (
    SELECT DISTINCT g.school_id, c.academic_year_id
    FROM classes c
    JOIN grades g ON g.id = c.grade_id
    WHERE c.academic_year_id IS NOT NULL
) sy ON sy.school_id = wt.school_id
JOIN academic_years ay ON ay.id = sy.academic_year_id
WHERE wt.academic_year_id IS NULL;
