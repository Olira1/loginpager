// Class Head Controller
// Handles class-specific operations: view students, review grades, compile, publish, roster
// Class Head also inherits all Teacher endpoints

const { pool } = require('../config/db');
const { resolveReadableClassContext } = require('../utils/scopeResolver');

// Helper to get class head's assigned classes (optionally filtered by academic year)
const getClassHeadClasses = async (userId, academicYearId = null) => {
  let query = `SELECT c.id, c.name, c.academic_year_id, g.name as grade_name, g.id as grade_id
     FROM classes c
     JOIN grades g ON c.grade_id = g.id
     WHERE c.class_head_id = ?`;
  const params = [userId];

  if (academicYearId) {
    query += ' AND c.academic_year_id = ?';
    params.push(academicYearId);
  }

  query += ' ORDER BY c.academic_year_id DESC, c.id ASC';
  const [classes] = await pool.query(query, params);
  return classes;
};

// Backward-compatible helper to get one class head class
const getClassHeadClass = async (userId, academicYearId = null) => {
  const classes = await getClassHeadClasses(userId, academicYearId);
  return classes.length > 0 ? classes[0] : null;
};

/**
 * GET /api/v1/class-head/scope?academic_year_id=X
 * Returns scope for the selected year: class_head | teacher | null
 * Used by frontend to switch portal (Teacher vs Class Head) based on year.
 */
const getScope = async (req, res) => {
  try {
    const { academic_year_id } = req.query;
    if (!academic_year_id) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'academic_year_id is required.' }
      });
    }

    const result = await resolveReadableClassContext(req.user.id, parseInt(academic_year_id, 10));
    return res.status(200).json({
      success: true,
      data: {
        scope: result.scope,
        class_info: result.classInfo ? { id: result.classInfo.id, name: result.classInfo.name, grade_name: result.classInfo.grade_name } : null
      },
      error: null
    });
  } catch (error) {
    console.error('Get scope error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get scope.' }
    });
  }
};

const listSemesters = async (req, res) => {
  try {
    const [yearScopes] = await pool.query(
      `SELECT DISTINCT c.academic_year_id
       FROM classes c
       WHERE c.class_head_id = ? AND c.academic_year_id IS NOT NULL
       UNION
       SELECT DISTINCT ta.academic_year_id
       FROM teaching_assignments ta
       WHERE ta.teacher_id = ? AND ta.academic_year_id IS NOT NULL`,
      [req.user.id, req.user.id]
    );

    if (yearScopes.length === 0) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned to any academic year.' }
      });
    }

    const yearIds = yearScopes.map((row) => row.academic_year_id);
    const [semesters] = await pool.query(
      `SELECT DISTINCT s.id, s.name, s.semester_number, s.academic_year_id, ay.name as academic_year_name, s.lifecycle_status
       FROM semesters s
       JOIN academic_years ay ON ay.id = s.academic_year_id
       WHERE s.academic_year_id IN (?)
       ORDER BY s.academic_year_id DESC, s.semester_number ASC, s.id ASC`,
      [yearIds]
    );

    return res.status(200).json({
      success: true,
      data: { items: semesters },
      error: null
    });
  } catch (error) {
    console.error('List class head semesters error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch semesters.' }
    });
  }
};

// Resolve a student's class/grade context for a requested academic year.
// Falls back to current student snapshot for backward compatibility.
const resolveStudentClassForYear = async (studentId, academicYearId = null) => {
  if (academicYearId) {
    const [rows] = await pool.query(
      `SELECT se.class_id, c.name as class_name, g.id as grade_id, g.name as grade_name
       FROM student_enrollments se
       JOIN classes c ON c.id = se.class_id
       JOIN grades g ON g.id = se.grade_id
       WHERE se.student_id = ? AND se.academic_year_id = ?
       ORDER BY se.id DESC
       LIMIT 1`,
      [studentId, academicYearId]
    );

    if (rows.length > 0) {
      return {
        class_id: rows[0].class_id,
        class_name: rows[0].class_name,
        grade_id: rows[0].grade_id,
        grade_name: rows[0].grade_name,
        source: 'enrollment'
      };
    }
  }

  const [fallback] = await pool.query(
    `SELECT s.class_id, c.name as class_name, g.id as grade_id, g.name as grade_name
     FROM students s
     JOIN classes c ON c.id = s.class_id
     JOIN grades g ON g.id = c.grade_id
     WHERE s.id = ?
     LIMIT 1`,
    [studentId]
  );
  if (fallback.length === 0) return null;

  return {
    class_id: fallback[0].class_id,
    class_name: fallback[0].class_name,
    grade_id: fallback[0].grade_id,
    grade_name: fallback[0].grade_name,
    source: 'current_student'
  };
};

const { getSchoolPassingThreshold } = require('../utils/promotionCriteria');

// Helper to determine promotion remark based on average
const getPromotionRemark = (average, passingAverage = 50) => {
  return average >= passingAverage ? 'Promoted' : 'Not Promoted';
};

