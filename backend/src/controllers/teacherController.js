// Teacher Controller
// Handles assigned classes, subjects, student grades, and submissions
// All operations are scoped to the teacher's assignments

const { pool } = require('../config/db');

// Helper to get current semester
const getCurrentSemester = async () => {
  const [semesters] = await pool.query(
    'SELECT * FROM semesters WHERE is_current = true LIMIT 1'
  );
  return semesters.length > 0 ? semesters[0] : null;
};

// Helper to verify teacher is assigned to class/subject
const verifyTeachingAssignment = async (teacherId, classId, subjectId) => {
  const [assignments] = await pool.query(
    `SELECT ta.* FROM teaching_assignments ta
     WHERE ta.teacher_id = ? AND ta.class_id = ? AND ta.subject_id = ?`,
    [teacherId, classId, subjectId]
  );
  return assignments.length > 0 ? assignments[0] : null;
};

// ==========================================
// VIEW ASSIGNED CLASSES
// ==========================================

/**
 * GET /api/v1/teacher/classes
 * List classes assigned to this teacher
 */
const listAssignedClasses = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const [assignments] = await pool.query(
      `SELECT DISTINCT 
         c.id as class_id, c.name as class_name,
         g.id as grade_id, g.name as grade_name, g.level as grade_level,
         (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count
       FROM teaching_assignments ta
       JOIN classes c ON ta.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       WHERE ta.teacher_id = ?
       ORDER BY g.level, c.name`,
      [teacherId]
    );

    // Group subjects per class
    const classMap = new Map();
    for (const a of assignments) {
      if (!classMap.has(a.class_id)) {
        classMap.set(a.class_id, {
          class_id: a.class_id,
          class_name: a.class_name,
          grade: { id: a.grade_id, name: a.grade_name, level: a.grade_level },
          student_count: a.student_count,
          subjects: []
        });
      }
    }

    // Get subjects for each class
    for (const [classId, classData] of classMap) {
      const [subjects] = await pool.query(
        `SELECT s.id, s.name
         FROM teaching_assignments ta
         JOIN subjects s ON ta.subject_id = s.id
         WHERE ta.teacher_id = ? AND ta.class_id = ?`,
        [teacherId, classId]
      );
      classData.subjects = subjects;
    }

    return res.status(200).json({
      success: true,
      data: { items: Array.from(classMap.values()) },
      error: null
    });
  } catch (error) {
    console.error('List assigned classes error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch assigned classes.' }
    });
  }
};

// ==========================================
// VIEW ASSIGNED SUBJECTS
// ==========================================

/**
 * GET /api/v1/teacher/subjects
 * List subjects assigned to this teacher
 */
const listAssignedSubjects = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const [assignments] = await pool.query(
      `SELECT 
         s.id as subject_id, s.name as subject_name,
         c.id as class_id, c.name as class_name,
         g.name as grade_name
       FROM teaching_assignments ta
       JOIN subjects s ON ta.subject_id = s.id
       JOIN classes c ON ta.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       WHERE ta.teacher_id = ?
       ORDER BY s.name, g.level, c.name`,
      [teacherId]
    );

    // Group classes per subject
    const subjectMap = new Map();
    for (const a of assignments) {
      if (!subjectMap.has(a.subject_id)) {
        subjectMap.set(a.subject_id, {
          subject_id: a.subject_id,
          subject_name: a.subject_name,
          assigned_classes: [],
          total_students: 0
        });
      }
      subjectMap.get(a.subject_id).assigned_classes.push({
        class_id: a.class_id,
        class_name: a.class_name,
        grade_name: a.grade_name
      });
    }

    // Count total students per subject
    for (const [subjectId, subjectData] of subjectMap) {
      const classIds = subjectData.assigned_classes.map(c => c.class_id);
      if (classIds.length > 0) {
        const [counts] = await pool.query(
          `SELECT COUNT(*) as total FROM students WHERE class_id IN (?)`,
          [classIds]
        );
        subjectData.total_students = counts[0].total;
      }
    }

    return res.status(200).json({
      success: true,
      data: { items: Array.from(subjectMap.values()) },
      error: null
    });
  } catch (error) {
    console.error('List assigned subjects error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch assigned subjects.' }
    });
  }
};

