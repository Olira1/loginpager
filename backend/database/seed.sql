-- =====================================================
-- SCHOOL PORTAL SEED DATA
-- Mock data for development and testing
-- =====================================================
-- Run this AFTER schema.sql
-- Password for all users: "password123"
-- Hashed with bcrypt (10 rounds)
-- =====================================================

USE school_portal;

-- =====================================================
-- 1. ADMIN USER (Platform-level, no school)
-- =====================================================
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('System Admin', 'admin@schoolportal.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0911000000', 'admin', NULL);

-- =====================================================
-- 2. SCHOOLS
-- Creating 2 schools for multi-school testing
-- =====================================================
INSERT INTO schools (name, address, phone, email) VALUES
('Addis Ababa Secondary School', 'Bole, Addis Ababa', '0111234567', 'info@aass.edu.et'),
('Bahir Dar Comprehensive School', 'Bahir Dar City', '0582201234', 'info@bdcs.edu.et');

-- =====================================================
-- 3. SCHOOL HEADS
-- One school head per school
-- =====================================================
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Ato Kebede Alemu', 'kebede@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0912111111', 'school_head', 1),
('Ato Tadesse Bekele', 'tadesse@bdcs.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0913222222', 'school_head', 2);

-- Update schools with their school heads
UPDATE schools SET school_head_id = 2 WHERE id = 1;
UPDATE schools SET school_head_id = 3 WHERE id = 2;

-- =====================================================
-- 4. ACADEMIC YEARS & SEMESTERS
-- Ethiopian Calendar years
-- =====================================================
INSERT INTO academic_years (name, start_date, end_date, is_current) VALUES
('2015 E.C', '2022-09-01', '2023-06-30', FALSE),
('2016 E.C', '2023-09-01', '2024-06-30', FALSE),
('2017 E.C', '2024-09-01', '2025-06-30', TRUE);

INSERT INTO semesters (academic_year_id, name, semester_number, start_date, end_date, is_current) VALUES
-- 2015 E.C semesters
(1, 'First Semester', 1, '2022-09-01', '2023-01-31', FALSE),
(1, 'Second Semester', 2, '2023-02-01', '2023-06-30', FALSE),
-- 2016 E.C semesters
(2, 'First Semester', 1, '2023-09-01', '2024-01-31', FALSE),
(2, 'Second Semester', 2, '2024-02-01', '2024-06-30', FALSE),
-- 2017 E.C semesters (current year)
(3, 'First Semester', 1, '2024-09-01', '2025-01-31', TRUE),
(3, 'Second Semester', 2, '2025-02-01', '2025-06-30', FALSE);

-- =====================================================
-- 5. GRADES (for School 1 - Addis Ababa)
-- Secondary school: Grades 9, 10, 11, 12
-- =====================================================
INSERT INTO grades (school_id, level, name) VALUES
(1, 9, 'Grade 9'),
(1, 10, 'Grade 10'),
(1, 11, 'Grade 11'),
(1, 12, 'Grade 12');

-- Grades for School 2
INSERT INTO grades (school_id, level, name) VALUES
(2, 9, 'Grade 9'),
(2, 10, 'Grade 10'),
(2, 11, 'Grade 11'),
(2, 12, 'Grade 12');

-- =====================================================
-- 6. SUBJECTS (for School 1)
-- Common Ethiopian secondary school subjects
-- =====================================================
INSERT INTO subjects (school_id, name) VALUES
(1, 'Mathematics'),
(1, 'Physics'),
(1, 'Chemistry'),
(1, 'Biology'),
(1, 'English'),
(1, 'Amharic'),
(1, 'History'),
(1, 'Geography'),
(1, 'Civics'),
(1, 'Information Technology');

-- Subjects for School 2
INSERT INTO subjects (school_id, name) VALUES
(2, 'Mathematics'),
(2, 'Physics'),
(2, 'Chemistry'),
(2, 'Biology'),
(2, 'English'),
(2, 'Amharic'),
(2, 'History'),
(2, 'Geography');

