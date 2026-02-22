-- =====================================================
-- SCHOOL PORTAL SEED DATA FOR TiDB CLOUD
-- Mock data for production testing
-- =====================================================
-- Password for all users: "password123"
-- =====================================================

USE test;

-- =====================================================
-- 1. ADMIN USER
-- =====================================================
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('System Admin', 'admin@schoolportal.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0911000000', 'admin', NULL);

-- =====================================================
-- 2. SCHOOLS
-- =====================================================
INSERT INTO schools (name, code, address, phone, email) VALUES
('Addis Ababa Secondary School', 'AASS', 'Bole, Addis Ababa', '0111234567', 'info@aass.edu.et'),
('Bahir Dar Comprehensive School', 'BDCS', 'Bahir Dar City', '0582201234', 'info@bdcs.edu.et');

-- =====================================================
-- 3. SCHOOL HEADS
-- =====================================================
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Ato Kebede Alemu', 'kebede@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0912111111', 'school_head', 1),
('Ato Tadesse Bekele', 'tadesse@bdcs.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0913222222', 'school_head', 2);

-- Update schools with their school heads
UPDATE schools SET school_head_id = 2 WHERE id = 1;
UPDATE schools SET school_head_id = 3 WHERE id = 2;

-- =====================================================
-- 4. ACADEMIC YEARS & SEMESTERS
-- =====================================================
INSERT INTO academic_years (name, start_date, end_date, is_current) VALUES
('2015 E.C', '2022-09-01', '2023-06-30', FALSE),
('2016 E.C', '2023-09-01', '2024-06-30', FALSE),
('2017 E.C', '2024-09-01', '2025-06-30', TRUE);

INSERT INTO semesters (academic_year_id, name, semester_number, start_date, end_date, is_current) VALUES
(1, 'First Semester', 1, '2022-09-01', '2023-01-31', FALSE),
(1, 'Second Semester', 2, '2023-02-01', '2023-06-30', FALSE),
(2, 'First Semester', 1, '2023-09-01', '2024-01-31', FALSE),
(2, 'Second Semester', 2, '2024-02-01', '2024-06-30', FALSE),
(3, 'First Semester', 1, '2024-09-01', '2025-01-31', TRUE),
(3, 'Second Semester', 2, '2025-02-01', '2025-06-30', FALSE);

-- =====================================================
-- 5. GRADES
-- =====================================================
INSERT INTO grades (school_id, level, name) VALUES
(1, 9, 'Grade 9'),
(1, 10, 'Grade 10'),
(1, 11, 'Grade 11'),
(1, 12, 'Grade 12'),
(2, 9, 'Grade 9'),
(2, 10, 'Grade 10'),
(2, 11, 'Grade 11'),
(2, 12, 'Grade 12');

-- =====================================================
-- 6. SUBJECTS
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
(1, 'Information Technology'),
(2, 'Mathematics'),
(2, 'Physics'),
(2, 'Chemistry'),
(2, 'Biology'),
(2, 'English'),
(2, 'Amharic'),
(2, 'History'),
(2, 'Geography');

-- =====================================================
-- 7. TEACHERS & CLASS HEADS
-- =====================================================
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('W/ro Tigist Haile', 'tigist@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0914333333', 'teacher', 1),
('Ato Dawit Mengistu', 'dawit@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0915444444', 'teacher', 1),
('W/ro Sara Tesfaye', 'sara@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0916555555', 'teacher', 1),
('Ato Yohannes Girma', 'yohannes@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0917666666', 'teacher', 1),
('W/ro Meron Abebe', 'meron@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0918777777', 'teacher', 1),
('Ato Henok Tadesse', 'henok@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0919888888', 'class_head', 1),
('W/ro Hiwot Desta', 'hiwot@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0920999999', 'class_head', 1),
('Ato Solomon Hailu', 'solomon@bdcs.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0921111000', 'teacher', 2),
('W/ro Bethlehem Asefa', 'bethlehem@bdcs.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0922222000', 'class_head', 2);

