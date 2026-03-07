-- Backfill student_enrollments for students missing enrollment records
-- Run this to ensure manually added students appear in Teacher/Class Head portals
-- Safe to run multiple times (uses INSERT ... ON DUPLICATE KEY / LEFT JOIN WHERE NULL)

INSERT INTO student_enrollments (
    student_id,
    academic_year_id,
    grade_id,
    class_id,
    status,
    entry_reason,
    is_current,
    started_at
)
SELECT
    s.id AS student_id,
    COALESCE(s.academic_year_id, c.academic_year_id) AS academic_year_id,
    c.grade_id AS grade_id,
    s.class_id AS class_id,
    'active' AS status,
    'correction' AS entry_reason,
    TRUE AS is_current,
    COALESCE(s.date_of_admission, CURDATE()) AS started_at
FROM students s
JOIN classes c ON c.id = s.class_id
LEFT JOIN student_enrollments se
    ON se.student_id = s.id
   AND se.academic_year_id = COALESCE(s.academic_year_id, c.academic_year_id)
WHERE COALESCE(s.academic_year_id, c.academic_year_id) IS NOT NULL
  AND se.id IS NULL;