// ==========================================
// ASSESSMENT WEIGHTS
// ==========================================

/**
 * GET /api/v1/teacher/assessment-weights/suggestions
 * Get suggested weights from school head
 * First checks weight_templates for a default template,
 * then falls back to assessment_types.default_weight_percent
 */
const getWeightSuggestions = async (req, res) => {
  try {
    const { class_id, subject_id } = req.query;
    const teacherId = req.user.id;
    const schoolId = req.user.school_id;

    // Verify assignment
    const assignment = await verifyTeachingAssignment(teacherId, class_id, subject_id);
    if (!assignment) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'Not assigned to this class/subject.' }
      });
    }

    // First, check if the school head has created a weight template
    // Prefer the default template; if none is default, use the most recently created one
    const [templates] = await pool.query(
      'SELECT * FROM weight_templates WHERE school_id = ? ORDER BY is_default DESC, created_at DESC LIMIT 1',
      [schoolId]
    );

    if (templates.length > 0) {
      // Use weight template weights
      const template = templates[0];
      const templateWeights = typeof template.weights === 'string'
        ? JSON.parse(template.weights)
        : (template.weights || []);

      // Map template weights, ensuring each has assessment_type_name
      const suggestedWeights = templateWeights.map(w => ({
        assessment_type_id: w.assessment_type_id,
        assessment_type_name: w.assessment_type_name || w.name || '',
        weight_percent: parseFloat(w.weight_percent) || 0
      }));

      return res.status(200).json({
        success: true,
        data: {
          class_id: parseInt(class_id),
          subject_id: parseInt(subject_id),
          source: 'weight_template',
          template_name: template.name,
          suggested_weights: suggestedWeights
        },
        error: null
      });
    }

    // Fallback: get assessment types with their default weights
    const [types] = await pool.query(
      'SELECT id as assessment_type_id, name as assessment_type_name, default_weight_percent as weight_percent FROM assessment_types WHERE school_id = ?',
      [schoolId]
    );

    return res.status(200).json({
      success: true,
      data: {
        class_id: parseInt(class_id),
        subject_id: parseInt(subject_id),
        source: 'assessment_type_defaults',
        suggested_weights: types
      },
      error: null
    });
  } catch (error) {
    console.error('Get weight suggestions error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch weight suggestions.' }
    });
  }
};

/**
 * GET /api/v1/teacher/assessment-weights
 * Get current assessment weights for class/subject
 */
const getAssessmentWeights = async (req, res) => {
  try {
    const { class_id, subject_id, semester_id } = req.query;
    const teacherId = req.user.id;
    const schoolId = req.user.school_id;

    // Verify assignment
    const assignment = await verifyTeachingAssignment(teacherId, class_id, subject_id);
    if (!assignment) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'Not assigned to this class/subject.' }
      });
    }

    // Check for teacher-defined weights
    const [weights] = await pool.query(
      `SELECT aw.assessment_type_id, at.name as assessment_type_name, aw.weight_percent
       FROM assessment_weights aw
       JOIN assessment_types at ON aw.assessment_type_id = at.id
       WHERE aw.teaching_assignment_id = ? AND aw.semester_id = ?`,
      [assignment.id, semester_id]
    );

    if (weights.length > 0) {
      return res.status(200).json({
        success: true,
        data: {
          class_id: parseInt(class_id),
          subject_id: parseInt(subject_id),
          semester_id: parseInt(semester_id),
          weights: weights,
          source: 'teacher_defined'
        },
        error: null
      });
    }

    // Fall back to default weights
    const [defaults] = await pool.query(
      'SELECT id as assessment_type_id, name as assessment_type_name, default_weight_percent as weight_percent FROM assessment_types WHERE school_id = ?',
      [schoolId]
    );

    return res.status(200).json({
      success: true,
      data: {
        class_id: parseInt(class_id),
        subject_id: parseInt(subject_id),
        semester_id: parseInt(semester_id),
        weights: defaults,
        source: 'school_default'
      },
      error: null
    });
  } catch (error) {
    console.error('Get assessment weights error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch assessment weights.' }
    });
  }
};

/**
 * POST /api/v1/teacher/assessment-weights
 * Set assessment weights for class/subject
 */