// Build and persist semester results for all students in a class/year.
// This is reused by compile and publish to prevent missing ssr rows.
const buildAndPersistSemesterResults = async ({ classId, academicYearId, semesterId, schoolId }) => {
  const passingThreshold = await getSchoolPassingThreshold(schoolId);

  // Prefer enrollment scope (year-aware), fallback to current class snapshot.
  let [students] = await pool.query(
    `SELECT se.student_id
     FROM student_enrollments se
     WHERE se.class_id = ? AND se.academic_year_id = ?`,
    [classId, academicYearId]
  );
  if (students.length === 0) {
    [students] = await pool.query(
      'SELECT id as student_id FROM students WHERE class_id = ?',
      [classId]
    );
  }

  const studentResults = [];
  for (const student of students) {
    const [scores] = await pool.query(
      `SELECT SUM(m.score / m.max_score * COALESCE(aw.weight_percent, at.default_weight_percent)) as subject_score
       FROM marks m
       JOIN teaching_assignments ta ON m.teaching_assignment_id = ta.id
       JOIN assessment_types at ON m.assessment_type_id = at.id
       JOIN grade_submissions gs ON gs.teaching_assignment_id = ta.id AND gs.semester_id = m.semester_id
       LEFT JOIN assessment_weights aw ON aw.teaching_assignment_id = m.teaching_assignment_id 
                                       AND aw.assessment_type_id = m.assessment_type_id 
                                       AND aw.semester_id = m.semester_id
       WHERE m.student_id = ? AND m.semester_id = ? AND ta.class_id = ? AND gs.status = 'approved'
       GROUP BY ta.subject_id`,
      [student.student_id, semesterId, classId]
    );

    const total = scores.reduce((sum, s) => sum + (parseFloat(s.subject_score) || 0), 0);
    const subjectsCount = scores.length;
    const average = subjectsCount > 0 ? total / subjectsCount : 0;

    studentResults.push({
      student_id: student.student_id,
      total: Math.round(total * 100) / 100,
      average: Math.round(average * 100) / 100
    });
  }

  // Keep ranking deterministic and consistent with compile endpoint.
  studentResults.sort((a, b) => b.total - a.total);
  studentResults.forEach((s, idx) => { s.rank = idx + 1; });

  for (const result of studentResults) {
    await pool.query(
      `INSERT INTO student_semester_results
       (student_id, semester_id, total_score, average_score, rank_in_class, remark)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       total_score = VALUES(total_score),
       average_score = VALUES(average_score),
       rank_in_class = VALUES(rank_in_class),
       remark = VALUES(remark)`,
      [
        result.student_id,
        semesterId,
        result.total,
        result.average,
        result.rank,
        getPromotionRemark(result.average, passingThreshold)
      ]
    );
  }

  const classAverage = studentResults.length > 0
    ? studentResults.reduce((sum, s) => sum + s.average, 0) / studentResults.length
    : 0;

  return { studentResults, classAverage: Math.round(classAverage * 100) / 100 };
};

// ==========================================
// VIEW STUDENTS IN CLASS
// ==========================================

/**
 * GET /api/v1/class-head/students
 * List all students in the class head's class
 */
const listStudents = async (req, res) => {
  try {
    const { search, academic_year_id } = req.query;
    const { classInfo } = await resolveReadableClassContext(req.user.id, academic_year_id || null);
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head or teacher for the selected academic year.' }
      });
    }

    let query = `
      SELECT s.id as student_id, s.student_id_number as student_code,
             u.name as full_name, s.sex as gender, u.phone,
             s.date_of_admission as enrollment_date,
             (SELECT up.phone FROM users up 
              JOIN student_parents sp ON up.id = sp.parent_id 
              WHERE sp.student_id = s.id LIMIT 1) as parent_contact
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.class_id = ?
    `;
    const params = [classInfo.id];

    if (search) {
      query += ' AND u.name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY u.name';

    const [students] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: {
        class: { id: classInfo.id, name: classInfo.name, grade_name: classInfo.grade_name },
        items: students
      },
      error: null
    });
  } catch (error) {
    console.error('List students error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch students.' }
    });
  }
};

// ==========================================
// SUBMISSION CHECKLIST
// ==========================================

/**
 * GET /api/v1/class-head/submissions/checklist
 * View subject submission status for the class
 */
const getSubmissionChecklist = async (req, res) => {
  try {
    const { semester_id, academic_year_id } = req.query;
    let targetAcademicYearId = academic_year_id || null;
    if (!targetAcademicYearId && semester_id) {
      const [semester] = await pool.query('SELECT academic_year_id FROM semesters WHERE id = ?', [semester_id]);
      targetAcademicYearId = semester[0]?.academic_year_id || null;
    }
    const { classInfo } = await resolveReadableClassContext(req.user.id, targetAcademicYearId);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head or teacher for the selected academic year.' }
      });
    }

    // Get semester info
    const [semesterInfo] = await pool.query('SELECT name FROM semesters WHERE id = ?', [semester_id]);

    // Get all teaching assignments for this class (filter by academic year for correctness)
    const [assignments] = await pool.query(
      `SELECT ta.id, ta.subject_id, s.name as subject_name,
              ta.teacher_id, u.name as teacher_name,
              (SELECT COUNT(*) FROM students st WHERE st.class_id = ta.class_id) as total_students
       FROM teaching_assignments ta
       JOIN subjects s ON ta.subject_id = s.id
       JOIN users u ON ta.teacher_id = u.id
       WHERE ta.class_id = ? AND ta.academic_year_id = ?`,
      [classInfo.id, classInfo.academic_year_id]
    );

    const subjects = [];
    let submittedCount = 0;

    for (const a of assignments) {
      // Check submission status
      const [submissions] = await pool.query(
        `SELECT id, status, submitted_at FROM grade_submissions 
         WHERE teaching_assignment_id = ? AND semester_id = ?`,
        [a.id, semester_id]
      );

      // Count graded students
      const [gradedCount] = await pool.query(
        `SELECT COUNT(DISTINCT student_id) as count FROM marks 
         WHERE teaching_assignment_id = ? AND semester_id = ?`,
        [a.id, semester_id]
      );

      const status = submissions.length > 0 ? submissions[0].status : 'pending';
      if (status === 'submitted' || status === 'approved') submittedCount++;

      subjects.push({
        subject_id: a.subject_id,
        subject_name: a.subject_name,
        teacher: { id: a.teacher_id, name: a.teacher_name },
        status: status,
        submission_id: submissions.length > 0 ? submissions[0].id : null,
        submitted_at: submissions.length > 0 ? submissions[0].submitted_at : null,
        students_graded: gradedCount[0].count,
        total_students: a.total_students
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        class: { id: classInfo.id, name: classInfo.name },
        semester: semesterInfo[0]?.name,
        total_subjects: assignments.length,
        submitted_count: submittedCount,
        pending_count: assignments.length - submittedCount,
        subjects: subjects
      },
      error: null
    });
  } catch (error) {
    console.error('Get submission checklist error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch submission checklist.' }
    });
  }
};

