-- Backfill student_enrollments for students who have student_semester_results
-- for an academic year but no enrollment record (fixes Registrar "missing published results" error)
-- Safe to run multiple times (INSERT IGNORE skips duplicates on unique_student_year_enrollment)

INSERT IGNORE INTO student_enrollments (
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
    sub.student_id,
    sub.academic_year_id,
    c.grade_id,
    sub.class_id,
    'active',
    'correction',
    FALSE,
    CURDATE()
FROM (
    SELECT ssr.student_id, sem.academic_year_id,
           MIN((SELECT ta.class_id FROM marks m
                JOIN teaching_assignments ta ON ta.id = m.teaching_assignment_id
                WHERE m.student_id = ssr.student_id AND m.semester_id = ssr.semester_id
                LIMIT 1)) AS class_id
    FROM student_semester_results ssr
    JOIN semesters sem ON sem.id = ssr.semester_id
    LEFT JOIN student_enrollments se ON se.student_id = ssr.student_id AND se.academic_year_id = sem.academic_year_id
    WHERE se.id IS NULL
    GROUP BY ssr.student_id, sem.academic_year_id
) sub
JOIN classes c ON c.id = sub.class_id AND c.academic_year_id = sub.academic_year_id
WHERE sub.class_id IS NOT NULL;
