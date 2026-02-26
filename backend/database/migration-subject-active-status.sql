-- Add soft-active state for subjects so users can deactivate before delete.
ALTER TABLE subjects
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