// ==========================================
// STUDENT RANKINGS
// ==========================================

/**
 * GET /api/v1/class-head/students/rankings
 * View computed averages and rankings
 */
const getStudentRankings = async (req, res) => {
  try {
    const { semester_id } = req.query;
    const [semester] = await pool.query('SELECT academic_year_id FROM semesters WHERE id = ?', [semester_id]);
    const { classInfo } = await resolveReadableClassContext(req.user.id, semester[0]?.academic_year_id || null);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head or teacher for the selected academic year.' }
      });
    }

    const [semesterInfo] = await pool.query('SELECT name, academic_year_id FROM semesters WHERE id = ?', [semester_id]);
    const academicYearId = semesterInfo[0]?.academic_year_id;

    const passingThreshold = await getSchoolPassingThreshold(req.user.school_id);

    // Use student_enrollments (same source as Registrar); fallback to students.class_id
    let [students] = await pool.query(
      `SELECT se.student_id, u.name as student_name
       FROM student_enrollments se
       JOIN students s ON s.id = se.student_id
       JOIN users u ON u.id = s.user_id
       WHERE se.class_id = ? AND se.academic_year_id = ?
       ORDER BY u.name`,
      [classInfo.id, academicYearId]
    );
    if (students.length === 0) {
      [students] = await pool.query(
        `SELECT s.id as student_id, u.name as student_name
         FROM students s
         JOIN users u ON s.user_id = u.id
         WHERE s.class_id = ?
         ORDER BY u.name`,
        [classInfo.id]
      );
    }

    // Calculate totals for each student
    const studentResults = [];
    for (const student of students) {
      // Get all subject scores for this student (only submitted/approved subjects)
      const [scores] = await pool.query(
        `SELECT ta.subject_id, 
                SUM(m.score / m.max_score * COALESCE(aw.weight_percent, at.default_weight_percent)) as weighted_score
         FROM marks m
         JOIN teaching_assignments ta ON m.teaching_assignment_id = ta.id
         JOIN assessment_types at ON m.assessment_type_id = at.id
         JOIN grade_submissions gs ON gs.teaching_assignment_id = ta.id AND gs.semester_id = m.semester_id
         LEFT JOIN assessment_weights aw ON aw.teaching_assignment_id = m.teaching_assignment_id 
                                         AND aw.assessment_type_id = m.assessment_type_id 
                                         AND aw.semester_id = m.semester_id
         WHERE m.student_id = ? AND m.semester_id = ? AND ta.class_id = ? AND gs.status IN ('submitted', 'approved')
         GROUP BY ta.subject_id`,
        [student.student_id, semester_id, classInfo.id]
      );

      // parseFloat needed: MySQL DECIMAL values come back as strings
      const total = scores.reduce((sum, s) => sum + (parseFloat(s.weighted_score) || 0), 0);
      const subjectsCount = scores.length;
      const average = subjectsCount > 0 ? total / subjectsCount : 0;

      studentResults.push({
        student_id: student.student_id,
        student_name: student.student_name,
        total: Math.round(total * 100) / 100,
        average: Math.round(average * 100) / 100,
        subjects_count: subjectsCount,
        remark: getPromotionRemark(average, passingThreshold)
      });
    }

    // Sort by total descending and assign ranks
    studentResults.sort((a, b) => b.total - a.total);
    studentResults.forEach((s, idx) => { s.rank = idx + 1; });

    // Calculate class average
    const totalAverages = studentResults.filter(s => s.average > 0);
    const classAverage = totalAverages.length > 0 
      ? totalAverages.reduce((sum, s) => sum + s.average, 0) / totalAverages.length 
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        class: { id: classInfo.id, name: classInfo.name },
        semester: semesterInfo[0]?.name,
        class_average: Math.round(classAverage * 100) / 100,
        items: studentResults
      },
      error: null
    });
  } catch (error) {
    console.error('Get student rankings error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to compute rankings.' }
    });
  }
};

// ==========================================
// REVIEW SUBMITTED GRADES
// ==========================================

/**
 * GET /api/v1/class-head/submissions/:submission_id/review
 * View submitted grades for review (combined scores only)
 */
