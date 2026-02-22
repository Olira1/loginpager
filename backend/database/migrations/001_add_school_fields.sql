-- Migration: Add code and status fields to schools table
-- Run this in phpMyAdmin after the initial schema

USE school_portal;

-- Add code field (unique school identifier)
ALTER TABLE schools 
ADD COLUMN code VARCHAR(20) UNIQUE AFTER name;

-- Add status field
ALTER TABLE schools 
ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active' AFTER email;

-- Update existing schools with codes
UPDATE schools SET code = 'AASS', status = 'active' WHERE id = 1;
UPDATE schools SET code = 'BDCS', status = 'active' WHERE id = 2;