const setAssessmentWeights = async (req, res) => {
  try {
    const { class_id, subject_id, semester_id, weights } = req.body;
    const teacherId = req.user.id;

    // Verify assignment
    const assignment = await verifyTeachingAssignment(teacherId, class_id, subject_id);
    if (!assignment) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'Not assigned to this class/subject.' }
      });
    }

    // Validate weights sum to 100
    const totalWeight = weights.reduce((sum, w) => sum + w.weight_percent, 0);
    if (totalWeight !== 100) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: `Weights must sum to 100 (got ${totalWeight}).` }
      });
    }

    // Delete existing weights
    await pool.query(
      'DELETE FROM assessment_weights WHERE teaching_assignment_id = ? AND semester_id = ?',
      [assignment.id, semester_id]
    );

    // Insert new weights
    for (const w of weights) {
      await pool.query(
        'INSERT INTO assessment_weights (teaching_assignment_id, assessment_type_id, semester_id, weight_percent) VALUES (?, ?, ?, ?)',
        [assignment.id, w.assessment_type_id, semester_id, w.weight_percent]
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        class_id: parseInt(class_id),
        subject_id: parseInt(subject_id),
        semester_id: parseInt(semester_id),
        weights: weights,
        saved_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Set assessment weights error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to set assessment weights.' }
    });
  }
};

// ==========================================
// VIEW STUDENT LIST
// ==========================================

/**
 * GET /api/v1/teacher/classes/:class_id/students
 * Get student list for a class
 */
const getStudentList = async (req, res) => {
  try {
    const { class_id } = req.params;
    const { subject_id } = req.query;
    const teacherId = req.user.id;

    // Verify assignment
    const assignment = await verifyTeachingAssignment(teacherId, class_id, subject_id);
    if (!assignment) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'Not assigned to this class/subject.' }
      });
    }

    // Get class and subject info
    const [classInfo] = await pool.query(
      `SELECT c.id, c.name, g.name as grade_name
       FROM classes c JOIN grades g ON c.grade_id = g.id WHERE c.id = ?`,
      [class_id]
    );

    const [subjectInfo] = await pool.query('SELECT id, name FROM subjects WHERE id = ?', [subject_id]);

    // Get students (students table links to users table for name)
    const [students] = await pool.query(
      `SELECT s.id as student_id, s.student_id_number as student_code, 
              u.name as full_name, s.sex as gender,
              (SELECT COUNT(*) FROM marks m WHERE m.student_id = s.id 
               AND m.teaching_assignment_id = ?) as grades_count
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.class_id = ?
       ORDER BY u.name`,
      [assignment.id, class_id]
    );

    const items = students.map(s => ({
      student_id: s.student_id,
      student_code: s.student_code,
      full_name: s.full_name,
      gender: s.gender,
      has_grades: s.grades_count > 0
    }));

    return res.status(200).json({
      success: true,
      data: {
        class: classInfo[0],
        subject: subjectInfo[0],
        items: items
      },
      error: null
    });
  } catch (error) {
    console.error('Get student list error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch student list.' }
    });
  }
};

// ==========================================
// MANAGE STUDENT GRADES (MARKS)
// ==========================================

/**
 * GET /api/v1/teacher/classes/:class_id/subjects/:subject_id/grades
 * List student grades for class/subject
 */