const reviewSubmission = async (req, res) => {
  try {
    const { submission_id } = req.params;

    // Get submission details first
    const [submissions] = await pool.query(
      `SELECT gs.*, ta.subject_id, s.name as subject_name, 
              ta.teacher_id, u.name as teacher_name, ta.class_id
       FROM grade_submissions gs
       JOIN teaching_assignments ta ON gs.teaching_assignment_id = ta.id
       JOIN subjects s ON ta.subject_id = s.id
       JOIN users u ON ta.teacher_id = u.id
       WHERE gs.id = ?`,
      [submission_id]
    );

    if (submissions.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Submission not found.' }
      });
    }

    const submission = submissions[0];
    const userId = Number(req.user.id);

    // Verify user is class head for this submission's class, OR has a teaching assignment (can view)
    const [classCheck] = await pool.query(
      'SELECT class_head_id FROM classes WHERE id = ?',
      [submission.class_id]
    );
    const isClassHead = classCheck[0] && Number(classCheck[0].class_head_id) === userId;
    if (!isClassHead) {
      const [teacherCheck] = await pool.query(
        'SELECT 1 FROM teaching_assignments WHERE teacher_id = ? AND class_id = ? LIMIT 1',
        [userId, submission.class_id]
      );
      if (teacherCheck.length === 0) {
        return res.status(403).json({
          success: false,
          data: null,
          error: { code: 'FORBIDDEN', message: 'This submission is not for your class.' }
        });
      }
    }

    const classInfo = { id: submission.class_id };
    const semesterId = submission.semester_id;

    // Get school's promotion criteria for pass/fail threshold (School Head sets this)
    const passThreshold = await getSchoolPassingThreshold(req.user.school_id);

    // Get students with their combined subject scores (filter marks by submission's semester)
    const [students] = await pool.query(
      `SELECT s.id as student_id, u.name as student_name,
              SUM(m.score / m.max_score * COALESCE(aw.weight_percent, at.default_weight_percent)) as subject_score
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN marks m ON m.student_id = s.id AND m.teaching_assignment_id = ? AND m.semester_id = ?
       LEFT JOIN assessment_types at ON m.assessment_type_id = at.id
       LEFT JOIN assessment_weights aw ON aw.teaching_assignment_id = m.teaching_assignment_id 
                                       AND aw.assessment_type_id = m.assessment_type_id 
                                       AND aw.semester_id = m.semester_id
       WHERE s.class_id = ?
       GROUP BY s.id, u.name
       ORDER BY u.name`,
      [submission.teaching_assignment_id, semesterId, classInfo.id]
    );

    // Calculate statistics using promotion criteria's passing_per_subject
    const scores = students.map(s => parseFloat(s.subject_score) || 0).filter(s => s > 0);
    const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highest = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest = scores.length > 0 ? Math.min(...scores) : 0;
    const passCount = scores.filter(s => s >= passThreshold).length;
    const failCount = scores.filter(s => s < passThreshold).length;

    return res.status(200).json({
      success: true,
      data: {
        submission_id: parseInt(submission_id),
        subject: { id: submission.subject_id, name: submission.subject_name },
        teacher: { id: submission.teacher_id, name: submission.teacher_name },
        submitted_at: submission.submitted_at,
        status: submission.status,
        pass_threshold: passThreshold,
        students: students.map(s => {
          const score = Math.round((parseFloat(s.subject_score) || 0) * 100) / 100;
          const isPass = score >= passThreshold;
          return {
            student_id: s.student_id,
            student_name: s.student_name,
            subject_score: score,
            is_pass: isPass
          };
        }),
        class_statistics: {
          average: Math.round(average * 100) / 100,
          highest: Math.round(highest * 100) / 100,
          lowest: Math.round(lowest * 100) / 100,
          pass_count: passCount,
          fail_count: failCount
        }
      },
      error: null
    });
  } catch (error) {
    console.error('Review submission error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch submission for review.' }
    });
  }
};

/**
 * POST /api/v1/class-head/submissions/:submission_id/approve
 * Approve a submitted grade
 */
const approveSubmission = async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { remarks } = req.body;

    const [submissions] = await pool.query(
      `SELECT gs.*, ta.class_id FROM grade_submissions gs
       JOIN teaching_assignments ta ON gs.teaching_assignment_id = ta.id
       WHERE gs.id = ?`,
      [submission_id]
    );

    if (submissions.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Submission not found.' }
      });
    }

    const [classCheck] = await pool.query(
      'SELECT class_head_id FROM classes WHERE id = ?',
      [submissions[0].class_id]
    );
    if (!classCheck[0] || classCheck[0].class_head_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'This submission is not for your class.' }
      });
    }

    // Update submission status
    await pool.query(
      `UPDATE grade_submissions 
       SET status = 'approved', reviewed_at = NOW(), reviewed_by = ?, comments = ?
       WHERE id = ?`,
      [req.user.id, remarks || null, submission_id]
    );

    return res.status(200).json({
      success: true,
      data: {
        submission_id: parseInt(submission_id),
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: { id: req.user.id, name: req.user.name }
      },
      error: null
    });
  } catch (error) {
    console.error('Approve submission error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to approve submission.' }
    });
  }
};

/**
 * POST /api/v1/class-head/submissions/:submission_id/reject
 * Reject a submission (request revision)
 */
const rejectSubmission = async (req, res) => {
  try {
    const { submission_id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Reason is required for rejection.' }
      });
    }

    const [submissions] = await pool.query(
      `SELECT gs.*, ta.class_id FROM grade_submissions gs
       JOIN teaching_assignments ta ON gs.teaching_assignment_id = ta.id
       WHERE gs.id = ?`,
      [submission_id]
    );

    if (submissions.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Submission not found.' }
      });
    }

    const [classCheck] = await pool.query(
      'SELECT class_head_id FROM classes WHERE id = ?',
      [submissions[0].class_id]
    );
    if (!classCheck[0] || classCheck[0].class_head_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'This submission is not for your class.' }
      });
    }

    // Update submission status
    await pool.query(
      `UPDATE grade_submissions 
       SET status = 'rejected', reviewed_at = NOW(), reviewed_by = ?, comments = ?
       WHERE id = ?`,
      [req.user.id, reason, submission_id]
    );

    return res.status(200).json({
      success: true,
      data: {
        submission_id: parseInt(submission_id),
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        reason: reason
      },
      error: null
    });
  } catch (error) {
    console.error('Reject submission error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to reject submission.' }
    });
  }
};

