// Class Head Controller
// Handles class-specific operations: view students, review grades, compile, publish, roster
// Class Head also inherits all Teacher endpoints

const { pool } = require('../config/db');

// Helper to get class head's assigned class
const getClassHeadClass = async (userId) => {
  const [classes] = await pool.query(
    `SELECT c.id, c.name, g.name as grade_name, g.id as grade_id
     FROM classes c
     JOIN grades g ON c.grade_id = g.id
     WHERE c.class_head_id = ?`,
    [userId]
  );
  return classes.length > 0 ? classes[0] : null;
};

// Helper to determine promotion remark based on average
const getPromotionRemark = (average, passingAverage = 50) => {
  return average >= passingAverage ? 'Promoted' : 'Not Promoted';
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
    const classInfo = await getClassHeadClass(req.user.id);
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head.' }
      });
    }

    const { search } = req.query;

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
    const { semester_id } = req.query;
    const classInfo = await getClassHeadClass(req.user.id);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head.' }
      });
    }

    // Get semester info
    const [semesterInfo] = await pool.query('SELECT name FROM semesters WHERE id = ?', [semester_id]);

    // Get all teaching assignments for this class
    const [assignments] = await pool.query(
      `SELECT ta.id, ta.subject_id, s.name as subject_name,
              ta.teacher_id, u.name as teacher_name,
              (SELECT COUNT(*) FROM students st WHERE st.class_id = ta.class_id) as total_students
       FROM teaching_assignments ta
       JOIN subjects s ON ta.subject_id = s.id
       JOIN users u ON ta.teacher_id = u.id
       WHERE ta.class_id = ?`,
      [classInfo.id]
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
    const classInfo = await getClassHeadClass(req.user.id);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head.' }
      });
    }

    const [semesterInfo] = await pool.query('SELECT name FROM semesters WHERE id = ?', [semester_id]);

    // Get all students
    const [students] = await pool.query(
      `SELECT s.id as student_id, u.name as student_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.class_id = ?
       ORDER BY u.name`,
      [classInfo.id]
    );

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
        remark: getPromotionRemark(average)
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
    const classInfo = await getClassHeadClass(req.user.id);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head.' }
      });
    }

    // Get submission details
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

    // Verify this submission is for class head's class
    if (submission.class_id !== classInfo.id) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'This submission is not for your class.' }
      });
    }

    // Get students with their combined subject scores
    const [students] = await pool.query(
      `SELECT s.id as student_id, u.name as student_name,
              SUM(m.score / m.max_score * COALESCE(aw.weight_percent, at.default_weight_percent)) as subject_score
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN marks m ON m.student_id = s.id AND m.teaching_assignment_id = ?
       LEFT JOIN assessment_types at ON m.assessment_type_id = at.id
       LEFT JOIN assessment_weights aw ON aw.teaching_assignment_id = m.teaching_assignment_id 
                                       AND aw.assessment_type_id = m.assessment_type_id 
                                       AND aw.semester_id = m.semester_id
       WHERE s.class_id = ?
       GROUP BY s.id, u.name
       ORDER BY u.name`,
      [submission.teaching_assignment_id, classInfo.id]
    );

    // Calculate statistics (parse to float since MySQL returns DECIMALs as strings)
    const scores = students.map(s => parseFloat(s.subject_score) || 0).filter(s => s > 0);
    const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highest = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest = scores.length > 0 ? Math.min(...scores) : 0;
    const passCount = scores.filter(s => s >= 50).length;
    const failCount = scores.filter(s => s < 50).length;

    return res.status(200).json({
      success: true,
      data: {
        submission_id: parseInt(submission_id),
        subject: { id: submission.subject_id, name: submission.subject_name },
        teacher: { id: submission.teacher_id, name: submission.teacher_name },
        submitted_at: submission.submitted_at,
        status: submission.status,
        students: students.map(s => ({
          student_id: s.student_id,
          student_name: s.student_name,
          subject_score: Math.round((parseFloat(s.subject_score) || 0) * 100) / 100
        })),
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
    const classInfo = await getClassHeadClass(req.user.id);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head.' }
      });
    }

    // Verify submission belongs to class
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

    if (submissions[0].class_id !== classInfo.id) {
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
    const classInfo = await getClassHeadClass(req.user.id);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head.' }
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Reason is required for rejection.' }
      });
    }

    // Verify submission belongs to class
    const [submissions] = await pool.query(
      `SELECT gs.*, ta.class_id FROM grade_submissions gs
       JOIN teaching_assignments ta ON gs.teaching_assignment_id = ta.id
       WHERE gs.id = ?`,
      [submission_id]
    );

    if (submissions.length === 0 || submissions[0].class_id !== classInfo.id) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Submission not found.' }
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