-- =====================================================
-- 7. TEACHERS (for School 1)
-- Including teachers who will be class heads
-- =====================================================
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
-- Teachers for School 1
('W/ro Tigist Haile', 'tigist@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0914333333', 'teacher', 1),
('Ato Dawit Mengistu', 'dawit@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0915444444', 'teacher', 1),
('W/ro Sara Tesfaye', 'sara@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0916555555', 'teacher', 1),
('Ato Yohannes Girma', 'yohannes@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0917666666', 'teacher', 1),
('W/ro Meron Abebe', 'meron@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0918777777', 'teacher', 1),
-- Class Heads (also teachers, but with class_head role)
('Ato Berhanu Tadesse', 'berhanu@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0919888888', 'class_head', 1),
('W/ro Hiwot Desta', 'hiwot@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0920999999', 'class_head', 1);

-- Teachers for School 2
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Ato Solomon Hailu', 'solomon@bdcs.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0921111000', 'teacher', 2),
('W/ro Bethlehem Asefa', 'bethlehem@bdcs.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0922222000', 'class_head', 2);

-- =====================================================
-- 8. CLASSES (for School 1, current academic year)
-- Each grade has 2 sections (A and B)
-- =====================================================
INSERT INTO classes (grade_id, name, class_head_id, academic_year_id) VALUES
-- Grade 9 classes
(1, '9A', 9, 3),   -- Class head: Berhanu (user_id 9)
(1, '9B', 10, 3),  -- Class head: Hiwot (user_id 10)
-- Grade 10 classes
(2, '10A', 9, 3),
(2, '10B', 10, 3),
-- Grade 11 classes
(3, '11A', 9, 3),
-- Grade 12 classes
(4, '12A', 10, 3);

-- Classes for School 2
INSERT INTO classes (grade_id, name, class_head_id, academic_year_id) VALUES
(5, '9A', 12, 3),  -- School 2, Grade 9A, class head: Bethlehem (user_id 12)
(6, '10A', 12, 3);

-- =====================================================
-- 9. STUDENTS (for School 1, Class 9A)
-- Creating 10 students for Grade 9A
-- =====================================================

-- First, create student user accounts
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Abebe Kebede', 'abebe.k@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0930111111', 'student', 1),
('Birtukan Tadesse', 'birtukan.t@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0930222222', 'student', 1),
('Chala Girma', 'chala.g@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0930333333', 'student', 1),
('Dagmawit Haile', 'dagmawit.h@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0930444444', 'student', 1),
('Eyob Mengistu', 'eyob.m@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0930555555', 'student', 1),
('Frehiwot Bekele', 'frehiwot.b@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0930666666', 'student', 1),
('Getachew Alemu', 'getachew.a@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0930777777', 'student', 1),
('Hanna Tesfaye', 'hanna.t@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0930888888', 'student', 1),
('Ibrahim Mohammed', 'ibrahim.m@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0930999999', 'student', 1),
('Jerusalem Desta', 'jerusalem.d@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0931000000', 'student', 1);

-- Now create student records with bio data (Class 9A = class_id 1)
INSERT INTO students (user_id, class_id, student_id_number, date_of_birth, sex, date_of_admission) VALUES
(13, 1, 'AASS-2017-001', '2009-03-15', 'Male', '2024-09-01'),
(14, 1, 'AASS-2017-002', '2009-07-22', 'Female', '2024-09-01'),
(15, 1, 'AASS-2017-003', '2009-01-10', 'Male', '2024-09-01'),
(16, 1, 'AASS-2017-004', '2009-11-05', 'Female', '2024-09-01'),
(17, 1, 'AASS-2017-005', '2009-05-30', 'Male', '2024-09-01'),
(18, 1, 'AASS-2017-006', '2009-09-18', 'Female', '2024-09-01'),
(19, 1, 'AASS-2017-007', '2009-02-25', 'Male', '2024-09-01'),
(20, 1, 'AASS-2017-008', '2009-08-12', 'Female', '2024-09-01'),
(21, 1, 'AASS-2017-009', '2009-04-08', 'Male', '2024-09-01'),
(22, 1, 'AASS-2017-010', '2009-12-20', 'Female', '2024-09-01');

-- =====================================================
-- 10. PARENTS (for students)
-- =====================================================
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Ato Kebede Desta', 'kebede.d@parent.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0941111111', 'parent', 1),
('W/ro Almaz Haile', 'almaz.h@parent.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0942222222', 'parent', 1),
('Ato Tadesse Girma', 'tadesse.g@parent.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0943333333', 'parent', 1),
('W/ro Tigist Mengistu', 'tigist.m@parent.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0944444444', 'parent', 1),
('Ato Mohammed Ali', 'mohammed.a@parent.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0945555555', 'parent', 1);