// ==========================================
// COMPILE GRADES
// ==========================================

// Helper: check if all subjects are approved for the given class and semester(s)
const checkAllSubjectsApproved = async (classId, semesterIds) => {
  const ids = Array.isArray(semesterIds) ? semesterIds : [semesterIds];
  const unapproved = [];
  for (const semId of ids) {
    const [rows] = await pool.query(
      `SELECT ta.id, s.name as subject_name, COALESCE(gs.status, 'pending') as status
       FROM teaching_assignments ta
       JOIN subjects s ON ta.subject_id = s.id
       LEFT JOIN grade_submissions gs ON gs.teaching_assignment_id = ta.id AND gs.semester_id = ?
       WHERE ta.class_id = ?`,
      [semId, classId]
    );
    for (const r of rows) {
      if (r.status !== 'approved') {
        unapproved.push({ subject: r.subject_name, semester_id: semId, status: r.status });
      }
    }
  }
  return { allApproved: unapproved.length === 0, unapproved };
};

/**
 * POST /api/v1/class-head/compile-grades
 * Compile final grades (total, average, rank)
 */
const compileGrades = async (req, res) => {
  try {
    const { semester_id, academic_year_id } = req.body;
    const classInfo = await getClassHeadClass(req.user.id, academic_year_id || null);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head for the selected academic year.' }
      });
    }

    const { allApproved, unapproved } = await checkAllSubjectsApproved(classInfo.id, semester_id);
    if (!allApproved) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'SUBJECTS_NOT_APPROVED',
          message: 'All subjects must be approved first. Please approve all subject submissions in Review Submissions before compiling grades.'
        }
      });
    }

    const [semesterInfo] = await pool.query('SELECT name, academic_year_id FROM semesters WHERE id = ?', [semester_id]);
    const academicYearId = semesterInfo[0]?.academic_year_id || academic_year_id;

    const { studentResults, classAverage } = await buildAndPersistSemesterResults({
      classId: classInfo.id,
      academicYearId: academicYearId,
      semesterId: semester_id,
      schoolId: req.user.school_id
    });

    return res.status(200).json({
      success: true,
      data: {
        class_id: classInfo.id,
        class_name: classInfo.name,
        semester: semesterInfo[0]?.name,
        compilation_status: 'completed',
        total_students: studentResults.length,
        students_compiled: studentResults.length,
        class_average: classAverage,
        compiled_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Compile grades error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to compile grades.' }
    });
  }
};

// ==========================================
// CLASS SNAPSHOT
// ==========================================

/**
 * GET /api/v1/class-head/reports/class-snapshot
 * View class performance snapshot with combined scores
 */
const getClassSnapshot = async (req, res) => {
  try {
    const { semester_id, academic_year_id } = req.query;
    let targetAcademicYearId = academic_year_id || null;
    if (!targetAcademicYearId && semester_id) {
      const [semester] = await pool.query('SELECT academic_year_id FROM semesters WHERE id = ?', [semester_id]);
      targetAcademicYearId = semester[0]?.academic_year_id || null;
    }
    const { classInfo } = await resolveReadableClassContext(req.user.id, targetAcademicYearId);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head or teacher for the selected academic year.' }
      });
    }

    const [semesterInfo] = await pool.query('SELECT name, academic_year_id FROM semesters WHERE id = ?', [semester_id]);
    const semesterYearId = semesterInfo[0]?.academic_year_id || classInfo.academic_year_id;

    // Get all subjects for this class (filter by academic year for correct marks)
    const [subjectsData] = await pool.query(
      `SELECT DISTINCT s.id, s.name FROM subjects s
       JOIN teaching_assignments ta ON ta.subject_id = s.id
       WHERE ta.class_id = ? AND ta.academic_year_id = ?
       ORDER BY s.name`,
      [classInfo.id, semesterYearId]
    );

    const subjectNames = subjectsData.map(s => s.name);

    // Get all students with their subject scores
    const [students] = await pool.query(
      `SELECT s.id as student_id, u.name as student_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.class_id = ?
       ORDER BY u.name`,
      [classInfo.id]
    );

    const items = [];
    for (const student of students) {
      const subjectScores = {};
      let total = 0;

      for (const subject of subjectsData) {
        // Get combined score for this subject (use ta.academic_year_id to ensure corrected marks from correct year)
        const [scores] = await pool.query(
          `SELECT SUM(m.score / m.max_score * COALESCE(aw.weight_percent, at.default_weight_percent)) as score
           FROM marks m
           JOIN teaching_assignments ta ON m.teaching_assignment_id = ta.id AND ta.academic_year_id = ?
           JOIN assessment_types at ON m.assessment_type_id = at.id
           LEFT JOIN assessment_weights aw ON aw.teaching_assignment_id = m.teaching_assignment_id 
                                           AND aw.assessment_type_id = m.assessment_type_id 
                                           AND aw.semester_id = m.semester_id
           WHERE m.student_id = ? AND m.semester_id = ? AND ta.subject_id = ?`,
          [semesterYearId, student.student_id, semester_id, subject.id]
        );

        const score = Math.round((parseFloat(scores[0]?.score) || 0) * 100) / 100;
        subjectScores[subject.name] = score;
        total += score;
      }

      const average = subjectsData.length > 0 ? total / subjectsData.length : 0;

      items.push({
        student_id: student.student_id,
        student_name: student.student_name,
        subject_scores: subjectScores,
        total: Math.round(total * 100) / 100,
        average: Math.round(average * 100) / 100
      });
    }

    // Sort by total and assign ranks
    items.sort((a, b) => b.total - a.total);
    items.forEach((item, idx) => { item.rank = idx + 1; });

    return res.status(200).json({
      success: true,
      data: {
        class: { id: classInfo.id, name: classInfo.name },
        semester: semesterInfo[0]?.name,
        subjects: subjectNames,
        items: items
      },
      error: null
    });
  } catch (error) {
    console.error('Get class snapshot error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get class snapshot.' }
    });
  }
};