/**
 * POST /api/v1/class-head/compile-grades
 * Compile final grades (total, average, rank)
 */
const compileGrades = async (req, res) => {
  try {
    const { semester_id, academic_year_id } = req.body;
    const classInfo = await getClassHeadClass(req.user.id);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head.' }
      });
    }

    const [semesterInfo] = await pool.query('SELECT name FROM semesters WHERE id = ?', [semester_id]);

    // Get all students
    const [students] = await pool.query(
      'SELECT id as student_id FROM students WHERE class_id = ?',
      [classInfo.id]
    );

    // Calculate and store results for each student
    const studentResults = [];
    for (const student of students) {
      // Calculate total from all submitted/approved subjects
      const [scores] = await pool.query(
        `SELECT SUM(m.score / m.max_score * COALESCE(aw.weight_percent, at.default_weight_percent)) as subject_score
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
      const total = scores.reduce((sum, s) => sum + (parseFloat(s.subject_score) || 0), 0);
      const subjectsCount = scores.length;
      const average = subjectsCount > 0 ? total / subjectsCount : 0;

      studentResults.push({
        student_id: student.student_id,
        total: Math.round(total * 100) / 100,
        average: Math.round(average * 100) / 100,
        subjects_count: subjectsCount
      });
    }

    // Sort and assign ranks
    studentResults.sort((a, b) => b.total - a.total);
    studentResults.forEach((s, idx) => { s.rank = idx + 1; });

    // Store in student_semester_results table
    for (const result of studentResults) {
      await pool.query(
        `INSERT INTO student_semester_results 
         (student_id, semester_id, total_score, average_score, rank_in_class, remark)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         total_score = VALUES(total_score), average_score = VALUES(average_score), 
         rank_in_class = VALUES(rank_in_class), remark = VALUES(remark)`,
        [result.student_id, semester_id, result.total, result.average, result.rank, getPromotionRemark(result.average)]
      );
    }

    // Calculate class average
    const classAverage = studentResults.length > 0
      ? studentResults.reduce((sum, s) => sum + s.average, 0) / studentResults.length
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        class_id: classInfo.id,
        class_name: classInfo.name,
        semester: semesterInfo[0]?.name,
        compilation_status: 'completed',
        total_students: students.length,
        students_compiled: studentResults.length,
        class_average: Math.round(classAverage * 100) / 100,
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
    const { semester_id } = req.query;
    const classInfo = await getClassHeadClass(req.user.id);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head.' }
      });
    }

    const [semesterInfo] = await pool.query('SELECT name FROM semesters WHERE id = ?', [semester_id]);

    // Get all subjects for this class
    const [subjectsData] = await pool.query(
      `SELECT DISTINCT s.id, s.name FROM subjects s
       JOIN teaching_assignments ta ON ta.subject_id = s.id
       WHERE ta.class_id = ?
       ORDER BY s.name`,
      [classInfo.id]
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
        // Get combined score for this subject
        const [scores] = await pool.query(
          `SELECT SUM(m.score / m.max_score * COALESCE(aw.weight_percent, at.default_weight_percent)) as score
           FROM marks m
           JOIN teaching_assignments ta ON m.teaching_assignment_id = ta.id
           JOIN assessment_types at ON m.assessment_type_id = at.id
           LEFT JOIN assessment_weights aw ON aw.teaching_assignment_id = m.teaching_assignment_id 
                                           AND aw.assessment_type_id = m.assessment_type_id 
                                           AND aw.semester_id = m.semester_id
           WHERE m.student_id = ? AND m.semester_id = ? AND ta.subject_id = ?`,
          [student.student_id, semester_id, subject.id]
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
    const classInfo = await getClassHeadClass(req.user.id);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head.' }
      });
    }

    const [semesterInfo] = await pool.query('SELECT name FROM semesters WHERE id = ?', [semester_id]);
    const [yearInfo] = await pool.query('SELECT name FROM academic_years WHERE id = ?', [academic_year_id]);

    // Update results as published for students in this class
    const [updateResult] = await pool.query(
      `UPDATE student_semester_results ssr
       JOIN students s ON ssr.student_id = s.id
       SET ssr.is_published = TRUE, ssr.published_at = NOW()
       WHERE s.class_id = ? AND ssr.semester_id = ?`,
      [classInfo.id, semester_id]
    );

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
    const classInfo = await getClassHeadClass(req.user.id);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head.' }
      });
    }

    const [yearInfo] = await pool.query('SELECT name FROM academic_years WHERE id = ?', [academic_year_id]);

    // Get semesters for this academic year
    const [semesters] = await pool.query(
      'SELECT id, name FROM semesters WHERE academic_year_id = ? ORDER BY `order`',
      [academic_year_id]
    );

    const semesterNames = semesters.map(s => s.name);

    // Mark all semester results as published for this class
    let totalPublished = 0;
    for (const semester of semesters) {
      const [updateResult] = await pool.query(
        `UPDATE student_semester_results ssr
         JOIN students s ON ssr.student_id = s.id
         SET ssr.is_published = TRUE, ssr.published_at = NOW()
         WHERE s.class_id = ? AND ssr.semester_id = ? AND ssr.is_published = FALSE`,
        [classInfo.id, semester.id]
      );
      totalPublished += updateResult.affectedRows;
    }

    // Count total students
    const [studentCount] = await pool.query(
      'SELECT COUNT(*) as count FROM students WHERE class_id = ?',
      [classInfo.id]
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
    const classInfo = await getClassHeadClass(req.user.id);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head.' }
      });
    }

    // Get all subjects
    const [subjectsData] = await pool.query(
      `SELECT DISTINCT s.id, s.name FROM subjects s
       JOIN teaching_assignments ta ON ta.subject_id = s.id
       WHERE ta.class_id = ?
       ORDER BY s.name`,
      [classInfo.id]
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
           JOIN teaching_assignments ta ON m.teaching_assignment_id = ta.id
           JOIN assessment_types at ON m.assessment_type_id = at.id
           LEFT JOIN assessment_weights aw ON aw.teaching_assignment_id = m.teaching_assignment_id 
                                           AND aw.assessment_type_id = m.assessment_type_id 
                                           AND aw.semester_id = m.semester_id
           WHERE m.student_id = ? AND m.semester_id = ? AND ta.subject_id = ?`,
          [student.student_id, semester_id, subject.id]
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
        remark: getPromotionRemark(average)
      });
    }

    // Sort and assign ranks
    rosterStudents.sort((a, b) => b.total - a.total);
    rosterStudents.forEach((s, idx) => { s.rank = idx + 1; });

    // Store roster in database
    const rosterData = {
      class_id: classInfo.id,
      class_name: classInfo.name,
      grade_name: classInfo.grade_name,
      class_head: { id: req.user.id, name: req.user.name, phone: req.user.phone },
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
    const classInfo = await getClassHeadClass(req.user.id);
    
    if (!classInfo) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'You are not assigned as class head.' }
      });
    }

    // Verify student is in this class
    const [studentData] = await pool.query(
      `SELECT s.id, s.student_id_number as code, u.name, s.sex as gender
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ? AND s.class_id = ?`,
      [student_id, classInfo.id]
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
          class_name: classInfo.name,
          grade_name: classInfo.grade_name
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
          remark: getPromotionRemark(average)
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
  sendRosterToStoreHouse,
  getStudentReport
};

