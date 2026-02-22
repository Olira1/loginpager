// Parent Controller
// Handles viewing children's grades and reports

const { pool } = require('../config/db');

// Helper to verify parent-child relationship
const verifyParentChild = async (parentUserId, studentId) => {
  const [relations] = await pool.query(
    `SELECT sp.* FROM student_parents sp
     WHERE sp.parent_id = ? AND sp.student_id = ?`,
    [parentUserId, studentId]
  );
  return relations.length > 0;
};

// Helper to get child info
const getChildInfo = async (studentId) => {
  const [students] = await pool.query(
    `SELECT s.id, s.student_id_number as code, u.name, s.sex as gender,
            s.class_id, c.name as class_name, g.name as grade_name, g.id as grade_id,
            sc.name as school_name
     FROM students s
     JOIN users u ON s.user_id = u.id
     JOIN classes c ON s.class_id = c.id
     JOIN grades g ON c.grade_id = g.id
     JOIN schools sc ON g.school_id = sc.id
     WHERE s.id = ?`,
    [studentId]
  );
  return students.length > 0 ? students[0] : null;
};

// ==========================================
// LIST CHILDREN
// ==========================================

/**
 * GET /api/v1/parent/children
 * List all children linked to this parent
 */
const listChildren = async (req, res) => {
  try {
    const parentUserId = req.user.id;

    const [children] = await pool.query(
      `SELECT s.id as student_id, s.student_id_number as student_code,
              u.name, c.name as class_name, g.name as grade_name, sc.name as school_name
       FROM student_parents sp
       JOIN students s ON sp.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       JOIN schools sc ON g.school_id = sc.id
       WHERE sp.parent_id = ?
       ORDER BY u.name`,
      [parentUserId]
    );

    return res.status(200).json({
      success: true,
      data: { items: children },
      error: null
    });
  } catch (error) {
    console.error('List children error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch children.' }
    });
  }
};

// ==========================================
// VIEW CHILD'S SEMESTER REPORT
// ==========================================

/**
 * GET /api/v1/parent/children/:student_id/reports/semester
 * View child's semester report
 */
const getChildSemesterReport = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { semester_id, academic_year_id } = req.query;
    const parentUserId = req.user.id;

    // Verify parent-child relationship
    const isParent = await verifyParentChild(parentUserId, student_id);
    if (!isParent) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'This student is not linked to your account.' }
      });
    }

    const child = await getChildInfo(student_id);
    if (!child) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Student not found.' }
      });
    }

    const [semesterInfo] = await pool.query('SELECT name FROM semesters WHERE id = ?', [semester_id]);
    const [yearInfo] = await pool.query('SELECT name FROM academic_years WHERE id = ?', [academic_year_id]);

    // Check if results are published
    const [results] = await pool.query(
      `SELECT * FROM student_semester_results 
       WHERE student_id = ? AND semester_id = ? AND is_published = TRUE`,
      [student_id, semester_id]
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Report not yet published.' }
      });
    }

    const result = results[0];

    // Get subject scores (only submitted/approved subjects)
    const [subjects] = await pool.query(
      `SELECT s.name,
              SUM(m.score / m.max_score * COALESCE(aw.weight_percent, at.default_weight_percent)) as score
       FROM marks m
       JOIN teaching_assignments ta ON m.teaching_assignment_id = ta.id
       JOIN subjects s ON ta.subject_id = s.id
       JOIN assessment_types at ON m.assessment_type_id = at.id
       JOIN grade_submissions gs ON gs.teaching_assignment_id = ta.id AND gs.semester_id = m.semester_id
       LEFT JOIN assessment_weights aw ON aw.teaching_assignment_id = m.teaching_assignment_id 
                                       AND aw.assessment_type_id = m.assessment_type_id 
                                       AND aw.semester_id = m.semester_id
       WHERE m.student_id = ? AND m.semester_id = ? AND ta.class_id = ? AND gs.status IN ('submitted', 'approved')
       GROUP BY s.id, s.name
       ORDER BY s.name`,
      [student_id, semester_id, child.class_id]
    );

    // Get total students
    const [totalStudents] = await pool.query(
      'SELECT COUNT(*) as count FROM students WHERE class_id = ?',
      [child.class_id]
    );

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: child.id,
          code: child.code,
          name: child.name,
          class_name: child.class_name,
          grade_name: child.grade_name
        },
        semester: semesterInfo[0]?.name,
        academic_year: yearInfo[0]?.name,
        subjects: subjects.map(s => ({
          name: s.name,
          score: Math.round((parseFloat(s.score) || 0) * 100) / 100
        })),
        summary: {
          total: parseFloat(result.total_score) || 0,
          average: parseFloat(result.average_score) || 0,
          rank_in_class: result.rank_in_class,
          total_students: totalStudents[0].count,
          remark: result.remark
        },
        published_at: result.published_at
      },
      error: null
    });
  } catch (error) {
    console.error('Get child semester report error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch semester report.' }
    });
  }
};