// ==========================================
// PUBLISH RESULTS
// ==========================================

/**
 * POST /api/v1/class-head/publish/semester
 * Publish semester results
 */
const publishSemesterResults = async (req, res) => {
  try {
    const { semester_id, academic_year_id } = req.body;
    const classInfo = await getClassHeadClass(req.user.id, academic_year_id || null);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head for the selected academic year.' }
      });
    }

    const [semesterInfo] = await pool.query('SELECT name FROM semesters WHERE id = ?', [semester_id]);
    const [yearInfo] = await pool.query('SELECT name FROM academic_years WHERE id = ?', [academic_year_id]);

    const { allApproved } = await checkAllSubjectsApproved(classInfo.id, semester_id);
    if (!allApproved) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'SUBJECTS_NOT_APPROVED',
          message: 'All subjects must be approved first. Please approve all subject submissions in Review Submissions before publishing semester results.'
        }
      });
    }

    // Ensure semester rows exist before publishing (prevents missing ssr in registrar lifecycle).
    await buildAndPersistSemesterResults({
      classId: classInfo.id,
      academicYearId: academic_year_id,
      semesterId: semester_id,
      schoolId: req.user.school_id
    });

    // Use student_enrollments (same source as Registrar); fallback to students.class_id when enrollments missing
    let [updateResult] = await pool.query(
      `UPDATE student_semester_results ssr
       JOIN student_enrollments se ON se.student_id = ssr.student_id
         AND se.class_id = ? AND se.academic_year_id = ?
       SET ssr.is_published = TRUE, ssr.published_at = NOW()
       WHERE ssr.semester_id = ?`,
      [classInfo.id, academic_year_id, semester_id]
    );
    if (updateResult.affectedRows === 0) {
      [updateResult] = await pool.query(
        `UPDATE student_semester_results ssr
         JOIN students s ON ssr.student_id = s.id
         SET ssr.is_published = TRUE, ssr.published_at = NOW()
         WHERE s.class_id = ? AND ssr.semester_id = ?`,
        [classInfo.id, semester_id]
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        class_id: classInfo.id,
        class_name: classInfo.name,
        semester: semesterInfo[0]?.name,
        academic_year: yearInfo[0]?.name,
        students_published: updateResult.affectedRows,
        published_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Publish semester results error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to publish results.' }
    });
  }
};

/**
 * POST /api/v1/class-head/publish/year
 * Publish year results (combines both semesters)
 */
const publishYearResults = async (req, res) => {
  try {
    const { academic_year_id } = req.body;
    const yearId = academic_year_id != null ? parseInt(academic_year_id, 10) : NaN;
    if (!yearId || isNaN(yearId) || yearId < 1) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'academic_year_id is required and must be a valid ID.' }
      });
    }
    const classInfo = await getClassHeadClass(req.user.id, yearId);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head for the selected academic year.' }
      });
    }

    const [yearInfo] = await pool.query('SELECT name FROM academic_years WHERE id = ?', [yearId]);
    if (!yearInfo || yearInfo.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Academic year not found.' }
      });
    }

    // Get semesters for this academic year
    const [semesters] = await pool.query(
      'SELECT id, name FROM semesters WHERE academic_year_id = ? ORDER BY semester_number ASC, id ASC',
      [yearId]
    );

    const semesterNames = semesters.map(s => s.name);
    const semesterIds = semesters.map(s => s.id);

    const { allApproved } = await checkAllSubjectsApproved(classInfo.id, semesterIds);
    if (!allApproved) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'SUBJECTS_NOT_APPROVED',
          message: 'All subjects must be approved first. Please approve all subject submissions in Review Submissions for both semesters before publishing year results.'
        }
      });
    }

    // Use student_enrollments (same source as Registrar); fallback to students.class_id when enrollments missing
    let totalPublished = 0;
    for (const semester of semesters) {
      // Ensure compiled semester rows exist before publication.
      await buildAndPersistSemesterResults({
        classId: classInfo.id,
        academicYearId: yearId,
        semesterId: semester.id,
        schoolId: req.user.school_id
      });

      let [updateResult] = await pool.query(
        `UPDATE student_semester_results ssr
         JOIN student_enrollments se ON se.student_id = ssr.student_id
           AND se.class_id = ? AND se.academic_year_id = ?
         SET ssr.is_published = TRUE, ssr.published_at = NOW()
         WHERE ssr.semester_id = ? AND ssr.is_published = FALSE`,
        [classInfo.id, yearId, semester.id]
      );
      if (updateResult.affectedRows === 0) {
        [updateResult] = await pool.query(
          `UPDATE student_semester_results ssr
           JOIN students s ON ssr.student_id = s.id
           SET ssr.is_published = TRUE, ssr.published_at = NOW()
           WHERE s.class_id = ? AND ssr.semester_id = ? AND ssr.is_published = FALSE`,
          [classInfo.id, semester.id]
        );
      }
      totalPublished += updateResult.affectedRows;
    }

    // Count students enrolled in this class for this year (matches Registrar)
    const [studentCount] = await pool.query(
      'SELECT COUNT(DISTINCT student_id) as count FROM student_enrollments WHERE class_id = ? AND academic_year_id = ?',
      [classInfo.id, yearId]
    );

    return res.status(200).json({
      success: true,
      data: {
        class_id: classInfo.id,
        class_name: classInfo.name,
        academic_year: yearInfo[0]?.name,
        semesters_included: semesterNames,
        students_published: studentCount[0].count,
        published_at: new Date().toISOString(),
        sent_to_store_house: true
      },
      error: null
    });
  } catch (error) {
    console.error('Publish year results error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to publish year results.' }
    });
  }
};