const listStudentGrades = async (req, res) => {
  try {
    const { class_id, subject_id } = req.params;
    const { semester_id } = req.query;
    const teacherId = req.user.id;

    // Verify assignment
    const assignment = await verifyTeachingAssignment(teacherId, class_id, subject_id);
    if (!assignment) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'Not assigned to this class/subject.' }
      });
    }

    // Get class, subject, semester info
    const [classInfo] = await pool.query('SELECT id, name FROM classes WHERE id = ?', [class_id]);
    const [subjectInfo] = await pool.query('SELECT id, name FROM subjects WHERE id = ?', [subject_id]);
    const [semesterInfo] = await pool.query('SELECT id, name FROM semesters WHERE id = ?', [semester_id]);

    // Get assessment types with weights for this assignment/semester
    // First try teacher-defined weights, then fall back to school defaults
    let [assessmentTypes] = await pool.query(
      `SELECT aw.assessment_type_id, at.name as assessment_type_name,
              aw.weight_percent, at.default_weight_percent as max_score_default
       FROM assessment_weights aw
       JOIN assessment_types at ON aw.assessment_type_id = at.id
       WHERE aw.teaching_assignment_id = ? AND aw.semester_id = ?
       ORDER BY at.id`,
      [assignment.id, semester_id]
    );

    // If no weights are set for this assignment, fall back to school-wide assessment types
    if (assessmentTypes.length === 0) {
      [assessmentTypes] = await pool.query(
        `SELECT id as assessment_type_id, name as assessment_type_name,
                default_weight_percent as weight_percent, default_weight_percent as max_score_default
         FROM assessment_types WHERE school_id = ?
         ORDER BY id`,
        [req.user.school_id]
      );
    }

    // Determine max_score for each assessment type based on weight
    // (e.g., weight 10% => max_score 10, weight 20% => max_score 20, weight 40% => max_score 40)
    const assessmentTypeMap = assessmentTypes.map(at => ({
      assessment_type_id: at.assessment_type_id,
      assessment_type_name: at.assessment_type_name,
      weight_percent: parseFloat(at.weight_percent) || 0,
      max_score: parseFloat(at.weight_percent) || 10 // max_score equals weight by default
    }));

    // Get students with their grades (join with users for name)
    const [students] = await pool.query(
      `SELECT s.id as student_id, u.name as student_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.class_id = ?
       ORDER BY u.name`,
      [class_id]
    );

    // Check submission status once (same for all students)
    const [submissions] = await pool.query(
      `SELECT status FROM grade_submissions 
       WHERE teaching_assignment_id = ? AND semester_id = ?`,
      [assignment.id, semester_id]
    );
    const submissionStatus = submissions.length > 0 ? submissions[0].status : 'draft';

    const items = [];
    for (const student of students) {
      // Get all marks for this student
      const [marks] = await pool.query(
        `SELECT m.id, m.assessment_type_id, at.name as assessment_type_name,
                m.score, m.max_score, aw.weight_percent,
                (m.score / m.max_score * aw.weight_percent) as weighted_score,
                m.created_at as entered_at
         FROM marks m
         JOIN assessment_types at ON m.assessment_type_id = at.id
         LEFT JOIN assessment_weights aw ON aw.teaching_assignment_id = m.teaching_assignment_id 
                                         AND aw.assessment_type_id = m.assessment_type_id 
                                         AND aw.semester_id = m.semester_id
         WHERE m.student_id = ? AND m.teaching_assignment_id = ? AND m.semester_id = ?`,
        [student.student_id, assignment.id, semester_id]
      );

      // Build a complete grades array: one entry per assessment type
      // If a mark exists use it; otherwise create an empty placeholder
      const gradesMap = {};
      marks.forEach(m => { gradesMap[m.assessment_type_id] = m; });

      const completeGrades = assessmentTypeMap.map(at => {
        if (gradesMap[at.assessment_type_id]) {
          const m = gradesMap[at.assessment_type_id];
          return {
            id: m.id,
            assessment_type_id: m.assessment_type_id,
            assessment_type_name: m.assessment_type_name,
            score: m.score,
            max_score: parseFloat(m.max_score) || at.max_score,
            weight_percent: parseFloat(m.weight_percent) || at.weight_percent,
            weighted_score: parseFloat(m.weighted_score) || 0,
            entered_at: m.entered_at
          };
        } else {
          // No mark yet - return placeholder with assessment type info
          return {
            id: null,
            assessment_type_id: at.assessment_type_id,
            assessment_type_name: at.assessment_type_name,
            score: null,
            max_score: at.max_score,
            weight_percent: at.weight_percent,
            weighted_score: 0,
            entered_at: null
          };
        }
      });

      const totalWeightedScore = completeGrades.reduce((sum, g) => sum + (parseFloat(g.weighted_score) || 0), 0);

      items.push({
        student_id: student.student_id,
        student_name: student.student_name,
        grades: completeGrades,
        total_weighted_score: Math.round(totalWeightedScore * 100) / 100,
        submission_status: submissionStatus
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        class: classInfo[0],
        subject: subjectInfo[0],
        semester: semesterInfo[0],
        assessment_types: assessmentTypeMap,
        items: items
      },
      error: null
    });
  } catch (error) {
    console.error('List student grades error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch student grades.' }
    });
  }
};