// ==========================================
// VIEW CHILD'S SUBJECT GRADES
// ==========================================

/**
 * GET /api/v1/parent/children/:student_id/subjects/:subject_id/grades
 * View child's subject grade breakdown
 */
const getChildSubjectGrades = async (req, res) => {
  try {
    const { student_id, subject_id } = req.params;
    const { semester_id } = req.query;
    const parentUserId = req.user.id;

    // Verify parent-child relationship
    const isParent = await verifyParentChild(parentUserId, student_id);
    if (!isParent) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'This student is not linked to your account.' }
      });
    }

    const child = await getChildInfo(student_id);
    if (!child) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Student not found.' }
      });
    }

    const [subjectInfo] = await pool.query('SELECT id, name FROM subjects WHERE id = ?', [subject_id]);

    // Get teaching assignment
    const [assignments] = await pool.query(
      `SELECT ta.id, u.name as teacher_name
       FROM teaching_assignments ta
       JOIN users u ON ta.teacher_id = u.id
       WHERE ta.class_id = ? AND ta.subject_id = ?`,
      [child.class_id, subject_id]
    );

    if (assignments.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Subject not assigned to this class.' }
      });
    }

    // Get assessment scores
    const [assessments] = await pool.query(
      `SELECT at.name as type, m.score, m.max_score,
              COALESCE(aw.weight_percent, at.default_weight_percent) as weight_percent,
              (m.score / m.max_score * COALESCE(aw.weight_percent, at.default_weight_percent)) as weighted_score
       FROM marks m
       JOIN assessment_types at ON m.assessment_type_id = at.id
       LEFT JOIN assessment_weights aw ON aw.teaching_assignment_id = m.teaching_assignment_id 
                                       AND aw.assessment_type_id = m.assessment_type_id 
                                       AND aw.semester_id = m.semester_id
       WHERE m.student_id = ? AND m.teaching_assignment_id = ? AND m.semester_id = ?
       ORDER BY m.created_at`,
      [student_id, assignments[0].id, semester_id]
    );

    // parseFloat needed: MySQL DECIMAL values come back as strings
    const subjectTotal = assessments.reduce((sum, a) => sum + (parseFloat(a.score) || 0), 0);
    const subjectAverage = assessments.reduce((sum, a) => sum + (parseFloat(a.weighted_score) || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        student: { id: child.id, name: child.name },
        subject: subjectInfo[0],
        teacher: assignments[0]?.teacher_name || null,
        assessments: assessments.map(a => ({
          type: a.type,
          score: parseFloat(a.score) || 0,
          max_score: parseFloat(a.max_score) || 0,
          weight_percent: parseFloat(a.weight_percent) || 0,
          weighted_score: Math.round((parseFloat(a.weighted_score) || 0) * 100) / 100
        })),
        summary: {
          subject_total: Math.round(subjectTotal * 100) / 100,
          subject_average: Math.round(subjectAverage * 100) / 100
        }
      },
      error: null
    });
  } catch (error) {
    console.error('Get child subject grades error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch subject grades.' }
    });
  }
};

// ==========================================
// VIEW CHILD'S RANK
// ==========================================

/**
 * GET /api/v1/parent/children/:student_id/rank
 * View child's rank and comparison
 */
