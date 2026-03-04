-- Combined migration: Fix Academic Year and Promotion Criteria
-- Run: mysql -u root -p 2schoolportal < loginpager/backend/database/migration-fix-academic-and-promotion.sql

-- 1. Make academic year start_date and end_date nullable (Admin creates by name only)
ALTER TABLE academic_years
  MODIFY COLUMN start_date DATE NULL,
  MODIFY COLUMN end_date DATE NULL;

-- 2. Add school_id to promotion_criteria for School Head management
ALTER TABLE promotion_criteria
  ADD COLUMN school_id INT NULL AFTER id,
  ADD CONSTRAINT fk_promotion_criteria_school
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