/**
 * POST /api/v1/teacher/grades
 * Enter a single grade
 */
const enterGrade = async (req, res) => {
  try {
    const { student_id, class_id, subject_id, semester_id, assessment_type_id, score, max_score, remarks } = req.body;
    const teacherId = req.user.id;

    // Verify assignment
    const assignment = await verifyTeachingAssignment(teacherId, class_id, subject_id);
    if (!assignment) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'Not assigned to this class/subject.' }
      });
    }

    // Validate score
    if (score < 0 || score > max_score) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid score.' }
      });
    }

    // Check if grade already exists (update) or create new
    const [existing] = await pool.query(
      `SELECT id FROM marks 
       WHERE student_id = ? AND teaching_assignment_id = ? AND semester_id = ? AND assessment_type_id = ?`,
      [student_id, assignment.id, semester_id, assessment_type_id]
    );

    let gradeId;
    if (existing.length > 0) {
      // Update existing
      gradeId = existing[0].id;
      await pool.query(
        'UPDATE marks SET score = ?, max_score = ?, remarks = ?, updated_at = NOW() WHERE id = ?',
        [score, max_score, remarks || null, gradeId]
      );
    } else {
      // Insert new
      const [result] = await pool.query(
        `INSERT INTO marks (student_id, teaching_assignment_id, assessment_type_id, semester_id, score, max_score, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [student_id, assignment.id, assessment_type_id, semester_id, score, max_score, remarks || null]
      );
      gradeId = result.insertId;
    }

    // Get assessment type name and weight
    const [typeInfo] = await pool.query(
      `SELECT at.name, COALESCE(aw.weight_percent, at.default_weight_percent) as weight_percent
       FROM assessment_types at
       LEFT JOIN assessment_weights aw ON aw.assessment_type_id = at.id 
                                       AND aw.teaching_assignment_id = ? 
                                       AND aw.semester_id = ?
       WHERE at.id = ?`,
      [assignment.id, semester_id, assessment_type_id]
    );

    // Get student name
    const [studentInfo] = await pool.query(
      `SELECT u.name FROM students s 
       JOIN users u ON s.user_id = u.id WHERE s.id = ?`,
      [student_id]
    );

    const weightedScore = (score / max_score) * (typeInfo[0]?.weight_percent || 0);

    return res.status(201).json({
      success: true,
      data: {
        id: gradeId,
        student_id: student_id,
        student_name: studentInfo[0]?.name || 'Unknown',
        assessment_type: typeInfo[0]?.name,
        score: score,
        max_score: max_score,
        weight_percent: typeInfo[0]?.weight_percent,
        weighted_score: Math.round(weightedScore * 100) / 100,
        entered_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Enter grade error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to enter grade.' }
    });
  }
};

/**
 * POST /api/v1/teacher/grades/bulk
 * Enter grades in bulk
 */
const enterBulkGrades = async (req, res) => {
  try {
    const { class_id, subject_id, semester_id, assessment_type_id, max_score, grades } = req.body;
    const teacherId = req.user.id;

    // Verify assignment
    const assignment = await verifyTeachingAssignment(teacherId, class_id, subject_id);
    if (!assignment) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'Not assigned to this class/subject.' }
      });
    }

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const g of grades) {
      try {
        // Validate score
        if (g.score < 0 || g.score > max_score) {
          results.push({ student_id: g.student_id, status: 'failed', error: 'Invalid score' });
          failed++;
          continue;
        }

        // Check if exists
        const [existing] = await pool.query(
          `SELECT id FROM marks 
           WHERE student_id = ? AND teaching_assignment_id = ? AND semester_id = ? AND assessment_type_id = ?`,
          [g.student_id, assignment.id, semester_id, assessment_type_id]
        );

        let gradeId;
        if (existing.length > 0) {
          gradeId = existing[0].id;
          await pool.query(
            'UPDATE marks SET score = ?, max_score = ?, updated_at = NOW() WHERE id = ?',
            [g.score, max_score, gradeId]
          );
        } else {
          const [result] = await pool.query(
            `INSERT INTO marks (student_id, teaching_assignment_id, assessment_type_id, semester_id, score, max_score)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [g.student_id, assignment.id, assessment_type_id, semester_id, g.score, max_score]
          );
          gradeId = result.insertId;
        }

        results.push({ student_id: g.student_id, status: 'success', grade_id: gradeId });
        successful++;
      } catch (err) {
        results.push({ student_id: g.student_id, status: 'failed', error: err.message });
        failed++;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        total_entered: grades.length,
        successful: successful,
        failed: failed,
        results: results
      },
      error: null
    });
  } catch (error) {
    console.error('Bulk enter grades error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to enter grades.' }
    });
  }
};

