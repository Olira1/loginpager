-- =====================================================
-- SEED DATA FOR CLASS 10A - School 1 (Addis Ababa)
-- Run this AFTER the original seed.sql
-- =====================================================
-- This adds:
--   1 New Class Head for 10A (different from 9A's Berhanu)
--   2 New Teachers for 10A
--   10 Students for Class 10A
--   5 Parents
--   Teaching assignments (8 subjects)
--   Assessment weights for all subjects
-- =====================================================
-- Password for all users: "password123"
-- Hashed with bcrypt (10 rounds)
-- =====================================================

USE school_portal;

-- =====================================================
-- STEP 1: CREATE A NEW CLASS HEAD FOR 10A
-- (Not Berhanu who is 9A's class head)
-- =====================================================
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Ato Henok Gebremedhin', 'henok@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0960111111', 'class_head', 1);

-- Save the new class head's user_id
SET @class_head_10a = LAST_INSERT_ID();

-- =====================================================
-- STEP 2: CREATE 2 NEW TEACHERS FOR 10A
-- (Some existing teachers can also teach 10A via assignments)
-- =====================================================
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('W/ro Rahel Wondwossen', 'rahel@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0960222222', 'teacher', 1);
SET @teacher_rahel = LAST_INSERT_ID();

INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Ato Fikadu Lemma', 'fikadu@aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0960333333', 'teacher', 1);
SET @teacher_fikadu = LAST_INSERT_ID();

-- =====================================================
-- STEP 3: UPDATE CLASS 10A TO USE THE NEW CLASS HEAD
-- Class 10A = class_id 3 (from original seed)
-- =====================================================
UPDATE classes SET class_head_id = @class_head_10a WHERE id = 3;

-- =====================================================
-- STEP 4: CREATE 10 STUDENT USER ACCOUNTS FOR 10A
-- =====================================================
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Kidist Alemayehu', 'kidist.a@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0970111111', 'student', 1);
SET @stu1 = LAST_INSERT_ID();

INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Leul Bekele', 'leul.b@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0970222222', 'student', 1);
SET @stu2 = LAST_INSERT_ID();

INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Mahlet Desta', 'mahlet.d@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0970333333', 'student', 1);
SET @stu3 = LAST_INSERT_ID();

INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Natnael Eshetu', 'natnael.e@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0970444444', 'student', 1);
SET @stu4 = LAST_INSERT_ID();

INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Olana Teferi', 'olana.t@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0970555555', 'student', 1);
SET @stu5 = LAST_INSERT_ID();

INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Petros Girma', 'petros.g@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0970666666', 'student', 1);
SET @stu6 = LAST_INSERT_ID();

INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Ruth Hailu', 'ruth.h@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0970777777', 'student', 1);
SET @stu7 = LAST_INSERT_ID();

INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Samuel Tekle', 'samuel.t@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0970888888', 'student', 1);
SET @stu8 = LAST_INSERT_ID();

INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Tsion Abate', 'tsion.a@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0970999999', 'student', 1);
SET @stu9 = LAST_INSERT_ID();

INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Yared Worku', 'yared.w@student.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0971000000', 'student', 1);
SET @stu10 = LAST_INSERT_ID();

-- =====================================================
-- STEP 5: CREATE STUDENT RECORDS (Class 10A = class_id 3)
-- These are the bio-data rows in the students table
-- =====================================================
INSERT INTO students (user_id, class_id, student_id_number, date_of_birth, sex, date_of_admission) VALUES
(@stu1, 3, 'AASS-2017-011', '2008-01-20', 'Female', '2024-09-01');
SET @sid1 = LAST_INSERT_ID();

INSERT INTO students (user_id, class_id, student_id_number, date_of_birth, sex, date_of_admission) VALUES
(@stu2, 3, 'AASS-2017-012', '2008-05-14', 'Male', '2024-09-01');
SET @sid2 = LAST_INSERT_ID();

INSERT INTO students (user_id, class_id, student_id_number, date_of_birth, sex, date_of_admission) VALUES
(@stu3, 3, 'AASS-2017-013', '2008-09-03', 'Female', '2024-09-01');
SET @sid3 = LAST_INSERT_ID();

INSERT INTO students (user_id, class_id, student_id_number, date_of_birth, sex, date_of_admission) VALUES
(@stu4, 3, 'AASS-2017-014', '2008-02-28', 'Male', '2024-09-01');
SET @sid4 = LAST_INSERT_ID();

INSERT INTO students (user_id, class_id, student_id_number, date_of_birth, sex, date_of_admission) VALUES
(@stu5, 3, 'AASS-2017-015', '2008-07-11', 'Male', '2024-09-01');
SET @sid5 = LAST_INSERT_ID();

INSERT INTO students (user_id, class_id, student_id_number, date_of_birth, sex, date_of_admission) VALUES
(@stu6, 3, 'AASS-2017-016', '2008-11-19', 'Male', '2024-09-01');
SET @sid6 = LAST_INSERT_ID();

INSERT INTO students (user_id, class_id, student_id_number, date_of_birth, sex, date_of_admission) VALUES
(@stu7, 3, 'AASS-2017-017', '2008-04-07', 'Female', '2024-09-01');
SET @sid7 = LAST_INSERT_ID();

INSERT INTO students (user_id, class_id, student_id_number, date_of_birth, sex, date_of_admission) VALUES
(@stu8, 3, 'AASS-2017-018', '2008-08-25', 'Male', '2024-09-01');
SET @sid8 = LAST_INSERT_ID();

INSERT INTO students (user_id, class_id, student_id_number, date_of_birth, sex, date_of_admission) VALUES
(@stu9, 3, 'AASS-2017-019', '2008-06-13', 'Female', '2024-09-01');
SET @sid9 = LAST_INSERT_ID();

INSERT INTO students (user_id, class_id, student_id_number, date_of_birth, sex, date_of_admission) VALUES
(@stu10, 3, 'AASS-2017-020', '2008-10-30', 'Male', '2024-09-01');
SET @sid10 = LAST_INSERT_ID();

-- =====================================================
-- STEP 6: CREATE 5 PARENT ACCOUNTS
-- =====================================================
INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Ato Alemayehu Tadesse', 'alemayehu.t@parent.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0980111111', 'parent', 1);
SET @parent1 = LAST_INSERT_ID();

INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('W/ro Selamawit Bekele', 'selamawit.b@parent.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0980222222', 'parent', 1);
SET @parent2 = LAST_INSERT_ID();

INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Ato Eshetu Worku', 'eshetu.w@parent.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0980333333', 'parent', 1);
SET @parent3 = LAST_INSERT_ID();

INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('W/ro Abebech Girma', 'abebech.g@parent.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0980444444', 'parent', 1);
SET @parent4 = LAST_INSERT_ID();

INSERT INTO users (name, email, password, phone, role, school_id) VALUES
('Ato Hailu Teferi', 'hailu.t@parent.aass.edu.et', '$2b$10$6firGXL4T6CS3dbFXEOPN.iHlrsyZkQ6H8EtkNGECakmSpd75b.ZK', '0980555555', 'parent', 1);
SET @parent5 = LAST_INSERT_ID();

-- =====================================================
-- STEP 7: LINK STUDENTS TO PARENTS
-- Some parents have 2 children (siblings in same school)
-- =====================================================
INSERT INTO student_parents (student_id, parent_id, relationship) VALUES
(@sid1, @parent1, 'Father'),    -- Kidist's father
(@sid2, @parent2, 'Mother'),    -- Leul's mother
(@sid3, @parent3, 'Father'),    -- Mahlet's father
(@sid4, @parent4, 'Mother'),    -- Natnael's mother
(@sid5, @parent1, 'Father'),    -- Olana's father (same as Kidist - siblings)
(@sid6, @parent2, 'Mother'),    -- Petros's mother (same as Leul - siblings)
(@sid7, @parent3, 'Father'),    -- Ruth's father (same as Mahlet - siblings)
(@sid8, @parent4, 'Mother'),    -- Samuel's mother
(@sid9, @parent5, 'Father'),    -- Tsion's father
(@sid10, @parent5, 'Father');   -- Yared's father (same as Tsion - siblings)

-- =====================================================
-- STEP 8: TEACHING ASSIGNMENTS FOR 10A
-- Class 10A = class_id 3
-- Academic year 2017 E.C = academic_year_id 3
-- Mix of new teachers + existing teachers from 9A
-- (A teacher can teach multiple classes)
-- =====================================================

-- Get existing teacher IDs from seed.sql
-- Tigist = 4, Dawit = 5, Sara = 6, Yohannes = 7, Meron = 8
-- New: Rahel = @teacher_rahel, Fikadu = @teacher_fikadu
-- New class head: Henok = @class_head_10a

-- Subject IDs for School 1:
-- 1=Mathematics, 2=Physics, 3=Chemistry, 4=Biology
-- 5=English, 6=Amharic, 7=History, 8=Geography

INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, academic_year_id) VALUES
(@teacher_rahel,    3, 1, 3),    -- Rahel teaches Mathematics in 10A
(@teacher_fikadu,   3, 2, 3),    -- Fikadu teaches Physics in 10A
(6,                 3, 3, 3),    -- Sara teaches Chemistry in 10A (also teaches 9A)
(7,                 3, 4, 3),    -- Yohannes teaches Biology in 10A (also teaches 9A)
(8,                 3, 5, 3),    -- Meron teaches English in 10A (also teaches 9A)
(@class_head_10a,   3, 6, 3),    -- Henok (class head) teaches Amharic in 10A
(@teacher_rahel,    3, 7, 3),    -- Rahel also teaches History in 10A
(@teacher_fikadu,   3, 8, 3);    -- Fikadu also teaches Geography in 10A

-- Save the first teaching_assignment_id for 10A
SET @ta_math_10a = LAST_INSERT_ID();
-- The 8 assignments will be: @ta_math_10a through @ta_math_10a+7

-- =====================================================
-- STEP 9: ASSESSMENT WEIGHTS FOR 10A TEACHERS
-- First Semester = semester_id 5
-- Assessment types (School 1):
--   1=Class Test, 2=Quiz, 3=Assignment,
--   4=Project, 5=Mid-Exam, 6=Final Exam
-- =====================================================

-- Mathematics weights (Rahel)
INSERT INTO assessment_weights (teaching_assignment_id, assessment_type_id, semester_id, weight_percent) VALUES
(@ta_math_10a, 1, 5, 10.00),
(@ta_math_10a, 2, 5, 10.00),
(@ta_math_10a, 3, 5, 10.00),
(@ta_math_10a, 4, 5, 10.00),
(@ta_math_10a, 5, 5, 20.00),
(@ta_math_10a, 6, 5, 40.00);

-- Physics weights (Fikadu)
INSERT INTO assessment_weights (teaching_assignment_id, assessment_type_id, semester_id, weight_percent) VALUES
(@ta_math_10a+1, 1, 5, 15.00),
(@ta_math_10a+1, 2, 5, 5.00),
(@ta_math_10a+1, 3, 5, 10.00),
(@ta_math_10a+1, 4, 5, 10.00),
(@ta_math_10a+1, 5, 5, 20.00),
(@ta_math_10a+1, 6, 5, 40.00);

-- Chemistry weights (Sara)
INSERT INTO assessment_weights (teaching_assignment_id, assessment_type_id, semester_id, weight_percent) VALUES
(@ta_math_10a+2, 1, 5, 10.00),
(@ta_math_10a+2, 2, 5, 10.00),
(@ta_math_10a+2, 3, 5, 10.00),
(@ta_math_10a+2, 4, 5, 10.00),
(@ta_math_10a+2, 5, 5, 20.00),
(@ta_math_10a+2, 6, 5, 40.00);

-- Biology weights (Yohannes)
INSERT INTO assessment_weights (teaching_assignment_id, assessment_type_id, semester_id, weight_percent) VALUES
(@ta_math_10a+3, 1, 5, 10.00),
(@ta_math_10a+3, 2, 5, 10.00),
(@ta_math_10a+3, 3, 5, 10.00),
(@ta_math_10a+3, 4, 5, 10.00),
(@ta_math_10a+3, 5, 5, 20.00),
(@ta_math_10a+3, 6, 5, 40.00);

-- English weights (Meron)
INSERT INTO assessment_weights (teaching_assignment_id, assessment_type_id, semester_id, weight_percent) VALUES
(@ta_math_10a+4, 1, 5, 10.00),
(@ta_math_10a+4, 2, 5, 10.00),
(@ta_math_10a+4, 3, 5, 10.00),
(@ta_math_10a+4, 4, 5, 10.00),
(@ta_math_10a+4, 5, 5, 20.00),
(@ta_math_10a+4, 6, 5, 40.00);

-- Amharic weights (Henok - class head)
INSERT INTO assessment_weights (teaching_assignment_id, assessment_type_id, semester_id, weight_percent) VALUES
(@ta_math_10a+5, 1, 5, 10.00),
(@ta_math_10a+5, 2, 5, 10.00),
(@ta_math_10a+5, 3, 5, 10.00),
(@ta_math_10a+5, 4, 5, 10.00),
(@ta_math_10a+5, 5, 5, 20.00),
(@ta_math_10a+5, 6, 5, 40.00);

-- History weights (Rahel)
INSERT INTO assessment_weights (teaching_assignment_id, assessment_type_id, semester_id, weight_percent) VALUES
(@ta_math_10a+6, 1, 5, 10.00),
(@ta_math_10a+6, 2, 5, 10.00),
(@ta_math_10a+6, 3, 5, 10.00),
(@ta_math_10a+6, 4, 5, 10.00),
(@ta_math_10a+6, 5, 5, 20.00),
(@ta_math_10a+6, 6, 5, 40.00);

-- Geography weights (Fikadu)
INSERT INTO assessment_weights (teaching_assignment_id, assessment_type_id, semester_id, weight_percent) VALUES
(@ta_math_10a+7, 1, 5, 15.00),
(@ta_math_10a+7, 2, 5, 5.00),
(@ta_math_10a+7, 3, 5, 10.00),
(@ta_math_10a+7, 4, 5, 10.00),
(@ta_math_10a+7, 5, 5, 20.00),
(@ta_math_10a+7, 6, 5, 40.00);

-- =====================================================
-- SEED DATA FOR 10A COMPLETE
-- =====================================================

-- Summary of what was added:
-- -------------------------------------------------------
-- NEW USERS:
--   Class Head:  Ato Henok Gebremedhin (henok@aass.edu.et)
--   Teacher:     W/ro Rahel Wondwossen (rahel@aass.edu.et)
--   Teacher:     Ato Fikadu Lemma      (fikadu@aass.edu.et)
--   10 Students: kidist.a, leul.b, mahlet.d, natnael.e,
--                olana.t, petros.g, ruth.h, samuel.t,
--                tsion.a, yared.w  @student.aass.edu.et
--   5 Parents:   alemayehu.t, selamawit.b, eshetu.w,
--                abebech.g, hailu.t  @parent.aass.edu.et
--
-- CLASS UPDATE:
--   Class 10A now has Henok as class head (was Berhanu)
--
-- TEACHING ASSIGNMENTS (8 subjects in 10A):
--   Mathematics  -> Rahel (new)
--   Physics      -> Fikadu (new)
--   Chemistry    -> Sara (shared with 9A)
--   Biology      -> Yohannes (shared with 9A)
--   English      -> Meron (shared with 9A)
--   Amharic      -> Henok (class head)
--   History      -> Rahel (new)
--   Geography    -> Fikadu (new)
--
-- ASSESSMENT WEIGHTS: Set for all 8 subjects, First Semester
--
-- -------------------------------------------------------
-- LOGIN CREDENTIALS FOR 10A TESTING
-- All passwords: password123
-- -------------------------------------------------------
-- Class Head:  henok@aass.edu.et
-- Teacher:     rahel@aass.edu.et
-- Teacher:     fikadu@aass.edu.et
-- Student:     kidist.a@student.aass.edu.et
-- Parent:      alemayehu.t@parent.aass.edu.et
--
-- Shared teachers (also teach 9A, same login):
--   sara@aass.edu.et (Chemistry)
--   yohannes@aass.edu.et (Biology)
--   meron@aass.edu.et (English)
-- -------------------------------------------------------
