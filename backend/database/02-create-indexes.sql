-- =====================================================
-- PART 2: CREATE INDEXES (Run this after tables are created)
-- =====================================================

USE test;

CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_marks_student ON marks(student_id);
CREATE INDEX idx_marks_semester ON marks(semester_id);
CREATE INDEX idx_teaching_assignments_teacher ON teaching_assignments(teacher_id);
CREATE INDEX idx_teaching_assignments_class ON teaching_assignments(class_id);