/**
 * POST /api/v1/class-head/lock/semester
 * Lock semester lifecycle after publication/finalization
 */
const lockSemesterResults = async (req, res) => {
  try {
    const { semester_id, academic_year_id, reason = null } = req.body;
    const classInfo = await getClassHeadClass(req.user.id, academic_year_id || null);

    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head for the selected academic year.' }
      });
    }
    if (!semester_id || !academic_year_id) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'semester_id and academic_year_id are required.' }
      });
    }

    const [semesterRows] = await pool.query(
      'SELECT id, academic_year_id, lifecycle_status FROM semesters WHERE id = ?',
      [semester_id]
    );
    if (semesterRows.length === 0 || Number(semesterRows[0].academic_year_id) !== Number(academic_year_id)) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Semester not found in the provided academic year.' }
      });
    }

    await pool.query(
      `UPDATE semesters
       SET lifecycle_status = 'locked',
           locked_at = CURRENT_TIMESTAMP,
           locked_by = ?,
           lock_reason = ?
       WHERE id = ?`,
      [req.user.id, reason, semester_id]
    );

    return res.status(200).json({
      success: true,
      data: {
        semester_id: Number(semester_id),
        academic_year_id: Number(academic_year_id),
        lifecycle_status: 'locked',
        locked_at: new Date().toISOString(),
        locked_by: req.user.id,
        reason
      },
      error: null
    });
  } catch (error) {
    console.error('Lock semester results error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to lock semester results.' }
    });
  }
};

// ==========================================
// SEND ROSTER TO STORE HOUSE
// ==========================================

/**
 * POST /api/v1/class-head/store-house/send-roster
 * Send roster data to store house
 */
const sendRosterToStoreHouse = async (req, res) => {
  try {
    const { semester_id, academic_year_id } = req.body;
    const classInfo = await getClassHeadClass(req.user.id, academic_year_id || null);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head for the selected academic year.' }
      });
    }

    // Get semester's academic year for correct teaching assignments
    const [semRows] = await pool.query('SELECT academic_year_id FROM semesters WHERE id = ?', [semester_id]);
    const semesterYearId = semRows[0]?.academic_year_id || academic_year_id || classInfo.academic_year_id;

    const passingThreshold = await getSchoolPassingThreshold(req.user.school_id);

    // Get all subjects for this class (filter by academic year for correct marks)
    const [subjectsData] = await pool.query(
      `SELECT DISTINCT s.id, s.name FROM subjects s
       JOIN teaching_assignments ta ON ta.subject_id = s.id
       WHERE ta.class_id = ? AND ta.academic_year_id = ?
       ORDER BY s.name`,
      [classInfo.id, semesterYearId]
    );

    // Get all students with their scores
    const [students] = await pool.query(
      `SELECT s.id as student_id, u.name, s.sex, 
              TIMESTAMPDIFF(YEAR, s.date_of_birth, CURDATE()) as age
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.class_id = ?
       ORDER BY u.name`,
      [classInfo.id]
    );

    const rosterStudents = [];
    for (const student of students) {
      const subjectScores = {};
      let total = 0;

      for (const subject of subjectsData) {
        const [scores] = await pool.query(
          `SELECT SUM(m.score / m.max_score * COALESCE(aw.weight_percent, at.default_weight_percent)) as score
           FROM marks m
           JOIN teaching_assignments ta ON m.teaching_assignment_id = ta.id AND ta.academic_year_id = ?
           JOIN assessment_types at ON m.assessment_type_id = at.id
           LEFT JOIN assessment_weights aw ON aw.teaching_assignment_id = m.teaching_assignment_id 
                                           AND aw.assessment_type_id = m.assessment_type_id 
                                           AND aw.semester_id = m.semester_id
           WHERE m.student_id = ? AND m.semester_id = ? AND ta.subject_id = ?`,
          [semesterYearId, student.student_id, semester_id, subject.id]
        );

        const score = Math.round((parseFloat(scores[0]?.score) || 0) * 100) / 100;
        subjectScores[subject.name] = score;
        total += score;
      }

      const average = subjectsData.length > 0 ? total / subjectsData.length : 0;

      rosterStudents.push({
        student_id: student.student_id,
        name: student.name,
        sex: student.sex,
        age: student.age,
        semester: semester_id,
        subject_scores: subjectScores,
        total: Math.round(total * 100) / 100,
        average: Math.round(average * 100) / 100,
        absent_days: 0, // TODO: Implement attendance tracking
        conduct: 'Good',
        remark: getPromotionRemark(average, passingThreshold)
      });
    }

    // Sort and assign ranks
    rosterStudents.sort((a, b) => b.total - a.total);
    rosterStudents.forEach((s, idx) => { s.rank = idx + 1; });

    // Store roster in database (include pass_threshold for frontend avg Rmark calculation)
    const rosterData = {
      class_id: classInfo.id,
      class_name: classInfo.name,
      grade_name: classInfo.grade_name,
      class_head: { id: req.user.id, name: req.user.name, phone: req.user.phone },
      pass_threshold: passingThreshold,
      students: rosterStudents
    };

    await pool.query(
      `INSERT INTO rosters (class_id, semester_id, roster_data, submitted_by)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE roster_data = VALUES(roster_data), submitted_at = NOW()`,
      [classInfo.id, semester_id, JSON.stringify(rosterData), req.user.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        message: 'Roster sent to store house successfully',
        class_id: classInfo.id,
        class_name: classInfo.name,
        students_count: rosterStudents.length,
        sent_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Send roster error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send roster.' }
    });
  }
};