-- =====================================================
-- 8. CLASSES
-- =====================================================
INSERT INTO classes (grade_id, name, class_head_id, academic_year_id) VALUES
(1, '9A', 9, 3),
(1, '9B', 10, 3),
(2, '10A', 9, 3),
(2, '10B', 10, 3),
(3, '11A', 9, 3),
(4, '12A', 10, 3),
(5, '9A', 12, 3),
(6, '10A', 12, 3);

-- =====================================================
-- 9. STUDENTS
-- =====================================================
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Kidist Abebe', 'kidist.a@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0930111111', 'student', 1),
('Birtukan Tadesse', 'birtukan.t@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0930222222', 'student', 1),
('Chala Girma', 'chala.g@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0930333333', 'student', 1),
('Dagmawit Haile', 'dagmawit.h@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0930444444', 'student', 1),
('Eyob Mengistu', 'eyob.m@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0930555555', 'student', 1);

INSERT INTO students (user_id, class_id, student_id_number, date_of_birth, sex, date_of_admission) VALUES
(13, 1, 'AASS-2017-001', '2009-03-15', 'Male', '2024-09-01'),
(14, 1, 'AASS-2017-002', '2009-07-22', 'Female', '2024-09-01'),
(15, 1, 'AASS-2017-003', '2009-01-10', 'Male', '2024-09-01'),
(16, 1, 'AASS-2017-004', '2009-11-05', 'Female', '2024-09-01'),
(17, 1, 'AASS-2017-005', '2009-05-30', 'Male', '2024-09-01');

-- =====================================================
-- 10. PARENTS
-- =====================================================
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Ato Alemayehu Kebede', 'alemayehu.k@parent.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0941111111', 'parent', 1),
('W/ro Almaz Haile', 'almaz.h@parent.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0942222222', 'parent', 1);

INSERT INTO student_parents (student_id, parent_id, relationship) VALUES
(1, 18, 'Father'),
(2, 19, 'Mother');

-- =====================================================
-- 11. STORE HOUSE USER
-- =====================================================
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Ato Mulugeta Assefa', 'mulugeta@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0950111111', 'store_house', 1);

-- =====================================================
-- 12. ASSESSMENT TYPES
-- =====================================================
INSERT INTO assessment_types (school_id, name, default_weight_percent) VALUES
(1, 'Class Test', 10.00),
(1, 'Quiz', 10.00),
(1, 'Assignment', 10.00),
(1, 'Project', 10.00),
(1, 'Mid-Exam', 20.00),
(1, 'Final Exam', 40.00),
(2, 'Class Test', 15.00),
(2, 'Quiz', 10.00),
(2, 'Assignment', 5.00),
(2, 'Mid-Exam', 20.00),
(2, 'Final Exam', 50.00);

-- =====================================================
-- 13. TEACHING ASSIGNMENTS
-- =====================================================
INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, academic_year_id) VALUES
(4, 1, 1, 3),
(5, 1, 2, 3),
(6, 1, 3, 3),
(7, 1, 4, 3),
(8, 1, 5, 3),
(9, 1, 6, 3);

-- =====================================================
-- 14. PROMOTION CRITERIA
-- =====================================================
INSERT INTO promotion_criteria (name, passing_average, passing_per_subject, max_failing_subjects, is_active) VALUES
('Ethiopian Secondary Standard', 50.00, 40.00, 2, TRUE);

-- =====================================================
-- LOGIN CREDENTIALS FOR TESTING
-- =====================================================
-- All passwords: password123
--
-- Admin:        admin@schoolportal.edu.et
-- School Head:  kebede@aass.edu.et
-- Class Head:   henok@aass.edu.et
-- Teacher:      yohannes@aass.edu.et
-- Student:      kidist.a@student.aass.edu.et
-- Parent:       alemayehu.k@parent.aass.edu.et
-- Store House:  mulugeta@aass.edu.et
-- =====================================================
