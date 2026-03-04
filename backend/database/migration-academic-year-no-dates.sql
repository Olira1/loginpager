-- Migration: Make academic year start_date and end_date nullable
-- Admin creates academic years without setting start/end dates

ALTER TABLE academic_years
  MODIFY COLUMN start_date DATE NULL,
  MODIFY COLUMN end_date DATE NULL;