// ==========================================
// GENERATE STUDENT REPORT
// ==========================================

/**
 * GET /api/v1/class-head/reports/student/:student_id
 * Generate student report
 */
const getStudentReport = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { semester_id, academic_year_id, type = 'semester' } = req.query;
    const { classInfo } = await resolveReadableClassContext(req.user.id, academic_year_id || null);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head or teacher for the selected academic year.' }
      });
    }

    const studentClassContext = await resolveStudentClassForYear(student_id, academic_year_id);
    if (!studentClassContext) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Student not found.' }
      });
    }

    // Verify student is in this class (year-aware with fallback)
    if (Number(studentClassContext.class_id) !== Number(classInfo.id)) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Student not found in your class.' }
      });
    }

    const [studentData] = await pool.query(
      `SELECT s.id, s.student_id_number as code, u.name, s.sex as gender
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [student_id]
    );

    if (studentData.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Student not found in your class.' }
      });
    }

    const student = studentData[0];
    const [semesterInfo] = await pool.query('SELECT name FROM semesters WHERE id = ?', [semester_id]);
    const [yearInfo] = await pool.query('SELECT name FROM academic_years WHERE id = ?', [academic_year_id]);

    const passingThreshold = await getSchoolPassingThreshold(req.user.school_id);

    // Get subjects and scores (only subjects with submitted/approved grades)
    const [assignments] = await pool.query(
      `SELECT DISTINCT ta.id, s.name as subject_name, u.name as teacher_name
       FROM teaching_assignments ta
       JOIN subjects s ON ta.subject_id = s.id
       JOIN users u ON ta.teacher_id = u.id
       JOIN marks m ON m.teaching_assignment_id = ta.id AND m.student_id = ? AND m.semester_id = ?
       JOIN grade_submissions gs ON gs.teaching_assignment_id = ta.id AND gs.semester_id = ?
       WHERE ta.class_id = ? AND gs.status IN ('submitted', 'approved')`,
      [student_id, semester_id, semester_id, classInfo.id]
    );

    const subjects = [];
    let grandTotal = 0;

    for (const assignment of assignments) {
      // Get all assessment scores for this subject
      const [assessments] = await pool.query(
        `SELECT at.name as type, m.score, m.max_score
         FROM marks m
         JOIN assessment_types at ON m.assessment_type_id = at.id
         WHERE m.student_id = ? AND m.teaching_assignment_id = ? AND m.semester_id = ?`,
        [student_id, assignment.id, semester_id]
      );

      // Calculate subject total
      const [subjectScore] = await pool.query(
        `SELECT SUM(m.score / m.max_score * COALESCE(aw.weight_percent, at.default_weight_percent)) as total
         FROM marks m
         JOIN assessment_types at ON m.assessment_type_id = at.id
         LEFT JOIN assessment_weights aw ON aw.teaching_assignment_id = m.teaching_assignment_id 
                                         AND aw.assessment_type_id = m.assessment_type_id 
                                         AND aw.semester_id = m.semester_id
         WHERE m.student_id = ? AND m.teaching_assignment_id = ? AND m.semester_id = ?`,
        [student_id, assignment.id, semester_id]
      );

      const subjectTotal = Math.round((subjectScore[0]?.total || 0) * 100) / 100;
      grandTotal += subjectTotal;

      subjects.push({
        name: assignment.subject_name,
        assessments: assessments,
        subject_average: subjectTotal,
        teacher_name: assignment.teacher_name
      });
    }

    const average = subjects.length > 0 ? grandTotal / subjects.length : 0;

    // Get rank
    const [rankings] = await pool.query(
      `SELECT ssr.student_id, ssr.rank_in_class as rank FROM student_semester_results ssr
       JOIN students s ON ssr.student_id = s.id
       WHERE s.class_id = ? AND ssr.semester_id = ? AND ssr.student_id = ?`,
      [classInfo.id, semester_id, student_id]
    );

    const [totalStudents] = await pool.query(
      'SELECT COUNT(*) as count FROM students WHERE class_id = ?',
      [classInfo.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: student.id,
          code: student.code,
          name: student.name,
          gender: student.gender,
          class_name: studentClassContext.class_name,
          grade_name: studentClassContext.grade_name
        },
        report_type: type,
        semester: semesterInfo[0]?.name,
        academic_year: yearInfo[0]?.name,
        subjects: subjects,
        summary: {
          total: Math.round(grandTotal * 100) / 100,
          average: Math.round(average * 100) / 100,
          total_subjects: subjects.length,
          rank_in_class: rankings[0]?.rank || null,
          total_students: totalStudents[0].count,
          remark: getPromotionRemark(average, passingThreshold),
          pass_threshold: passingThreshold
        },
        generated_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Get student report error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate report.' }
    });
  }
};

module.exports = {
  getScope,
  listSemesters,
  listStudents,
  getSubmissionChecklist,
  getStudentRankings,
  reviewSubmission,
  approveSubmission,
  rejectSubmission,
  compileGrades,
  getClassSnapshot,
  publishSemesterResults,
  publishYearResults,
  lockSemesterResults,
  sendRosterToStoreHouse,
  getStudentReport
};