/**
 * PUT /api/v1/teacher/grades/:grade_id
 * Update a grade
 */
const updateGrade = async (req, res) => {
  try {
    const { grade_id } = req.params;
    const { score, remarks } = req.body;
    const teacherId = req.user.id;

    // Verify grade belongs to teacher's assignment
    const [gradeInfo] = await pool.query(
      `SELECT m.*, ta.teacher_id 
       FROM marks m 
       JOIN teaching_assignments ta ON m.teaching_assignment_id = ta.id
       WHERE m.id = ?`,
      [grade_id]
    );

    if (gradeInfo.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Grade not found.' }
      });
    }

    if (gradeInfo[0].teacher_id !== teacherId) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'Grade was not entered by you.' }
      });
    }

    // Check submission status
    const [submissions] = await pool.query(
      `SELECT status FROM grade_submissions 
       WHERE teaching_assignment_id = ? AND semester_id = ?`,
      [gradeInfo[0].teaching_assignment_id, gradeInfo[0].semester_id]
    );

    if (submissions.length > 0 && submissions[0].status !== 'draft') {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Grades already submitted for approval.' }
      });
    }

    // Update
    const updates = [];
    const params = [];
    if (score !== undefined) { updates.push('score = ?'); params.push(score); }
    if (remarks !== undefined) { updates.push('remarks = ?'); params.push(remarks); }
    updates.push('updated_at = NOW()');
    params.push(grade_id);

    await pool.query(`UPDATE marks SET ${updates.join(', ')} WHERE id = ?`, params);

    // Get weight for weighted score calculation
    const [weightInfo] = await pool.query(
      `SELECT COALESCE(aw.weight_percent, at.default_weight_percent) as weight_percent
       FROM assessment_types at
       LEFT JOIN assessment_weights aw ON aw.assessment_type_id = at.id 
                                       AND aw.teaching_assignment_id = ?
                                       AND aw.semester_id = ?
       WHERE at.id = ?`,
      [gradeInfo[0].teaching_assignment_id, gradeInfo[0].semester_id, gradeInfo[0].assessment_type_id]
    );

    const newScore = score !== undefined ? score : gradeInfo[0].score;
    const weightedScore = (newScore / gradeInfo[0].max_score) * (weightInfo[0]?.weight_percent || 0);

    return res.status(200).json({
      success: true,
      data: {
        id: parseInt(grade_id),
        score: newScore,
        weighted_score: Math.round(weightedScore * 100) / 100,
        updated_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Update grade error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update grade.' }
    });
  }
};

/**
 * DELETE /api/v1/teacher/grades/:grade_id
 * Delete a grade
 */
const deleteGrade = async (req, res) => {
  try {
    const { grade_id } = req.params;
    const teacherId = req.user.id;

    // Verify grade belongs to teacher
    const [gradeInfo] = await pool.query(
      `SELECT m.*, ta.teacher_id 
       FROM marks m 
       JOIN teaching_assignments ta ON m.teaching_assignment_id = ta.id
       WHERE m.id = ?`,
      [grade_id]
    );

    if (gradeInfo.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Grade not found.' }
      });
    }

    if (gradeInfo[0].teacher_id !== teacherId) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'Grade was not entered by you.' }
      });
    }

    // Check submission status
    const [submissions] = await pool.query(
      `SELECT status FROM grade_submissions 
       WHERE teaching_assignment_id = ? AND semester_id = ?`,
      [gradeInfo[0].teaching_assignment_id, gradeInfo[0].semester_id]
    );

    if (submissions.length > 0 && submissions[0].status !== 'draft') {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Grades already submitted for approval.' }
      });
    }

    await pool.query('DELETE FROM marks WHERE id = ?', [grade_id]);

    return res.status(200).json({
      success: true,
      data: { message: 'Grade deleted successfully.' },
      error: null
    });
  } catch (error) {
    console.error('Delete grade error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete grade.' }
    });
  }
};

