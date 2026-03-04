-- Migration: Add school_id to promotion_criteria for School Head management
-- School heads manage promotion criteria for their school
-- Existing rows keep school_id NULL (legacy admin-created)

ALTER TABLE promotion_criteria
  ADD COLUMN school_id INT NULL AFTER id,
  ADD CONSTRAINT fk_promotion_criteria_school
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