const getChildRank = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { semester_id, academic_year_id, type = 'semester' } = req.query;
    const parentUserId = req.user.id;

    // Verify parent-child relationship
    const isParent = await verifyParentChild(parentUserId, student_id);
    if (!isParent) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'This student is not linked to your account.' }
      });
    }

    const child = await getChildInfo(student_id);
    if (!child) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Student not found.' }
      });
    }

    const [semesterInfo] = await pool.query('SELECT name FROM semesters WHERE id = ?', [semester_id]);
    const [yearInfo] = await pool.query('SELECT name FROM academic_years WHERE id = ?', [academic_year_id]);

    // Get student's result
    const [results] = await pool.query(
      `SELECT * FROM student_semester_results WHERE student_id = ? AND semester_id = ?`,
      [student_id, semester_id]
    );

    // Get class statistics
    const [classStats] = await pool.query(
      `SELECT 
         AVG(ssr.average_score) as class_average,
         COUNT(*) as total_students
       FROM student_semester_results ssr
       JOIN students s ON ssr.student_id = s.id
       WHERE s.class_id = ? AND ssr.semester_id = ?`,
      [child.class_id, semester_id]
    );

    const studentResult = results[0] || {};
    const stats = classStats[0] || {};

    const classAverage = parseFloat(stats.class_average) || 0;
    const studentAverage = parseFloat(studentResult.average_score) || 0;

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: child.id,
          name: child.name,
          class_name: child.class_name
        },
        type: type,
        period: `${semesterInfo[0]?.name} ${yearInfo[0]?.name}`,
        rank: {
          position: studentResult.rank_in_class || null,
          total_students: stats.total_students || 0
        },
        scores: {
          total: parseFloat(studentResult.total_score) || 0,
          average: studentAverage
        },
        comparison: {
          class_average: Math.round(classAverage * 100) / 100,
          above_average: studentAverage > classAverage
        },
        remark: studentResult.remark || 'Pending'
      },
      error: null
    });
  } catch (error) {
    console.error('Get child rank error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch rank.' }
    });
  }
};

// ==========================================
// LIST CHILD'S SUBJECT SCORES
// ==========================================

/**
 * GET /api/v1/parent/children/:student_id/subjects/scores
 * List all subject scores for a child (works even without published report)
 */
const listChildSubjectScores = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { semester_id } = req.query;
    const parentUserId = req.user.id;

    // Verify parent-child relationship
    const isParent = await verifyParentChild(parentUserId, student_id);
    if (!isParent) {
      return res.status(403).json({
        success: false, data: null,
        error: { code: 'FORBIDDEN', message: 'This student is not linked to your account.' }
      });
    }

    const child = await getChildInfo(student_id);
    if (!child) {
      return res.status(404).json({
        success: false, data: null,
        error: { code: 'NOT_FOUND', message: 'Student not found.' }
      });
    }

    // Get all subjects with combined weighted scores from marks table
    const [subjects] = await pool.query(
      `SELECT s.id as subject_id, s.name,
              SUM(m.score / m.max_score * COALESCE(aw.weight_percent, at.default_weight_percent)) as score
       FROM marks m
       JOIN teaching_assignments ta ON m.teaching_assignment_id = ta.id
       JOIN subjects s ON ta.subject_id = s.id
       JOIN assessment_types at ON m.assessment_type_id = at.id
       LEFT JOIN assessment_weights aw ON aw.teaching_assignment_id = m.teaching_assignment_id
                                       AND aw.assessment_type_id = m.assessment_type_id
                                       AND aw.semester_id = m.semester_id
       WHERE m.student_id = ? AND m.semester_id = ? AND ta.class_id = ?
       GROUP BY s.id, s.name
       ORDER BY s.name`,
      [student_id, semester_id, child.class_id]
    );

    return res.status(200).json({
      success: true,
      data: {
        items: subjects.map(s => ({
          id: s.subject_id,
          name: s.name,
          score: Math.round((parseFloat(s.score) || 0) * 100) / 100
        }))
      },
      error: null
    });
  } catch (error) {
    console.error('List child subject scores error:', error);
    return res.status(500).json({
      success: false, data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch subject scores.' }
    });
  }
};

// ==========================================
// VIEW CHILD'S YEAR REPORT
// ==========================================

/**
 * GET /api/v1/parent/children/:student_id/reports/year
 * View child's combined year report
 */