// ==========================================
// SUBMIT GRADES FOR APPROVAL
// ==========================================

/**
 * POST /api/v1/teacher/classes/:class_id/subjects/:subject_id/submit
 * Submit grades for approval
 */
const submitGrades = async (req, res) => {
  try {
    const { class_id, subject_id } = req.params;
    const { semester_id, remarks } = req.body;
    const teacherId = req.user.id;

    // Verify assignment
    const assignment = await verifyTeachingAssignment(teacherId, class_id, subject_id);
    if (!assignment) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'Not assigned to this class/subject.' }
      });
    }

    // Check if already submitted
    const [existing] = await pool.query(
      `SELECT * FROM grade_submissions 
       WHERE teaching_assignment_id = ? AND semester_id = ?`,
      [assignment.id, semester_id]
    );

    if (existing.length > 0 && existing[0].status === 'submitted') {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Grades already submitted.' }
      });
    }

    // Count students with grades
    const [studentCount] = await pool.query(
      'SELECT COUNT(*) as total FROM students WHERE class_id = ?',
      [class_id]
    );

    const [gradedCount] = await pool.query(
      `SELECT COUNT(DISTINCT student_id) as graded FROM marks 
       WHERE teaching_assignment_id = ? AND semester_id = ?`,
      [assignment.id, semester_id]
    );

    // Prevent submission if no grades have been entered
    if (gradedCount[0].graded === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'NO_GRADES', message: 'Cannot submit: no grades have been entered yet. Please enter marks first.' }
      });
    }

    // Create or update submission
    if (existing.length > 0) {
      await pool.query(
        `UPDATE grade_submissions SET status = 'submitted', submitted_at = NOW(), comments = ? WHERE id = ?`,
        [remarks || null, existing[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO grade_submissions (teaching_assignment_id, semester_id, status, comments, submitted_at)
         VALUES (?, ?, 'submitted', ?, NOW())`,
        [assignment.id, semester_id, remarks || null]
      );
    }

    // Get class and subject names
    const [classInfo] = await pool.query('SELECT id, name FROM classes WHERE id = ?', [class_id]);
    const [subjectInfo] = await pool.query('SELECT id, name FROM subjects WHERE id = ?', [subject_id]);
    const [semesterInfo] = await pool.query('SELECT name FROM semesters WHERE id = ?', [semester_id]);

    return res.status(200).json({
      success: true,
      data: {
        class_id: parseInt(class_id),
        class_name: classInfo[0].name,
        subject_id: parseInt(subject_id),
        subject_name: subjectInfo[0].name,
        semester: semesterInfo[0].name,
        total_students: studentCount[0].total,
        students_with_grades: gradedCount[0].graded,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Submit grades error:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to submit grades.' }
    });
  }
};

// ==========================================
// VIEW SUBMISSION STATUS
// ==========================================

/**
 * GET /api/v1/teacher/submissions
 * View submission status for all assignments
 */
const getSubmissionStatus = async (req, res) => {
  try {
    const { semester_id } = req.query;
    const teacherId = req.user.id;

    // Get all assignments for this teacher
    const [assignments] = await pool.query(
      `SELECT ta.id, ta.class_id, c.name as class_name,
              ta.subject_id, s.name as subject_name,
              (SELECT COUNT(*) FROM students st WHERE st.class_id = ta.class_id) as total_students
       FROM teaching_assignments ta
       JOIN classes c ON ta.class_id = c.id
       JOIN subjects s ON ta.subject_id = s.id
       WHERE ta.teacher_id = ?`,
      [teacherId]
    );

    const items = [];
    for (const a of assignments) {
      // Get submission status
      const [submissions] = await pool.query(
        `SELECT id, status, submitted_at, reviewed_at 
         FROM grade_submissions WHERE teaching_assignment_id = ? AND semester_id = ?`,
        [a.id, semester_id]
      );

      // Count graded students
      const [gradedCount] = await pool.query(
        `SELECT COUNT(DISTINCT student_id) as graded FROM marks 
         WHERE teaching_assignment_id = ? AND semester_id = ?`,
        [a.id, semester_id]
      );

      if (submissions.length > 0) {
        items.push({
          submission_id: submissions[0].id,
          class: { id: a.class_id, name: a.class_name },
          subject: { id: a.subject_id, name: a.subject_name },
          status: submissions[0].status,
          submitted_at: submissions[0].submitted_at,
          reviewed_at: submissions[0].reviewed_at
        });
      } else {
        items.push({
          submission_id: null,
          class: { id: a.class_id, name: a.class_name },
          subject: { id: a.subject_id, name: a.subject_name },
          status: 'draft',
          students_graded: gradedCount[0].graded,
          total_students: a.total_students
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: { items: items },
      error: null
    });
  } catch (error) {
    console.error('Get submission status error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch submission status.' }
    });
  }
};

// ==========================================
// VIEW COMPUTED AVERAGES
// ==========================================

/**
 * GET /api/v1/teacher/classes/:class_id/subjects/:subject_id/averages
 * View computed averages for class/subject
 */
const getComputedAverages = async (req, res) => {
  try {
    const { class_id, subject_id } = req.params;
    const { semester_id } = req.query;
    const teacherId = req.user.id;

    // Verify assignment
    const assignment = await verifyTeachingAssignment(teacherId, class_id, subject_id);
    if (!assignment) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'Not assigned to this class/subject.' }
      });
    }

    // Get class and subject info
    const [classInfo] = await pool.query('SELECT id, name FROM classes WHERE id = ?', [class_id]);
    const [subjectInfo] = await pool.query('SELECT id, name FROM subjects WHERE id = ?', [subject_id]);
    const [semesterInfo] = await pool.query('SELECT name FROM semesters WHERE id = ?', [semester_id]);

    // Calculate scores for each student
    const [students] = await pool.query(
      `SELECT s.id as student_id, u.name as student_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.class_id = ?
       ORDER BY u.name`,
      [class_id]
    );

    const studentScores = [];
    for (const student of students) {
      // Calculate weighted score
      const [marks] = await pool.query(
        `SELECT m.score, m.max_score, 
                COALESCE(aw.weight_percent, at.default_weight_percent) as weight_percent
         FROM marks m
         JOIN assessment_types at ON m.assessment_type_id = at.id
         LEFT JOIN assessment_weights aw ON aw.teaching_assignment_id = m.teaching_assignment_id 
                                         AND aw.assessment_type_id = m.assessment_type_id 
                                         AND aw.semester_id = m.semester_id
         WHERE m.student_id = ? AND m.teaching_assignment_id = ? AND m.semester_id = ?`,
        [student.student_id, assignment.id, semester_id]
      );

      const totalScore = marks.reduce((sum, m) => {
        return sum + (m.score / m.max_score * m.weight_percent);
      }, 0);

      studentScores.push({
        student_id: student.student_id,
        student_name: student.student_name,
        score: Math.round(totalScore * 100) / 100
      });
    }

    // Sort by score descending and assign ranks
    studentScores.sort((a, b) => b.score - a.score);
    studentScores.forEach((s, idx) => { s.rank_in_subject = idx + 1; });

    // Calculate statistics
    const scores = studentScores.map(s => s.score).filter(s => s > 0);
    const classAverage = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    return res.status(200).json({
      success: true,
      data: {
        class: classInfo[0],
        subject: subjectInfo[0],
        semester: semesterInfo[0]?.name,
        class_average: Math.round(classAverage * 100) / 100,
        highest_score: highestScore,
        lowest_score: lowestScore,
        students: studentScores
      },
      error: null
    });
  } catch (error) {
    console.error('Get computed averages error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to compute averages.' }
    });
  }
};

module.exports = {
  listAssignedClasses,
  listAssignedSubjects,
  getWeightSuggestions,
  getAssessmentWeights,
  setAssessmentWeights,
  getStudentList,
  listStudentGrades,
  enterGrade,
  enterBulkGrades,
  updateGrade,
  deleteGrade,
  submitGrades,
  getSubmissionStatus,
  getComputedAverages
};