-- Link students to parents
INSERT INTO student_parents (student_id, parent_id, relationship) VALUES
(1, 23, 'Father'),   -- Abebe's father
(2, 24, 'Mother'),   -- Birtukan's mother
(3, 25, 'Father'),   -- Chala's father
(4, 26, 'Mother'),   -- Dagmawit's mother
(5, 23, 'Father'),   -- Eyob's father (same as Abebe - siblings)
(6, 24, 'Mother'),   -- Frehiwot's mother
(7, 25, 'Father'),   -- Getachew's father
(8, 26, 'Mother'),   -- Hanna's mother
(9, 27, 'Father'),   -- Ibrahim's father
(10, 27, 'Father');  -- Jerusalem's father

-- =====================================================
-- 11. STORE HOUSE USER (for School 1)
-- =====================================================
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Ato Mulugeta Assefa', 'mulugeta@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0950111111', 'store_house', 1);

-- =====================================================
-- 12. ASSESSMENT TYPES (for School 1)
-- School Head defines these with default weights
-- =====================================================
INSERT INTO assessment_types (school_id, name, default_weight_percent) VALUES
(1, 'Class Test', 10.00),
(1, 'Quiz', 10.00),
(1, 'Assignment', 10.00),
(1, 'Project', 10.00),
(1, 'Mid-Exam', 20.00),
(1, 'Final Exam', 40.00);

-- Assessment types for School 2
INSERT INTO assessment_types (school_id, name, default_weight_percent) VALUES
(2, 'Class Test', 15.00),
(2, 'Quiz', 10.00),
(2, 'Assignment', 5.00),
(2, 'Mid-Exam', 20.00),
(2, 'Final Exam', 50.00);

-- =====================================================
-- 13. TEACHING ASSIGNMENTS (for School 1, Class 9A)
-- Assign teachers to subjects in Class 9A
-- =====================================================
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, academic_year_id) VALUES
-- Class 9A (class_id = 1) teaching assignments
(4, 1, 1, 3),   -- Tigist teaches Mathematics in 9A
(5, 1, 2, 3),   -- Dawit teaches Physics in 9A
(6, 1, 3, 3),   -- Sara teaches Chemistry in 9A
(7, 1, 4, 3),   -- Yohannes teaches Biology in 9A
(8, 1, 5, 3),   -- Meron teaches English in 9A
(9, 1, 6, 3),   -- Berhanu (class head) teaches Amharic in 9A
(4, 1, 7, 3),   -- Tigist also teaches History in 9A
(5, 1, 8, 3);   -- Dawit also teaches Geography in 9A

-- =====================================================
-- 14. ASSESSMENT WEIGHTS (Teachers set their weights)
-- Using current semester (semester_id = 5 for 2017 E.C First Semester)
-- =====================================================
INSERT INTO assessment_weights (teaching_assignment_id, assessment_type_id, semester_id, weight_percent) VALUES
-- Mathematics (teaching_assignment_id = 1) weights
(1, 1, 5, 10.00),  -- Class Test 10%
(1, 2, 5, 10.00),  -- Quiz 10%
(1, 3, 5, 10.00),  -- Assignment 10%
(1, 4, 5, 10.00),  -- Project 10%
(1, 5, 5, 20.00),  -- Mid-Exam 20%
(1, 6, 5, 40.00),  -- Final Exam 40%
-- Physics (teaching_assignment_id = 2) weights
(2, 1, 5, 15.00),  -- Class Test 15%
(2, 2, 5, 5.00),   -- Quiz 5%
(2, 3, 5, 10.00),  -- Assignment 10%
(2, 4, 5, 10.00),  -- Project 10%
(2, 5, 5, 20.00),  -- Mid-Exam 20%
(2, 6, 5, 40.00);  -- Final Exam 40%