const getChildYearReport = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { academic_year_id } = req.query;
    const parentUserId = req.user.id;

    // Verify parent-child relationship
    const isParent = await verifyParentChild(parentUserId, student_id);
    if (!isParent) {
      return res.status(403).json({
        success: false, data: null,
        error: { code: 'FORBIDDEN', message: 'This student is not linked to your account.' }
      });
    }

    const child = await getChildInfo(student_id);
    if (!child) {
      return res.status(404).json({
        success: false, data: null,
        error: { code: 'NOT_FOUND', message: 'Student not found.' }
      });
    }

    const [yearInfo] = await pool.query('SELECT name FROM academic_years WHERE id = ?', [academic_year_id]);

    // Get all semesters for this academic year
    const [semesters] = await pool.query(
      'SELECT id, name, semester_number FROM semesters WHERE academic_year_id = ? ORDER BY semester_number',
      [academic_year_id]
    );

    // Get semester results
    const semesterSummaries = [];
    for (const sem of semesters) {
      const [results] = await pool.query(
        `SELECT * FROM student_semester_results WHERE student_id = ? AND semester_id = ?`,
        [student_id, sem.id]
      );
      if (results.length > 0) {
        semesterSummaries.push({
          name: sem.name,
          total: parseFloat(results[0].total_score) || 0,
          average: parseFloat(results[0].average_score) || 0
        });
      }
    }

    // Get subject-wise breakdown across semesters
    const subjectMap = {};
    for (const sem of semesters) {
      const [subjects] = await pool.query(
        `SELECT s.name,
                SUM(m.score / m.max_score * COALESCE(aw.weight_percent, at.default_weight_percent)) as score
         FROM marks m
         JOIN teaching_assignments ta ON m.teaching_assignment_id = ta.id
         JOIN subjects s ON ta.subject_id = s.id
         JOIN assessment_types at ON m.assessment_type_id = at.id
         LEFT JOIN assessment_weights aw ON aw.teaching_assignment_id = m.teaching_assignment_id
                                         AND aw.assessment_type_id = m.assessment_type_id
                                         AND aw.semester_id = m.semester_id
         WHERE m.student_id = ? AND m.semester_id = ? AND ta.class_id = ?
         GROUP BY s.id, s.name
         ORDER BY s.name`,
        [student_id, sem.id, child.class_id]
      );

      for (const sub of subjects) {
        if (!subjectMap[sub.name]) {
          subjectMap[sub.name] = { name: sub.name };
        }
        const score = Math.round((parseFloat(sub.score) || 0) * 100) / 100;
        if (sem.semester_number === 1) subjectMap[sub.name].first_semester = score;
        else subjectMap[sub.name].second_semester = score;
      }
    }

    // Calculate year averages per subject
    const subjectsArray = Object.values(subjectMap).map(s => ({
      ...s,
      year_average: Math.round(((s.first_semester || 0) + (s.second_semester || 0)) / 2 * 100) / 100
    }));

    // Year summary
    const yearTotal = semesterSummaries.reduce((sum, s) => sum + s.total, 0);
    const yearAverage = semesterSummaries.length > 0
      ? semesterSummaries.reduce((sum, s) => sum + s.average, 0) / semesterSummaries.length
      : 0;

    // Get total students for rank context
    const [totalStudents] = await pool.query(
      'SELECT COUNT(*) as count FROM students WHERE class_id = ?',
      [child.class_id]
    );

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: child.id,
          name: child.name,
          class_name: child.class_name,
          grade_name: child.grade_name
        },
        academic_year: yearInfo[0]?.name,
        semesters: semesterSummaries,
        subjects: subjectsArray,
        summary: {
          year_total: Math.round(yearTotal * 100) / 100,
          year_average: Math.round(yearAverage * 100) / 100,
          total_students: totalStudents[0].count,
          remark: yearAverage >= 50 ? 'Promoted' : 'Not Promoted'
        }
      },
      error: null
    });
  } catch (error) {
    console.error('Get child year report error:', error);
    return res.status(500).json({
      success: false, data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch year report.' }
    });
  }
};

module.exports = {
  listChildren,
  getChildSemesterReport,
  getChildYearReport,
  listChildSubjectScores,
  getChildSubjectGrades,
  getChildRank
};