-- =====================================================
-- 15. SAMPLE MARKS (for students in Class 9A)
-- Mathematics marks for first 5 students
-- =====================================================
INSERT INTO marks (student_id, teaching_assignment_id, assessment_type_id, semester_id, score, max_score) VALUES
-- Student 1 (Abebe) - Mathematics
(1, 1, 1, 5, 8.5, 10),   -- Class Test: 8.5/10
(1, 1, 2, 5, 9.0, 10),   -- Quiz: 9/10
(1, 1, 3, 5, 8.0, 10),   -- Assignment: 8/10
(1, 1, 4, 5, 8.5, 10),   -- Project: 8.5/10
(1, 1, 5, 5, 17.0, 20),  -- Mid-Exam: 17/20
(1, 1, 6, 5, 35.0, 40),  -- Final Exam: 35/40
-- Student 2 (Birtukan) - Mathematics
(2, 1, 1, 5, 9.0, 10),
(2, 1, 2, 5, 8.5, 10),
(2, 1, 3, 5, 9.0, 10),
(2, 1, 4, 5, 9.5, 10),
(2, 1, 5, 5, 18.0, 20),
(2, 1, 6, 5, 38.0, 40),
-- Student 3 (Chala) - Mathematics
(3, 1, 1, 5, 7.0, 10),
(3, 1, 2, 5, 6.5, 10),
(3, 1, 3, 5, 7.5, 10),
(3, 1, 4, 5, 7.0, 10),
(3, 1, 5, 5, 14.0, 20),
(3, 1, 6, 5, 28.0, 40),
-- Student 4 (Dagmawit) - Mathematics
(4, 1, 1, 5, 9.5, 10),
(4, 1, 2, 5, 9.0, 10),
(4, 1, 3, 5, 9.5, 10),
(4, 1, 4, 5, 10.0, 10),
(4, 1, 5, 5, 19.0, 20),
(4, 1, 6, 5, 39.0, 40),
-- Student 5 (Eyob) - Mathematics
(5, 1, 1, 5, 6.0, 10),
(5, 1, 2, 5, 5.5, 10),
(5, 1, 3, 5, 6.0, 10),
(5, 1, 4, 5, 5.0, 10),
(5, 1, 5, 5, 12.0, 20),
(5, 1, 6, 5, 24.0, 40);

-- Physics marks for same students
INSERT INTO marks (student_id, teaching_assignment_id, assessment_type_id, semester_id, score, max_score) VALUES
-- Student 1 (Abebe) - Physics
(1, 2, 1, 5, 12.0, 15),
(1, 2, 2, 5, 4.0, 5),
(1, 2, 3, 5, 8.0, 10),
(1, 2, 4, 5, 9.0, 10),
(1, 2, 5, 5, 16.0, 20),
(1, 2, 6, 5, 32.0, 40),
-- Student 2 (Birtukan) - Physics
(2, 2, 1, 5, 14.0, 15),
(2, 2, 2, 5, 5.0, 5),
(2, 2, 3, 5, 9.0, 10),
(2, 2, 4, 5, 8.0, 10),
(2, 2, 5, 5, 18.0, 20),
(2, 2, 6, 5, 36.0, 40);

-- =====================================================
-- 16. PROMOTION CRITERIA (Admin defines)
-- =====================================================
INSERT INTO promotion_criteria (name, passing_average, passing_per_subject, max_failing_subjects, is_active) VALUES
('Ethiopian Secondary Standard', 50.00, 40.00, 2, TRUE);

-- =====================================================
-- SEED DATA COMPLETE
-- =====================================================

-- Summary of seeded data:
-- - 1 Admin
-- - 2 Schools
-- - 2 School Heads
-- - 9 Teachers (including 3 Class Heads)
-- - 10 Students (in School 1, Class 9A)
-- - 5 Parents
-- - 1 Store House user
-- - 3 Academic Years (2015, 2016, 2017 E.C)
-- - 6 Semesters
-- - 8 Grades (4 per school)
-- - 8 Classes
-- - 18 Subjects (10 + 8)
-- - 6 Assessment Types per school
-- - 8 Teaching Assignments
-- - Sample marks for 5 students in 2 subjects
-- - 1 Promotion Criteria

-- =====================================================
-- LOGIN CREDENTIALS FOR TESTING
-- =====================================================
-- All passwords: password123
--
-- Admin:        admin@schoolportal.edu.et
-- School Head:  kebede@aass.edu.et (School 1)
-- Teacher:      tigist@aass.edu.et, dawit@aass.edu.et
-- Class Head:   berhanu@aass.edu.et, hiwot@aass.edu.et
-- Student:      abebe.k@student.aass.edu.et
-- Parent:       kebede.d@parent.aass.edu.et
-- Store House:  mulugeta@aass.edu.et
-- =====================================================




