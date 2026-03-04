// School Head Controller
// Handles grades, classes, subjects, assessment types, and teacher assignments
// All operations are scoped to the school from JWT token

const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const { validatePasswordStrength, generatePassword, hashPassword } = require('../utils/passwordGenerator');

// Helper to get current academic year
const getCurrentAcademicYear = async () => {
  const [years] = await pool.query(
    'SELECT * FROM academic_years WHERE is_current = true LIMIT 1'
  );
  return years.length > 0 ? years[0] : null;
};

const listAcademicYearsForLifecycle = async (req, res) => {
  try {
    const [years] = await pool.query(
      `SELECT id, name, start_date, end_date, is_current, lifecycle_status
       FROM academic_years
       ORDER BY id DESC`
    );
    return res.status(200).json({
      success: true,
      data: { items: years },
      error: null
    });
  } catch (error) {
    console.error('List academic years for lifecycle error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch academic years.' }
    });
  }
};

const listSemestersForLifecycle = async (req, res) => {
  try {
    const { academic_year_id } = req.query;
    let query = `
      SELECT s.id, s.name, s.semester_number, s.academic_year_id, ay.name as academic_year_name,
             s.lifecycle_status, s.is_current
      FROM semesters s
      JOIN academic_years ay ON ay.id = s.academic_year_id
    `;
    const params = [];
    if (academic_year_id) {
      query += ' WHERE s.academic_year_id = ?';
      params.push(academic_year_id);
    }
    query += ' ORDER BY ay.id DESC, s.semester_number ASC, s.id ASC';
    const [semesters] = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      data: { items: semesters },
      error: null
    });
  } catch (error) {
    console.error('List semesters for lifecycle error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch semesters.' }
    });
  }
};

// ==========================================
// GRADES MANAGEMENT
// ==========================================

/**
 * GET /api/v1/school/grades
 * List all grades for the school
 */
const listGrades = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { academic_year_id } = req.query;

    let query = `
      SELECT g.*,
             (
               SELECT COUNT(*)
               FROM classes c
               WHERE c.grade_id = g.id
               ${academic_year_id ? 'AND c.academic_year_id = ?' : ''}
             ) as total_classes,
             (
               SELECT COUNT(*)
               FROM students s
               JOIN classes c ON s.class_id = c.id
               WHERE c.grade_id = g.id
               ${academic_year_id ? 'AND c.academic_year_id = ?' : ''}
             ) as total_students
      FROM grades g
      WHERE g.school_id = ?
      ORDER BY g.level ASC
    `;
    const params = academic_year_id ? [academic_year_id, academic_year_id, schoolId] : [schoolId];

    const [grades] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: { items: grades },
      error: null
    });
  } catch (error) {
    console.error('List grades error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch grades.' }
    });
  }
};

/**
 * GET /api/v1/school/grades/:grade_id
 * Get grade details with classes
 */
const getGrade = async (req, res) => {
  try {
    const { grade_id } = req.params;
    const schoolId = req.user.school_id;

    const [grades] = await pool.query(
      'SELECT * FROM grades WHERE id = ? AND school_id = ?',
      [grade_id, schoolId]
    );

    if (grades.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Grade not found.' }
      });
    }

    const grade = grades[0];

    // Get classes for this grade
    const [classes] = await pool.query(
      `SELECT c.id, c.name, 
              (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count
       FROM classes c WHERE c.grade_id = ?`,
      [grade_id]
    );

    return res.status(200).json({
      success: true,
      data: { ...grade, classes },
      error: null
    });
  } catch (error) {
    console.error('Get grade error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch grade.' }
    });
  }
};

/**
 * POST /api/v1/school/grades
 * Create a new grade
 */
const createGrade = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { level, name } = req.body;

    if (!level || !name) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Level and name are required.' }
      });
    }

    // Check if grade level already exists
    const [existing] = await pool.query(
      'SELECT id FROM grades WHERE school_id = ? AND level = ?',
      [schoolId, level]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Grade level already exists.' }
      });
    }

    const [result] = await pool.query(
      'INSERT INTO grades (school_id, level, name) VALUES (?, ?, ?)',
      [schoolId, level, name]
    );

    return res.status(201).json({
      success: true,
      data: { id: result.insertId, level, name, school_id: schoolId },
      error: null
    });
  } catch (error) {
    console.error('Create grade error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create grade.' }
    });
  }
};

/**
 * PUT /api/v1/school/grades/:grade_id
 * Update grade
 */
const updateGrade = async (req, res) => {
  try {
    const { grade_id } = req.params;
    const schoolId = req.user.school_id;
    const { name } = req.body;

    const [existing] = await pool.query(
      'SELECT * FROM grades WHERE id = ? AND school_id = ?',
      [grade_id, schoolId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Grade not found.' }
      });
    }

    await pool.query('UPDATE grades SET name = ? WHERE id = ?', [name, grade_id]);

    return res.status(200).json({
      success: true,
      data: { id: parseInt(grade_id), name, updated: true },
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
 * DELETE /api/v1/school/grades/:grade_id
 * Delete grade
 */
const deleteGrade = async (req, res) => {
  try {
    const { grade_id } = req.params;
    const schoolId = req.user.school_id;

    const [existing] = await pool.query(
      'SELECT * FROM grades WHERE id = ? AND school_id = ?',
      [grade_id, schoolId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Grade not found.' }
      });
    }

    // Check for classes
    const [classes] = await pool.query(
      'SELECT COUNT(*) as count FROM classes WHERE grade_id = ?',
      [grade_id]
    );

    if (classes[0].count > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Grade has classes. Delete classes first.' }
      });
    }

    await pool.query('DELETE FROM grades WHERE id = ?', [grade_id]);

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
// CLASSES MANAGEMENT
// ==========================================

/**
 * GET /api/v1/school/grades/:grade_id/classes
 * List classes for a specific grade (API contract route)
 */
const listClassesByGrade = async (req, res) => {
  try {
    const { grade_id } = req.params;
    const { academic_year_id } = req.query;
    const schoolId = req.user.school_id;

    // Verify grade belongs to school
    const [grade] = await pool.query(
      'SELECT * FROM grades WHERE id = ? AND school_id = ?',
      [grade_id, schoolId]
    );

    if (grade.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Grade not found.' }
      });
    }

    let classesQuery = `
      SELECT c.*, g.name as grade_name, g.level as grade_level,
             u.name as class_head_name, u.phone as class_head_phone,
             (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count
      FROM classes c
      JOIN grades g ON c.grade_id = g.id
      LEFT JOIN users u ON c.class_head_id = u.id
      WHERE c.grade_id = ?
    `;
    const classParams = [grade_id];
    if (academic_year_id) {
      classesQuery += ' AND c.academic_year_id = ?';
      classParams.push(academic_year_id);
    }
    classesQuery += ' ORDER BY c.name';
    const [classes] = await pool.query(classesQuery, classParams);

    const items = classes.map(c => ({
      id: c.id,
      name: c.name,
      grade_id: c.grade_id,
      grade_name: c.grade_name,
      academic_year_id: c.academic_year_id,
      class_head: c.class_head_id ? {
        id: c.class_head_id,
        name: c.class_head_name,
        phone: c.class_head_phone
      } : null,
      student_count: c.student_count
    }));

    return res.status(200).json({
      success: true,
      data: { items },
      error: null
    });
  } catch (error) {
    console.error('List classes by grade error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch classes.' }
    });
  }
};

/**
 * POST /api/v1/school/grades/:grade_id/classes
 * Create a new class under a specific grade (API contract route)
 */
const createClassUnderGrade = async (req, res) => {
  try {
    const { grade_id } = req.params;
    const schoolId = req.user.school_id;
    const { name, capacity, class_head_id } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Class name is required.' }
      });
    }

    // Verify grade belongs to school
    const [grade] = await pool.query(
      'SELECT * FROM grades WHERE id = ? AND school_id = ?',
      [grade_id, schoolId]
    );

    if (grade.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid grade.' }
      });
    }

    // Get current academic year
    const academicYear = await getCurrentAcademicYear();
    if (!academicYear) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'No current academic year set.' }
      });
    }

    // Check if class name exists for this grade
    const [existing] = await pool.query(
      'SELECT id FROM classes WHERE grade_id = ? AND name = ?',
      [grade_id, name]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Class name already exists for this grade.' }
      });
    }

    const [result] = await pool.query(
      'INSERT INTO classes (grade_id, name, class_head_id, academic_year_id) VALUES (?, ?, ?, ?)',
      [grade_id, name, class_head_id || null, academicYear.id]
    );

    return res.status(201).json({
      success: true,
      data: { id: result.insertId, name, grade_id: parseInt(grade_id) },
      error: null
    });
  } catch (error) {
    console.error('Create class under grade error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create class.' }
    });
  }
};

/**
 * GET /api/v1/school/classes
 * List all classes for the school
 */
const listClasses = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { grade_id, academic_year_id } = req.query;

    let query = `
      SELECT c.*, g.name as grade_name, g.level as grade_level,
             u.name as class_head_name, u.phone as class_head_phone,
             (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count
      FROM classes c
      JOIN grades g ON c.grade_id = g.id
      LEFT JOIN users u ON c.class_head_id = u.id
      WHERE g.school_id = ?
    `;
    const params = [schoolId];

    if (grade_id) {
      query += ' AND c.grade_id = ?';
      params.push(grade_id);
    }
    if (academic_year_id) {
      query += ' AND c.academic_year_id = ?';
      params.push(academic_year_id);
    }

    query += ' ORDER BY g.level, c.name';

    const [classes] = await pool.query(query, params);

    const items = classes.map(c => ({
      id: c.id,
      name: c.name,
      grade_id: c.grade_id,
      grade_name: c.grade_name,
      grade_level: c.grade_level,
      academic_year_id: c.academic_year_id,
      class_head: c.class_head_id ? {
        id: c.class_head_id,
        name: c.class_head_name,
        phone: c.class_head_phone
      } : null,
      student_count: c.student_count
    }));

    return res.status(200).json({
      success: true,
      data: { items },
      error: null
    });
  } catch (error) {
    console.error('List classes error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch classes.' }
    });
  }
};

/**
 * GET /api/v1/school/classes/:class_id
 * Get class details
 */
const getClass = async (req, res) => {
  try {
    const { class_id } = req.params;
    const schoolId = req.user.school_id;

    const [classes] = await pool.query(
      `SELECT c.*, g.name as grade_name, g.level as grade_level,
              u.name as class_head_name, u.phone as class_head_phone
       FROM classes c
       JOIN grades g ON c.grade_id = g.id
       LEFT JOIN users u ON c.class_head_id = u.id
       WHERE c.id = ? AND g.school_id = ?`,
      [class_id, schoolId]
    );

    if (classes.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Class not found.' }
      });
    }

    const cls = classes[0];

    // Get student count
    const [studentCount] = await pool.query(
      'SELECT COUNT(*) as count FROM students WHERE class_id = ?',
      [class_id]
    );

    // Get teaching assignments
    const [assignments] = await pool.query(
      `SELECT ta.id, ta.teacher_id, u.name as teacher_name, 
              ta.subject_id, s.name as subject_name
       FROM teaching_assignments ta
       JOIN users u ON ta.teacher_id = u.id
       JOIN subjects s ON ta.subject_id = s.id
       WHERE ta.class_id = ?`,
      [class_id]
    );

    return res.status(200).json({
      success: true,
      data: {
        id: cls.id,
        name: cls.name,
        grade: { id: cls.grade_id, name: cls.grade_name, level: cls.grade_level },
        class_head: cls.class_head_id ? {
          id: cls.class_head_id,
          name: cls.class_head_name,
          phone: cls.class_head_phone
        } : null,
        student_count: studentCount[0].count,
        teaching_assignments: assignments
      },
      error: null
    });
  } catch (error) {
    console.error('Get class error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch class.' }
    });
  }
};

/**
 * POST /api/v1/school/classes
 * Create a new class
 */
const createClass = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { name, grade_id, class_head_id } = req.body;

    if (!name || !grade_id) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Name and grade_id are required.' }
      });
    }

    // Verify grade belongs to school
    const [grade] = await pool.query(
      'SELECT * FROM grades WHERE id = ? AND school_id = ?',
      [grade_id, schoolId]
    );

    if (grade.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid grade_id.' }
      });
    }

    // Get current academic year
    const academicYear = await getCurrentAcademicYear();
    if (!academicYear) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'No current academic year set.' }
      });
    }

    // Check if class name exists for this grade
    const [existing] = await pool.query(
      'SELECT id FROM classes WHERE grade_id = ? AND name = ?',
      [grade_id, name]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Class name already exists for this grade.' }
      });
    }

    const [result] = await pool.query(
      'INSERT INTO classes (grade_id, name, class_head_id, academic_year_id) VALUES (?, ?, ?, ?)',
      [grade_id, name, class_head_id || null, academicYear.id]
    );

    return res.status(201).json({
      success: true,
      data: { id: result.insertId, name, grade_id },
      error: null
    });
  } catch (error) {
    console.error('Create class error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create class.' }
    });
  }
};

/**
 * PUT /api/v1/school/classes/:class_id
 * Update class
 */
const updateClass = async (req, res) => {
  try {
    const { class_id } = req.params;
    const schoolId = req.user.school_id;
    const { name, class_head_id } = req.body;

    // Verify class belongs to school
    const [cls] = await pool.query(
      `SELECT c.* FROM classes c
       JOIN grades g ON c.grade_id = g.id
       WHERE c.id = ? AND g.school_id = ?`,
      [class_id, schoolId]
    );

    if (cls.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Class not found.' }
      });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (class_head_id !== undefined) {
      updates.push('class_head_id = ?');
      params.push(class_head_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'No fields to update.' }
      });
    }

    params.push(class_id);
    await pool.query(`UPDATE classes SET ${updates.join(', ')} WHERE id = ?`, params);

    return res.status(200).json({
      success: true,
      data: { id: parseInt(class_id), updated: true },
      error: null
    });
  } catch (error) {
    console.error('Update class error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update class.' }
    });
  }
};

/**
 * DELETE /api/v1/school/classes/:class_id
 * Delete class
 */
const deleteClass = async (req, res) => {
  try {
    const { class_id } = req.params;
    const schoolId = req.user.school_id;

    // Verify class belongs to school
    const [cls] = await pool.query(
      `SELECT c.* FROM classes c
       JOIN grades g ON c.grade_id = g.id
       WHERE c.id = ? AND g.school_id = ?`,
      [class_id, schoolId]
    );

    if (cls.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Class not found.' }
      });
    }

    // Check for students
    const [students] = await pool.query(
      'SELECT COUNT(*) as count FROM students WHERE class_id = ?',
      [class_id]
    );

    if (students[0].count > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Class has students enrolled.' }
      });
    }

    await pool.query('DELETE FROM classes WHERE id = ?', [class_id]);

    return res.status(200).json({
      success: true,
      data: { message: 'Class deleted successfully.' },
      error: null
    });
  } catch (error) {
    console.error('Delete class error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete class.' }
    });
  }
};

// ==========================================
// SUBJECTS MANAGEMENT
// ==========================================

/**
 * GET /api/v1/school/subjects
 * List all subjects for the school
 */
const listSubjects = async (req, res) => {
  try {
    const schoolId = req.user.school_id;

    const [subjects] = await pool.query(
      'SELECT * FROM subjects WHERE school_id = ? ORDER BY is_active DESC, name',
      [schoolId]
    );

    return res.status(200).json({
      success: true,
      data: { items: subjects.map((s) => ({ ...s, is_active: !!s.is_active })) },
      error: null
    });
  } catch (error) {
    console.error('List subjects error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch subjects.' }
    });
  }
};

/**
 * POST /api/v1/school/subjects
 * Create a new subject
 */
const createSubject = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Subject name is required.' }
      });
    }

    // Check if subject exists
    const [existing] = await pool.query(
      'SELECT id FROM subjects WHERE school_id = ? AND name = ?',
      [schoolId, name]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Subject already exists.' }
      });
    }

    const [result] = await pool.query(
      'INSERT INTO subjects (school_id, name) VALUES (?, ?)',
      [schoolId, name]
    );

    return res.status(201).json({
      success: true,
      data: { id: result.insertId, name, school_id: schoolId },
      error: null
    });
  } catch (error) {
    console.error('Create subject error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create subject.' }
    });
  }
};

/**
 * POST /api/v1/school/grades/:grade_id/subjects
 * Add a subject to a specific grade (API contract endpoint)
 * Note: In current schema, subjects are school-wide, not grade-specific.
 * This endpoint accepts grade_id for API compliance but creates school-wide subjects.
 */
const addSubjectToGrade = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { grade_id } = req.params;
    const { name, code, credit_hours, is_required, description, academic_year_id } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Subject name is required.' }
      });
    }

    let targetAcademicYearId = Number(academic_year_id);
    if (!targetAcademicYearId) {
      const currentYear = await getCurrentAcademicYear();
      targetAcademicYearId = currentYear?.id || null;
    }
    if (!targetAcademicYearId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'No active academic year found.' }
      });
    }

    // Verify grade exists and belongs to this school
    const [grade] = await pool.query(
      'SELECT id, name FROM grades WHERE id = ? AND school_id = ?',
      [grade_id, schoolId]
    );

    if (grade.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Grade not found.' }
      });
    }

    // Check if subject already exists for this grade in this academic year
    const [existing] = await pool.query(
      `SELECT id FROM subjects
       WHERE school_id = ? AND grade_id = ? AND academic_year_id = ? AND name = ?`,
      [schoolId, grade_id, targetAcademicYearId, name]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Subject already exists for this grade and academic year.' }
      });
    }

    // Create subject scoped to grade + academic year
    const [result] = await pool.query(
      'INSERT INTO subjects (school_id, grade_id, academic_year_id, name) VALUES (?, ?, ?, ?)',
      [schoolId, grade_id, targetAcademicYearId, name]
    );

    // Return response matching API contract format
    return res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        name,
        code: code || null,
        credit_hours: credit_hours || null,
        is_required: is_required || false,
        description: description || null,
        grade_id: parseInt(grade_id),
        academic_year_id: targetAcademicYearId,
        school_id: schoolId,
        is_active: true,
        created_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Add subject to grade error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to add subject.' }
    });
  }
};

/**
 * GET /api/v1/school/grades/:grade_id/subjects
 * List subjects for a specific grade (API contract endpoint)
 * Note: In current schema, subjects are school-wide.
 * Returns all school subjects filtered by grade context.
 */
const listSubjectsByGrade = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { grade_id } = req.params;
    const { academic_year_id } = req.query;

    // Verify grade exists and belongs to this school
    const [grade] = await pool.query(
      'SELECT id, name FROM grades WHERE id = ? AND school_id = ?',
      [grade_id, schoolId]
    );

    if (grade.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Grade not found.' }
      });
    }

    let targetAcademicYearId = Number(academic_year_id);
    if (!targetAcademicYearId) {
      const currentYear = await getCurrentAcademicYear();
      targetAcademicYearId = currentYear?.id || null;
    }
    if (!targetAcademicYearId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'No active academic year found.' }
      });
    }

    // Return subjects only for this grade + academic year
    const [subjects] = await pool.query(
      `SELECT * FROM subjects
       WHERE school_id = ? AND grade_id = ? AND academic_year_id = ?
       ORDER BY is_active DESC, name`,
      [schoolId, grade_id, targetAcademicYearId]
    );

    return res.status(200).json({
      success: true,
      data: { items: subjects.map((s) => ({ ...s, is_active: !!s.is_active })) },
      error: null
    });
  } catch (error) {
    console.error('List subjects by grade error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch subjects.' }
    });
  }
};

/**
 * PUT /api/v1/school/subjects/:subject_id
 * Update subject (flat route - kept for backward compatibility)
 */
const updateSubject = async (req, res) => {
  try {
    const { subject_id } = req.params;
    const schoolId = req.user.school_id;
    const { name } = req.body;

    const [existing] = await pool.query(
      'SELECT * FROM subjects WHERE id = ? AND school_id = ?',
      [subject_id, schoolId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Subject not found.' }
      });
    }

    await pool.query('UPDATE subjects SET name = ? WHERE id = ?', [name, subject_id]);

    return res.status(200).json({
      success: true,
      data: { id: parseInt(subject_id), name, updated: true },
      error: null
    });
  } catch (error) {
    console.error('Update subject error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update subject.' }
    });
  }
};

/**
 * PUT /api/v1/school/grades/:grade_id/subjects/:subject_id
 * Update subject under a grade (API contract endpoint)
 */
const updateSubjectInGrade = async (req, res) => {
  try {
    const { grade_id, subject_id } = req.params;
    const schoolId = req.user.school_id;
    const { name, code, credit_hours, is_required, description, academic_year_id } = req.body;

    // Verify grade belongs to this school
    const [grade] = await pool.query(
      'SELECT id FROM grades WHERE id = ? AND school_id = ?',
      [grade_id, schoolId]
    );

    if (grade.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Grade not found.' }
      });
    }

    let targetAcademicYearId = Number(academic_year_id);
    if (!targetAcademicYearId) {
      const currentYear = await getCurrentAcademicYear();
      targetAcademicYearId = currentYear?.id || null;
    }
    if (!targetAcademicYearId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'No active academic year found.' }
      });
    }

    // Verify subject exists and belongs to this school + grade + academic year scope
    const [existing] = await pool.query(
      `SELECT * FROM subjects
       WHERE id = ? AND school_id = ? AND grade_id = ? AND academic_year_id = ?`,
      [subject_id, schoolId, grade_id, targetAcademicYearId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Subject not found.' }
      });
    }

    // Update the subject name if provided
    if (name) {
      await pool.query('UPDATE subjects SET name = ? WHERE id = ?', [name, subject_id]);
    }

    return res.status(200).json({
      success: true,
      data: {
        id: parseInt(subject_id),
        name: name || existing[0].name,
        code: code || null,
        credit_hours: credit_hours || null,
        is_required: is_required || false,
        is_active: !!existing[0].is_active,
        description: description || null,
        grade_id: parseInt(grade_id),
        academic_year_id: targetAcademicYearId,
        updated: true
      },
      error: null
    });
  } catch (error) {
    console.error('Update subject in grade error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update subject.' }
    });
  }
};

/**
 * DELETE /api/v1/school/subjects/:subject_id
 * Delete subject (flat route - kept for backward compatibility)
 */
const deleteSubject = async (req, res) => {
  try {
    const { subject_id } = req.params;
    const schoolId = req.user.school_id;

    const [existing] = await pool.query(
      'SELECT * FROM subjects WHERE id = ? AND school_id = ?',
      [subject_id, schoolId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Subject not found.' }
      });
    }

    if (existing[0].is_active) {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Deactivate subject before deleting it.' }
      });
    }

    await pool.query('DELETE FROM subjects WHERE id = ?', [subject_id]);

    return res.status(200).json({
      success: true,
      data: { message: 'Subject deleted successfully.' },
      error: null
    });
  } catch (error) {
    console.error('Delete subject error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete subject.' }
    });
  }
};

/**
 * DELETE /api/v1/school/grades/:grade_id/subjects/:subject_id
 * Remove subject from a grade (API contract endpoint)
 */
const removeSubjectFromGrade = async (req, res) => {
  try {
    const { grade_id, subject_id } = req.params;
    const schoolId = req.user.school_id;
    const { academic_year_id } = req.query;

    // Verify grade belongs to this school
    const [grade] = await pool.query(
      'SELECT id FROM grades WHERE id = ? AND school_id = ?',
      [grade_id, schoolId]
    );

    if (grade.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Grade not found.' }
      });
    }

    let targetAcademicYearId = Number(academic_year_id);
    if (!targetAcademicYearId) {
      const currentYear = await getCurrentAcademicYear();
      targetAcademicYearId = currentYear?.id || null;
    }
    if (!targetAcademicYearId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'No active academic year found.' }
      });
    }

    // Verify subject exists and belongs to this school + grade + academic year scope
    const [existing] = await pool.query(
      `SELECT * FROM subjects
       WHERE id = ? AND school_id = ? AND grade_id = ? AND academic_year_id = ?`,
      [subject_id, schoolId, grade_id, targetAcademicYearId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Subject not found.' }
      });
    }

    if (existing[0].is_active) {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Deactivate subject before removing it.' }
      });
    }

    await pool.query('DELETE FROM subjects WHERE id = ?', [subject_id]);

    return res.status(200).json({
      success: true,
      data: { message: 'Subject removed from grade successfully' },
      error: null
    });
  } catch (error) {
    console.error('Remove subject from grade error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to remove subject.' }
    });
  }
};

/**
 * PATCH /api/v1/school/grades/:grade_id/subjects/:subject_id/deactivate
 * Deactivate subject in grade context (soft delete prerequisite)
 */
const deactivateSubjectInGrade = async (req, res) => {
  try {
    const { grade_id, subject_id } = req.params;
    const schoolId = req.user.school_id;
    const { academic_year_id } = req.query;

    const [grade] = await pool.query(
      'SELECT id FROM grades WHERE id = ? AND school_id = ?',
      [grade_id, schoolId]
    );
    if (grade.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Grade not found.' }
      });
    }

    let targetAcademicYearId = Number(academic_year_id);
    if (!targetAcademicYearId) {
      const currentYear = await getCurrentAcademicYear();
      targetAcademicYearId = currentYear?.id || null;
    }
    if (!targetAcademicYearId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'No active academic year found.' }
      });
    }

    const [existing] = await pool.query(
      `SELECT id, is_active FROM subjects
       WHERE id = ? AND school_id = ? AND grade_id = ? AND academic_year_id = ?`,
      [subject_id, schoolId, grade_id, targetAcademicYearId]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Subject not found.' }
      });
    }

    if (!existing[0].is_active) {
      return res.status(200).json({
        success: true,
        data: { id: parseInt(subject_id, 10), is_active: false, message: 'Subject is already deactivated.' },
        error: null
      });
    }

    await pool.query('UPDATE subjects SET is_active = false WHERE id = ?', [subject_id]);
    return res.status(200).json({
      success: true,
      data: { id: parseInt(subject_id, 10), is_active: false, message: 'Subject deactivated successfully.' },
      error: null
    });
  } catch (error) {
    console.error('Deactivate subject in grade error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate subject.' }
    });
  }
};

/**
 * PATCH /api/v1/school/grades/:grade_id/subjects/:subject_id/activate
 * Activate subject in grade context
 */
const activateSubjectInGrade = async (req, res) => {
  try {
    const { grade_id, subject_id } = req.params;
    const schoolId = req.user.school_id;
    const { academic_year_id } = req.query;

    const [grade] = await pool.query(
      'SELECT id FROM grades WHERE id = ? AND school_id = ?',
      [grade_id, schoolId]
    );
    if (grade.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Grade not found.' }
      });
    }

    let targetAcademicYearId = Number(academic_year_id);
    if (!targetAcademicYearId) {
      const currentYear = await getCurrentAcademicYear();
      targetAcademicYearId = currentYear?.id || null;
    }
    if (!targetAcademicYearId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'No active academic year found.' }
      });
    }

    const [existing] = await pool.query(
      `SELECT id, is_active FROM subjects
       WHERE id = ? AND school_id = ? AND grade_id = ? AND academic_year_id = ?`,
      [subject_id, schoolId, grade_id, targetAcademicYearId]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Subject not found.' }
      });
    }

    if (existing[0].is_active) {
      return res.status(200).json({
        success: true,
        data: { id: parseInt(subject_id, 10), is_active: true, message: 'Subject is already active.' },
        error: null
      });
    }

    await pool.query('UPDATE subjects SET is_active = true WHERE id = ?', [subject_id]);
    return res.status(200).json({
      success: true,
      data: { id: parseInt(subject_id, 10), is_active: true, message: 'Subject activated successfully.' },
      error: null
    });
  } catch (error) {
    console.error('Activate subject in grade error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to activate subject.' }
    });
  }
};

// ==========================================
// ASSESSMENT TYPES
// ==========================================

/**
 * GET /api/v1/school/assessment-types
 * List assessment types for the school
 */
const listAssessmentTypes = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { academic_year_id } = req.query;

    let query = 'SELECT * FROM assessment_types WHERE school_id = ?';
    const params = [schoolId];
    if (academic_year_id) {
      query += ' AND academic_year_id = ?';
      params.push(academic_year_id);
    }
    query += ' ORDER BY name';

    const [types] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: { items: types },
      error: null
    });
  } catch (error) {
    console.error('List assessment types error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch assessment types.' }
    });
  }
};

/**
 * POST /api/v1/school/assessment-types
 * Create assessment type
 */
const createAssessmentType = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { name, default_weight_percent, academic_year_id } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Name is required.' }
      });
    }

    let targetAcademicYearId = Number(academic_year_id);
    if (!targetAcademicYearId) {
      const currentYear = await getCurrentAcademicYear();
      targetAcademicYearId = currentYear?.id || null;
    }
    if (!targetAcademicYearId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'No active academic year found.' }
      });
    }

    const [existing] = await pool.query(
      'SELECT id FROM assessment_types WHERE school_id = ? AND academic_year_id = ? AND name = ?',
      [schoolId, targetAcademicYearId, name]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Assessment type already exists.' }
      });
    }

    const [result] = await pool.query(
      'INSERT INTO assessment_types (school_id, academic_year_id, name, default_weight_percent) VALUES (?, ?, ?, ?)',
      [schoolId, targetAcademicYearId, name, default_weight_percent || null]
    );

    return res.status(201).json({
      success: true,
      data: { id: result.insertId, name, academic_year_id: targetAcademicYearId, default_weight_percent },
      error: null
    });
  } catch (error) {
    console.error('Create assessment type error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create assessment type.' }
    });
  }
};

/**
 * PUT /api/v1/school/assessment-types/:type_id
 * Update assessment type
 */
const updateAssessmentType = async (req, res) => {
  try {
    const { type_id } = req.params;
    const schoolId = req.user.school_id;
    const { name, default_weight_percent } = req.body;

    const [existing] = await pool.query(
      'SELECT * FROM assessment_types WHERE id = ? AND school_id = ?',
      [type_id, schoolId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Assessment type not found.' }
      });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (default_weight_percent !== undefined) { 
      updates.push('default_weight_percent = ?'); 
      params.push(default_weight_percent); 
    }

    params.push(type_id);
    await pool.query(`UPDATE assessment_types SET ${updates.join(', ')} WHERE id = ?`, params);

    return res.status(200).json({
      success: true,
      data: { id: parseInt(type_id), updated: true },
      error: null
    });
  } catch (error) {
    console.error('Update assessment type error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update assessment type.' }
    });
  }
};

/**
 * DELETE /api/v1/school/assessment-types/:type_id
 * Delete assessment type
 */
const deleteAssessmentType = async (req, res) => {
  try {
    const { type_id } = req.params;
    const schoolId = req.user.school_id;

    const [existing] = await pool.query(
      'SELECT * FROM assessment_types WHERE id = ? AND school_id = ?',
      [type_id, schoolId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Assessment type not found.' }
      });
    }

    // Check for weights using this type
    const [weights] = await pool.query(
      'SELECT COUNT(*) as count FROM assessment_weights WHERE assessment_type_id = ?',
      [type_id]
    );

    if (weights[0].count > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Assessment type is in use.' }
      });
    }

    await pool.query('DELETE FROM assessment_types WHERE id = ?', [type_id]);

    return res.status(200).json({
      success: true,
      data: { message: 'Assessment type deleted successfully.' },
      error: null
    });
  } catch (error) {
    console.error('Delete assessment type error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete assessment type.' }
    });
  }
};

// ==========================================
// WEIGHT TEMPLATES
// ==========================================

/**
 * GET /api/v1/school/weight-templates
 * List all weight templates for the school
 */
const listWeightTemplates = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { academic_year_id } = req.query;

    let query = 'SELECT * FROM weight_templates WHERE school_id = ?';
    const params = [schoolId];
    if (academic_year_id) {
      query += ' AND academic_year_id = ?';
      params.push(academic_year_id);
    }
    query += ' ORDER BY is_default DESC, name';
    const [templates] = await pool.query(query, params);

    // Parse JSON weights for each template
    const items = templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      weights: typeof t.weights === 'string' ? JSON.parse(t.weights) : (t.weights || []),
      is_default: !!t.is_default,
      created_at: t.created_at,
      updated_at: t.updated_at
    }));

    return res.status(200).json({
      success: true,
      data: { items },
      error: null
    });
  } catch (error) {
    console.error('List weight templates error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch weight templates.' }
    });
  }
};

/**
 * GET /api/v1/school/weight-templates/:template_id
 * Get single weight template details
 */
const getWeightTemplate = async (req, res) => {
  try {
    const { template_id } = req.params;
    const schoolId = req.user.school_id;

    const [templates] = await pool.query(
      'SELECT * FROM weight_templates WHERE id = ? AND school_id = ?',
      [template_id, schoolId]
    );

    if (templates.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Weight template not found.' }
      });
    }

    const t = templates[0];
    return res.status(200).json({
      success: true,
      data: {
        id: t.id,
        name: t.name,
        description: t.description,
        weights: typeof t.weights === 'string' ? JSON.parse(t.weights) : (t.weights || []),
        is_default: !!t.is_default,
        created_at: t.created_at,
        updated_at: t.updated_at
      },
      error: null
    });
  } catch (error) {
    console.error('Get weight template error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch weight template.' }
    });
  }
};

/**
 * POST /api/v1/school/weight-templates
 * Create a new weight template
 */
const createWeightTemplate = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { name, description, weights, is_default, academic_year_id } = req.body;

    // Validate required fields
    if (!name || !weights || !Array.isArray(weights)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Name and weights array are required.' }
      });
    }

    let targetAcademicYearId = Number(academic_year_id);
    if (!targetAcademicYearId) {
      const currentYear = await getCurrentAcademicYear();
      targetAcademicYearId = currentYear?.id || null;
    }
    if (!targetAcademicYearId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'No active academic year found.' }
      });
    }

    // Validate weights sum to 100%
    const totalWeight = weights.reduce((sum, w) => sum + (w.weight_percent || 0), 0);
    if (totalWeight !== 100) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: `Weights must sum to 100%. Current total: ${totalWeight}%` }
      });
    }

    // If setting as default, unset any existing default
    if (is_default) {
      await pool.query(
        'UPDATE weight_templates SET is_default = FALSE WHERE school_id = ? AND academic_year_id = ?',
        [schoolId, targetAcademicYearId]
      );
    }

    const [result] = await pool.query(
      'INSERT INTO weight_templates (school_id, academic_year_id, name, description, weights, is_default) VALUES (?, ?, ?, ?, ?, ?)',
      [schoolId, targetAcademicYearId, name, description || null, JSON.stringify(weights), is_default ? 1 : 0]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        name,
        academic_year_id: targetAcademicYearId,
        description,
        weights,
        is_default: !!is_default,
        created_at: new Date()
      },
      error: null
    });
  } catch (error) {
    console.error('Create weight template error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create weight template.' }
    });
  }
};

/**
 * PUT /api/v1/school/weight-templates/:template_id
 * Update a weight template
 */
const updateWeightTemplate = async (req, res) => {
  try {
    const { template_id } = req.params;
    const schoolId = req.user.school_id;
    const { name, description, weights, is_default } = req.body;

    // Check template exists
    const [existing] = await pool.query(
      'SELECT * FROM weight_templates WHERE id = ? AND school_id = ?',
      [template_id, schoolId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Weight template not found.' }
      });
    }

    // Validate weights sum if provided
    if (weights) {
      const totalWeight = weights.reduce((sum, w) => sum + (w.weight_percent || 0), 0);
      if (totalWeight !== 100) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_ERROR', message: `Weights must sum to 100%. Current total: ${totalWeight}%` }
        });
      }
    }

    // If setting as default, unset others
    if (is_default) {
      await pool.query(
        'UPDATE weight_templates SET is_default = FALSE WHERE school_id = ? AND academic_year_id = ? AND id != ?',
        [schoolId, existing[0].academic_year_id || null, template_id]
      );
    }

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (weights !== undefined) { updates.push('weights = ?'); params.push(JSON.stringify(weights)); }
    if (is_default !== undefined) { updates.push('is_default = ?'); params.push(is_default ? 1 : 0); }

    if (updates.length > 0) {
      params.push(template_id);
      await pool.query(`UPDATE weight_templates SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return res.status(200).json({
      success: true,
      data: { id: parseInt(template_id), updated: true },
      error: null
    });
  } catch (error) {
    console.error('Update weight template error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update weight template.' }
    });
  }
};

/**
 * DELETE /api/v1/school/weight-templates/:template_id
 * Delete a weight template
 */
const deleteWeightTemplate = async (req, res) => {
  try {
    const { template_id } = req.params;
    const schoolId = req.user.school_id;

    const [existing] = await pool.query(
      'SELECT * FROM weight_templates WHERE id = ? AND school_id = ?',
      [template_id, schoolId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Weight template not found.' }
      });
    }

    await pool.query('DELETE FROM weight_templates WHERE id = ?', [template_id]);

    return res.status(200).json({
      success: true,
      data: { message: 'Weight template deleted successfully.' },
      error: null
    });
  } catch (error) {
    console.error('Delete weight template error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete weight template.' }
    });
  }
};

// ==========================================
// TEACHING ASSIGNMENTS
// ==========================================

/**
 * GET /api/v1/school/teaching-assignments
 * List all teaching assignments
 */
const listTeachingAssignments = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { teacher_id, class_id, subject_id, academic_year_id } = req.query;

    let query = `
      SELECT ta.*, 
             u.name as teacher_name, u.phone as teacher_phone,
             c.name as class_name, g.id as grade_id, g.name as grade_name, g.level as grade_level,
             s.name as subject_name
      FROM teaching_assignments ta
      JOIN users u ON ta.teacher_id = u.id
      JOIN classes c ON ta.class_id = c.id
      JOIN grades g ON c.grade_id = g.id
      JOIN subjects s ON ta.subject_id = s.id
      WHERE g.school_id = ?
    `;
    const params = [schoolId];

    if (teacher_id) { query += ' AND ta.teacher_id = ?'; params.push(teacher_id); }
    if (class_id) { query += ' AND ta.class_id = ?'; params.push(class_id); }
    if (subject_id) { query += ' AND ta.subject_id = ?'; params.push(subject_id); }
    if (academic_year_id) { query += ' AND ta.academic_year_id = ?'; params.push(academic_year_id); }

    query += ' ORDER BY g.level, c.name, s.name';

    const [assignments] = await pool.query(query, params);

    const items = assignments.map(a => ({
      id: a.id,
      teacher: { id: a.teacher_id, name: a.teacher_name, phone: a.teacher_phone },
      class: { id: a.class_id, name: a.class_name, grade_id: a.grade_id, grade_name: a.grade_name },
      subject: { id: a.subject_id, name: a.subject_name }
    }));

    return res.status(200).json({
      success: true,
      data: { items },
      error: null
    });
  } catch (error) {
    console.error('List teaching assignments error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch teaching assignments.' }
    });
  }
};

/**
 * POST /api/v1/school/teaching-assignments
 * Create teaching assignment
 */
const createTeachingAssignment = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { teacher_id, class_id, subject_id, academic_year_id } = req.body;

    if (!teacher_id || !class_id || !subject_id) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'teacher_id, class_id, and subject_id are required.' }
      });
    }

    // Verify teacher belongs to school
    const [teacher] = await pool.query(
      'SELECT * FROM users WHERE id = ? AND school_id = ? AND role IN (?, ?)',
      [teacher_id, schoolId, 'teacher', 'class_head']
    );

    if (teacher.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid teacher.' }
      });
    }

    // Verify class belongs to school
    const [cls] = await pool.query(
      `SELECT c.* FROM classes c
       JOIN grades g ON c.grade_id = g.id
       WHERE c.id = ? AND g.school_id = ?`,
      [class_id, schoolId]
    );

    if (cls.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid class.' }
      });
    }

    // Verify subject belongs to school and is active
    const [subject] = await pool.query(
      'SELECT id, is_active, grade_id, academic_year_id FROM subjects WHERE id = ? AND school_id = ?',
      [subject_id, schoolId]
    );
    if (subject.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid subject.' }
      });
    }
    if (!subject[0].is_active) {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Cannot assign an inactive subject.' }
      });
    }

    // Resolve target academic year (defaults to current year for backward compatibility)
    let targetAcademicYearId = academic_year_id;
    if (!targetAcademicYearId) {
      const academicYear = await getCurrentAcademicYear();
      targetAcademicYearId = academicYear?.id || null;
    }
    if (!targetAcademicYearId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'No active academic year found.' }
      });
    }

    // If subject is scoped to grade/year, enforce exact match with assignment context
    if (subject[0].grade_id && Number(subject[0].grade_id) !== Number(cls[0].grade_id)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Selected subject does not belong to the selected grade.' }
      });
    }
    if (subject[0].academic_year_id && Number(subject[0].academic_year_id) !== Number(targetAcademicYearId)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Selected subject does not belong to the selected academic year.' }
      });
    }

    // Ensure class belongs to the target academic year
    if (Number(cls[0].academic_year_id) !== Number(targetAcademicYearId)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Selected class does not belong to the selected academic year.' }
      });
    }

    // Check for existing assignment
    const [existing] = await pool.query(
      `SELECT id FROM teaching_assignments 
       WHERE teacher_id = ? AND class_id = ? AND subject_id = ? AND academic_year_id = ?`,
      [teacher_id, class_id, subject_id, targetAcademicYearId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Teaching assignment already exists.' }
      });
    }

    const [result] = await pool.query(
      `INSERT INTO teaching_assignments (teacher_id, class_id, subject_id, academic_year_id)
       VALUES (?, ?, ?, ?)`,
      [teacher_id, class_id, subject_id, targetAcademicYearId]
    );

    return res.status(201).json({
      success: true,
      data: { id: result.insertId, teacher_id, class_id, subject_id },
      error: null
    });
  } catch (error) {
    console.error('Create teaching assignment error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create teaching assignment.' }
    });
  }
};

/**
 * PUT /api/v1/school/teaching-assignments/:assignment_id
 * Update teaching assignment (teacher, class, or subject)
 */
const updateTeachingAssignment = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const schoolId = req.user.school_id;
    const { teacher_id, class_id, subject_id } = req.body;

    // Verify assignment belongs to school
    const [assignment] = await pool.query(
      `SELECT ta.* FROM teaching_assignments ta
       JOIN classes c ON ta.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       WHERE ta.id = ? AND g.school_id = ?`,
      [assignment_id, schoolId]
    );

    if (assignment.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Teaching assignment not found.' }
      });
    }

    // Check for marks - block edit if marks exist (consistent with delete)
    const [marks] = await pool.query(
      'SELECT COUNT(*) as count FROM marks WHERE teaching_assignment_id = ?',
      [assignment_id]
    );

    if (marks[0].count > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Cannot edit assignment. It has marks recorded.' }
      });
    }

    const newTeacherId = teacher_id ?? assignment[0].teacher_id;
    const newClassId = class_id ?? assignment[0].class_id;
    const newSubjectId = subject_id ?? assignment[0].subject_id;

    // Verify teacher belongs to school
    const [teacher] = await pool.query(
      'SELECT id FROM users WHERE id = ? AND school_id = ? AND role IN (?, ?)',
      [newTeacherId, schoolId, 'teacher', 'class_head']
    );
    if (teacher.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid teacher.' }
      });
    }

    // Verify class belongs to school
    const [cls] = await pool.query(
      `SELECT c.id FROM classes c JOIN grades g ON c.grade_id = g.id WHERE c.id = ? AND g.school_id = ?`,
      [newClassId, schoolId]
    );
    if (cls.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid class.' }
      });
    }

    // Verify subject belongs to school
    const [subj] = await pool.query(
      'SELECT id, grade_id, academic_year_id FROM subjects WHERE id = ? AND school_id = ? AND is_active = true',
      [newSubjectId, schoolId]
    );
    if (subj.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid or inactive subject.' }
      });
    }

    // Load selected class details for scope validation
    const [selectedClass] = await pool.query(
      'SELECT id, grade_id, academic_year_id FROM classes WHERE id = ?',
      [newClassId]
    );
    if (selectedClass.length > 0) {
      if (subj[0].grade_id && Number(subj[0].grade_id) !== Number(selectedClass[0].grade_id)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_ERROR', message: 'Selected subject does not belong to the selected grade.' }
        });
      }
      if (subj[0].academic_year_id && Number(subj[0].academic_year_id) !== Number(assignment[0].academic_year_id)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'VALIDATION_ERROR', message: 'Selected subject does not belong to the assignment academic year.' }
        });
      }
    }

    // Check for duplicate assignment
    const academicYearId = assignment[0].academic_year_id;
    const [existing] = await pool.query(
      `SELECT id FROM teaching_assignments 
       WHERE teacher_id = ? AND class_id = ? AND subject_id = ? AND academic_year_id = ? AND id != ?`,
      [newTeacherId, newClassId, newSubjectId, academicYearId, assignment_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Teaching assignment already exists for this combination.' }
      });
    }

    await pool.query(
      'UPDATE teaching_assignments SET teacher_id = ?, class_id = ?, subject_id = ? WHERE id = ?',
      [newTeacherId, newClassId, newSubjectId, assignment_id]
    );

    return res.status(200).json({
      success: true,
      data: { id: parseInt(assignment_id), teacher_id: newTeacherId, class_id: newClassId, subject_id: newSubjectId },
      error: null
    });
  } catch (error) {
    console.error('Update teaching assignment error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update teaching assignment.' }
    });
  }
};

/**
 * DELETE /api/v1/school/teaching-assignments/:assignment_id
 * Delete teaching assignment
 */
const deleteTeachingAssignment = async (req, res) => {
  try {
    const { assignment_id } = req.params;
    const schoolId = req.user.school_id;

    // Verify assignment belongs to school
    const [assignment] = await pool.query(
      `SELECT ta.* FROM teaching_assignments ta
       JOIN classes c ON ta.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       WHERE ta.id = ? AND g.school_id = ?`,
      [assignment_id, schoolId]
    );

    if (assignment.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Teaching assignment not found.' }
      });
    }

    // Check for marks
    const [marks] = await pool.query(
      'SELECT COUNT(*) as count FROM marks WHERE teaching_assignment_id = ?',
      [assignment_id]
    );

    if (marks[0].count > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: { code: 'CONFLICT', message: 'Assignment has marks recorded.' }
      });
    }

    await pool.query('DELETE FROM teaching_assignments WHERE id = ?', [assignment_id]);

    return res.status(200).json({
      success: true,
      data: { message: 'Teaching assignment deleted successfully.' },
      error: null
    });
  } catch (error) {
    console.error('Delete teaching assignment error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete teaching assignment.' }
    });
  }
};

// ==========================================
// TEACHERS LIST
// ==========================================

/**
 * GET /api/v1/school/teachers
 * List all teachers in the school
 */
const listTeachers = async (req, res) => {
  try {
    const schoolId = req.user.school_id;

    const [teachers] = await pool.query(
      `SELECT id, name, email, phone, role, is_active 
       FROM users 
       WHERE school_id = ? AND role IN ('teacher', 'class_head')
       ORDER BY name`,
      [schoolId]
    );

    return res.status(200).json({
      success: true,
      data: { items: teachers },
      error: null
    });
  } catch (error) {
    console.error('List teachers error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch teachers.' }
    });
  }
};

// ==========================================
// ASSIGN CLASS HEAD
// ==========================================

/**
 * POST /api/v1/school/classes/:class_id/class-head
 * Assign class head to a class
 */
const assignClassHead = async (req, res) => {
  try {
    const { class_id } = req.params;
    const schoolId = req.user.school_id;
    const { teacher_id } = req.body;

    // Verify class belongs to school
    const [cls] = await pool.query(
      `SELECT c.* FROM classes c
       JOIN grades g ON c.grade_id = g.id
       WHERE c.id = ? AND g.school_id = ?`,
      [class_id, schoolId]
    );

    if (cls.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Class not found.' }
      });
    }

    // Verify teacher exists and belongs to school
    const [teacher] = await pool.query(
      'SELECT * FROM users WHERE id = ? AND school_id = ? AND role IN (?, ?)',
      [teacher_id, schoolId, 'teacher', 'class_head']
    );

    if (teacher.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid teacher.' }
      });
    }

    // Update class with class head
    await pool.query('UPDATE classes SET class_head_id = ? WHERE id = ?', [teacher_id, class_id]);

    // Update teacher role to class_head if not already
    await pool.query(
      "UPDATE users SET role = 'class_head' WHERE id = ? AND role = 'teacher'",
      [teacher_id]
    );

    return res.status(200).json({
      success: true,
      data: {
        class_id: parseInt(class_id),
        class_head: {
          id: teacher[0].id,
          name: teacher[0].name,
          phone: teacher[0].phone
        }
      },
      error: null
    });
  } catch (error) {
    console.error('Assign class head error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to assign class head.' }
    });
  }
};

/**
 * DELETE /api/v1/school/classes/:class_id/class-head
 * Remove class head from class
 */
const removeClassHead = async (req, res) => {
  try {
    const { class_id } = req.params;
    const schoolId = req.user.school_id;

    // Verify class belongs to school
    const [cls] = await pool.query(
      `SELECT c.* FROM classes c
       JOIN grades g ON c.grade_id = g.id
       WHERE c.id = ? AND g.school_id = ?`,
      [class_id, schoolId]
    );

    if (cls.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Class not found.' }
      });
    }

    await pool.query('UPDATE classes SET class_head_id = NULL WHERE id = ?', [class_id]);

    return res.status(200).json({
      success: true,
      data: { message: 'Class head removed successfully.' },
      error: null
    });
  } catch (error) {
    console.error('Remove class head error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to remove class head.' }
    });
  }
};

// ==========================================
// REGISTRAR & STORE HOUSE USER MANAGEMENT
// ==========================================

const createSchoolUser = async (req, res, role) => {
  try {
    const schoolId = req.user.school_id;
    const {
      first_name,
      last_name,
      email,
      phone,
      gender,
      password
    } = req.body;

    if (!first_name || !last_name || !email || !phone || !gender || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'first_name, last_name, email, phone, gender, and password are required.'
        }
      });
    }

    if (!['M', 'F'].includes(gender)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Gender must be M or F.'
        }
      });
    }

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: passwordCheck.message
        }
      });
    }

    const [emailExists] = await pool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (emailExists.length > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'CONFLICT',
          message: 'Email already exists.'
        }
      });
    }

    const [schoolRows] = await pool.query(
      'SELECT id, name FROM schools WHERE id = ?',
      [schoolId]
    );
    if (schoolRows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'School not found.'
        }
      });
    }

    const fullName = `${first_name} ${last_name}`.trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users
        (name, first_name, last_name, username, email, password, phone, gender, role, school_id, is_active, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, true)`,
      [fullName, first_name, last_name, email, email, hashedPassword, phone, gender, role, schoolId]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        first_name,
        last_name,
        full_name: fullName,
        email,
        phone,
        gender,
        role,
        school: {
          id: schoolRows[0].id,
          name: schoolRows[0].name
        },
        must_change_password: true,
        status: 'active',
        created_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error(`Create ${role} error:`, error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to create ${role}.`
      }
    });
  }
};

const listSchoolUsers = async (req, res, role) => {
  try {
    const schoolId = req.user.school_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'all';
    const search = req.query.search || '';

    let whereClause = 'school_id = ? AND role = ?';
    const params = [schoolId, role];

    if (status === 'active') {
      whereClause += ' AND is_active = true';
    } else if (status === 'inactive') {
      whereClause += ' AND is_active = false';
    }

    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
      params
    );
    const totalItems = countRows[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    const [rows] = await pool.query(
      `SELECT id, name, email, phone, gender, role, is_active, created_at
       FROM users
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.status(200).json({
      success: true,
      data: {
        items: rows.map((u) => ({
          id: u.id,
          full_name: u.name,
          email: u.email,
          phone: u.phone,
          gender: u.gender,
          role: u.role,
          status: u.is_active ? 'active' : 'inactive',
          created_at: u.created_at
        })),
        pagination: {
          page,
          limit,
          total_items: totalItems,
          total_pages: totalPages
        }
      },
      error: null
    });
  } catch (error) {
    console.error(`List ${role} users error:`, error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch ${role} users.`
      }
    });
  }
};

const updateSchoolUser = async (req, res, role, notFoundMessage) => {
  try {
    const schoolId = req.user.school_id;
    const { user_id } = req.params;
    const { first_name, last_name, email, phone, gender } = req.body;

    const [existingRows] = await pool.query(
      'SELECT id, first_name, last_name FROM users WHERE id = ? AND school_id = ? AND role = ?',
      [user_id, schoolId, role]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: notFoundMessage
        }
      });
    }

    if (gender !== undefined && !['M', 'F'].includes(gender)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Gender must be M or F.'
        }
      });
    }

    if (email !== undefined) {
      const [emailRows] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
        [email, user_id]
      );
      if (emailRows.length > 0) {
        return res.status(409).json({
          success: false,
          data: null,
          error: {
            code: 'CONFLICT',
            message: 'Email already in use by another user.'
          }
        });
      }
    }

    const updates = [];
    const params = [];

    if (first_name !== undefined) { updates.push('first_name = ?'); params.push(first_name); }
    if (last_name !== undefined) { updates.push('last_name = ?'); params.push(last_name); }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
      updates.push('username = ?');
      params.push(email);
    }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (gender !== undefined) { updates.push('gender = ?'); params.push(gender); }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No fields to update.'
        }
      });
    }

    if (first_name !== undefined || last_name !== undefined) {
      const currentFirst = first_name !== undefined ? first_name : existingRows[0].first_name;
      const currentLast = last_name !== undefined ? last_name : existingRows[0].last_name;
      updates.push('name = ?');
      params.push(`${currentFirst || ''} ${currentLast || ''}`.trim());
    }

    params.push(user_id, schoolId, role);
    await pool.query(
      `UPDATE users SET ${updates.join(', ')}
       WHERE id = ? AND school_id = ? AND role = ?`,
      params
    );

    const [updatedRows] = await pool.query(
      `SELECT id, first_name, last_name, name, email, phone, updated_at
       FROM users
       WHERE id = ? AND school_id = ? AND role = ?`,
      [user_id, schoolId, role]
    );
    const u = updatedRows[0];

    return res.status(200).json({
      success: true,
      data: {
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        full_name: u.name,
        email: u.email,
        phone: u.phone,
        updated_at: u.updated_at
      },
      error: null
    });
  } catch (error) {
    console.error(`Update ${role} user error:`, error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to update ${role} user.`
      }
    });
  }
};

const changeSchoolUserStatus = async (req, res, role, activate, notFoundMessage) => {
  try {
    const schoolId = req.user.school_id;
    const { user_id } = req.params;

    const [rows] = await pool.query(
      'SELECT id, name, is_active FROM users WHERE id = ? AND school_id = ? AND role = ?',
      [user_id, schoolId, role]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: notFoundMessage
        }
      });
    }

    if (activate && rows[0].is_active) {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'CONFLICT',
          message: 'User is already active.'
        }
      });
    }

    if (!activate && !rows[0].is_active) {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'CONFLICT',
          message: 'User is already inactive.'
        }
      });
    }

    await pool.query(
      'UPDATE users SET is_active = ?, deactivated_at = ? WHERE id = ? AND school_id = ? AND role = ?',
      [activate, activate ? null : new Date(), user_id, schoolId, role]
    );

    const status = activate ? 'active' : 'inactive';
    const timeKey = activate ? 'activated_at' : 'deactivated_at';

    return res.status(200).json({
      success: true,
      data: {
        id: parseInt(user_id),
        full_name: rows[0].name,
        status,
        [timeKey]: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error(`Change ${role} status error:`, error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to update ${role} status.`
      }
    });
  }
};

const deleteSchoolUser = async (req, res, role, roleLabel) => {
  try {
    const schoolId = req.user.school_id;
    const requesterId = req.user.id;
    const { user_id } = req.params;

    const [rows] = await pool.query(
      'SELECT id, name FROM users WHERE id = ? AND school_id = ? AND role = ?',
      [user_id, schoolId, role]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: `${roleLabel} not found.` }
      });
    }

    if (parseInt(user_id, 10) === requesterId) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'You cannot delete your own account.' }
      });
    }

    await pool.query(
      'DELETE FROM users WHERE id = ? AND school_id = ? AND role = ?',
      [user_id, schoolId, role]
    );

    return res.status(200).json({
      success: true,
      data: {
        id: parseInt(user_id, 10),
        full_name: rows[0].name,
        deleted: true,
        deleted_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error(`Delete ${role} user error:`, error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: `Failed to delete ${role} user.` }
    });
  }
};

// Registrar endpoints
const createRegistrar = async (req, res) => createSchoolUser(req, res, 'registrar');
const listRegistrars = async (req, res) => listSchoolUsers(req, res, 'registrar');
const updateRegistrar = async (req, res) => {
  return updateSchoolUser(req, res, 'registrar', 'Registrar not found or does not belong to this school.');
};
const deactivateRegistrar = async (req, res) => {
  return changeSchoolUserStatus(req, res, 'registrar', false, 'Registrar not found or does not belong to this school.');
};
const activateRegistrar = async (req, res) => {
  return changeSchoolUserStatus(req, res, 'registrar', true, 'Registrar not found or does not belong to this school.');
};
const deleteRegistrar = async (req, res) => {
  return deleteSchoolUser(req, res, 'registrar', 'Registrar');
};

// Store house user endpoints
const createStoreHouseUser = async (req, res) => createSchoolUser(req, res, 'store_house');
const listStoreHouseUsers = async (req, res) => listSchoolUsers(req, res, 'store_house');
const updateStoreHouseUser = async (req, res) => {
  return updateSchoolUser(req, res, 'store_house', 'Store house user not found or does not belong to this school.');
};
const deactivateStoreHouseUser = async (req, res) => {
  return changeSchoolUserStatus(req, res, 'store_house', false, 'Store house user not found or does not belong to this school.');
};
const activateStoreHouseUser = async (req, res) => {
  return changeSchoolUserStatus(req, res, 'store_house', true, 'Store house user not found or does not belong to this school.');
};
const deleteStoreHouseUser = async (req, res) => {
  return deleteSchoolUser(req, res, 'store_house', 'Store house user');
};

const resetSchoolUserPassword = async (req, res, role, roleLabel) => {
  try {
    const schoolId = req.user.school_id;
    const { user_id } = req.params;
    const [rows] = await pool.query(
      'SELECT id, name, username, role FROM users WHERE id = ? AND school_id = ? AND role = ?',
      [user_id, schoolId, role]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: `${roleLabel} not found.` }
      });
    }
    const target = rows[0];
    const temp = generatePassword();
    const hashed = await hashPassword(temp);
    await pool.query(
      'UPDATE users SET password = ?, must_change_password = true WHERE id = ?',
      [hashed, user_id]
    );
    return res.status(200).json({
      success: true,
      data: {
        user_id: target.id,
        full_name: target.name,
        username: target.username,
        role: target.role,
        new_temporary_password: temp,
        must_change_password: true,
        reset_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error(`Reset ${role} password error:`, error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred while resetting password.' }
    });
  }
};

const resetRegistrarPassword = async (req, res) => {
  return resetSchoolUserPassword(req, res, 'registrar', 'Registrar');
};

const resetStoreHouseUserPassword = async (req, res) => {
  return resetSchoolUserPassword(req, res, 'store_house', 'Store house user');
};

const initializeClassesForAcademicYear = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { academic_year_id } = req.params;
    const { source_academic_year_id, copy_class_heads = false } = req.body || {};

    if (!source_academic_year_id) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'source_academic_year_id is required.' }
      });
    }

    const [targetYear] = await pool.query('SELECT id FROM academic_years WHERE id = ?', [academic_year_id]);
    const [sourceYear] = await pool.query('SELECT id FROM academic_years WHERE id = ?', [source_academic_year_id]);
    if (targetYear.length === 0 || sourceYear.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Source or target academic year not found.' }
      });
    }

    const [sourceClasses] = await pool.query(
      `SELECT c.id, c.grade_id, c.name, c.class_head_id
       FROM classes c
       JOIN grades g ON g.id = c.grade_id
       WHERE g.school_id = ? AND c.academic_year_id = ?
       ORDER BY c.id ASC`,
      [schoolId, source_academic_year_id]
    );

    let createdClasses = 0;
    let skippedExisting = 0;
    for (const cls of sourceClasses) {
      const [existing] = await pool.query(
        `SELECT id FROM classes
         WHERE grade_id = ? AND name = ? AND academic_year_id = ?
         LIMIT 1`,
        [cls.grade_id, cls.name, academic_year_id]
      );

      if (existing.length > 0) {
        skippedExisting += 1;
        continue;
      }

      await pool.query(
        `INSERT INTO classes (grade_id, name, class_head_id, academic_year_id)
         VALUES (?, ?, ?, ?)`,
        [cls.grade_id, cls.name, copy_class_heads ? cls.class_head_id : null, academic_year_id]
      );
      createdClasses += 1;
    }

    // Ensure target academic year has semester rows so lifecycle actions can be used immediately.
    // Prefer source year semester templates; fallback to default 2-semester setup.
    const [sourceSemesters] = await pool.query(
      `SELECT name, semester_number
       FROM semesters
       WHERE academic_year_id = ?
       ORDER BY semester_number ASC, id ASC`,
      [source_academic_year_id]
    );

    const semesterTemplates = sourceSemesters.length > 0
      ? sourceSemesters
      : [
          { name: 'First Semester', semester_number: 1 },
          { name: 'Second Semester', semester_number: 2 }
        ];

    let createdSemesters = 0;
    let skippedSemesters = 0;
    for (const sem of semesterTemplates) {
      const [existingSem] = await pool.query(
        `SELECT id
         FROM semesters
         WHERE academic_year_id = ? AND semester_number = ?
         LIMIT 1`,
        [academic_year_id, sem.semester_number]
      );
      if (existingSem.length > 0) {
        skippedSemesters += 1;
        continue;
      }

      await pool.query(
        `INSERT INTO semesters (academic_year_id, name, semester_number, is_current, lifecycle_status)
         VALUES (?, ?, ?, FALSE, 'open')`,
        [academic_year_id, sem.name || `Semester ${sem.semester_number}`, sem.semester_number]
      );
      createdSemesters += 1;
    }

    return res.status(200).json({
      success: true,
      data: {
        created_classes: createdClasses,
        skipped_existing: skippedExisting,
        created_semesters: createdSemesters,
        skipped_existing_semesters: skippedSemesters,
        source_academic_year_id: Number(source_academic_year_id),
        target_academic_year_id: Number(academic_year_id)
      },
      error: null
    });
  } catch (error) {
    console.error('Initialize classes for academic year error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to initialize classes for academic year.' }
    });
  }
};

const updateSemesterLifecycleStatus = async (req, res, nextStatus, timestampField = null) => {
  try {
    const schoolId = req.user.school_id;
    const { semester_id } = req.params;
    const { reason = null } = req.body || {};

    const [semRows] = await pool.query(
      `SELECT sem.id, sem.academic_year_id, sem.lifecycle_status
       FROM semesters sem
       WHERE sem.id = ?`,
      [semester_id]
    );
    if (semRows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Semester not found.' }
      });
    }

    const [schoolScope] = await pool.query(
      `SELECT c.id
       FROM classes c
       JOIN grades g ON g.id = c.grade_id
       WHERE g.school_id = ? AND c.academic_year_id = ?
       LIMIT 1`,
      [schoolId, semRows[0].academic_year_id]
    );
    if (schoolScope.length === 0) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: 'FORBIDDEN', message: 'Semester is not associated with your school scope.' }
      });
    }

    if (nextStatus === 'locked') {
      await pool.query(
        `UPDATE semesters
         SET lifecycle_status = 'locked',
             locked_at = CURRENT_TIMESTAMP,
             locked_by = ?,
             lock_reason = ?
         WHERE id = ?`,
        [req.user.id, reason, semester_id]
      );
    } else if (nextStatus === 'open') {
      await pool.query(
        `UPDATE semesters
         SET lifecycle_status = 'open',
             reopened_at = CURRENT_TIMESTAMP,
             reopened_by = ?,
             reopen_reason = ?
         WHERE id = ?`,
        [req.user.id, reason, semester_id]
      );
    } else if (timestampField) {
      await pool.query(
        `UPDATE semesters
         SET lifecycle_status = ?, ${timestampField} = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [nextStatus, semester_id]
      );
    } else {
      await pool.query(
        `UPDATE semesters
         SET lifecycle_status = ?
         WHERE id = ?`,
        [nextStatus, semester_id]
      );
    }

    const [updated] = await pool.query(
      `SELECT id, academic_year_id, lifecycle_status, is_current,
              submission_closed_at, published_at, locked_at, reopened_at
       FROM semesters WHERE id = ?`,
      [semester_id]
    );

    return res.status(200).json({
      success: true,
      data: {
        semester_id: Number(semester_id),
        academic_year_id: updated[0].academic_year_id,
        lifecycle_status: updated[0].lifecycle_status,
        submission_closed_at: updated[0].submission_closed_at,
        published_at: updated[0].published_at,
        locked_at: updated[0].locked_at,
        reopened_at: updated[0].reopened_at
      },
      error: null
    });
  } catch (error) {
    console.error('Update semester lifecycle status error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update semester lifecycle status.' }
    });
  }
};

const openSemester = async (req, res) =>
  updateSemesterLifecycleStatus(req, res, 'open');

const closeSemesterSubmission = async (req, res) =>
  updateSemesterLifecycleStatus(req, res, 'submission_closed', 'submission_closed_at');

const lockSemester = async (req, res) =>
  updateSemesterLifecycleStatus(req, res, 'locked');

const reopenSemester = async (req, res) =>
  updateSemesterLifecycleStatus(req, res, 'open');

// ==========================================
// PROMOTION CRITERIA (School Head manages for their school)
// ==========================================

const listPromotionCriteria = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM promotion_criteria WHERE school_id = ?',
      [schoolId]
    );
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    const [criteria] = await pool.query(
      `SELECT * FROM promotion_criteria WHERE school_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [schoolId, limit, offset]
    );

    return res.status(200).json({
      success: true,
      data: {
        items: criteria.map(c => ({
          id: c.id,
          name: c.name,
          passing_average: parseFloat(c.passing_average),
          passing_per_subject: parseFloat(c.passing_per_subject),
          max_failing_subjects: c.max_failing_subjects,
          is_active: c.is_active === 1,
          is_default: false,
          created_at: c.created_at
        })),
        pagination: { page, limit, total_items: totalItems, total_pages: totalPages }
      },
      error: null
    });
  } catch (error) {
    console.error('List promotion criteria error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch promotion criteria.' }
    });
  }
};

const getPromotionCriteria = async (req, res) => {
  try {
    const { criteria_id } = req.params;
    const schoolId = req.user.school_id;

    const [criteria] = await pool.query(
      'SELECT * FROM promotion_criteria WHERE id = ? AND school_id = ?',
      [criteria_id, schoolId]
    );

    if (criteria.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Promotion criteria not found.' }
      });
    }

    const c = criteria[0];
    return res.status(200).json({
      success: true,
      data: {
        id: c.id,
        name: c.name,
        passing_average: parseFloat(c.passing_average),
        passing_per_subject: parseFloat(c.passing_per_subject),
        max_failing_subjects: c.max_failing_subjects,
        is_active: c.is_active === 1,
        created_at: c.created_at
      },
      error: null
    });
  } catch (error) {
    console.error('Get promotion criteria error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch promotion criteria.' }
    });
  }
};

const createPromotionCriteria = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { name, passing_average, passing_per_subject, max_failing_subjects, is_active } = req.body;

    if (!name || passing_average === undefined || passing_per_subject === undefined || max_failing_subjects === undefined) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Name, passing_average, passing_per_subject, and max_failing_subjects are required.' }
      });
    }

    const [result] = await pool.query(
      `INSERT INTO promotion_criteria (school_id, name, passing_average, passing_per_subject, max_failing_subjects, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [schoolId, name, passing_average, passing_per_subject, max_failing_subjects, is_active !== false]
    );

    const [created] = await pool.query('SELECT * FROM promotion_criteria WHERE id = ?', [result.insertId]);
    const c = created[0];

    return res.status(201).json({
      success: true,
      data: {
        id: c.id,
        name: c.name,
        passing_average: parseFloat(c.passing_average),
        passing_per_subject: parseFloat(c.passing_per_subject),
        max_failing_subjects: c.max_failing_subjects,
        is_active: c.is_active === 1,
        created_at: c.created_at
      },
      error: null
    });
  } catch (error) {
    console.error('Create promotion criteria error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create promotion criteria.' }
    });
  }
};

const updatePromotionCriteria = async (req, res) => {
  try {
    const { criteria_id } = req.params;
    const schoolId = req.user.school_id;
    const { name, passing_average, passing_per_subject, max_failing_subjects, is_active } = req.body;

    const [existing] = await pool.query(
      'SELECT * FROM promotion_criteria WHERE id = ? AND school_id = ?',
      [criteria_id, schoolId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Promotion criteria not found.' }
      });
    }

    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (passing_average !== undefined) { updates.push('passing_average = ?'); params.push(passing_average); }
    if (passing_per_subject !== undefined) { updates.push('passing_per_subject = ?'); params.push(passing_per_subject); }
    if (max_failing_subjects !== undefined) { updates.push('max_failing_subjects = ?'); params.push(max_failing_subjects); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active); }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'No fields to update.' }
      });
    }

    params.push(criteria_id, schoolId);
    await pool.query(`UPDATE promotion_criteria SET ${updates.join(', ')} WHERE id = ? AND school_id = ?`, params);

    const [updated] = await pool.query('SELECT * FROM promotion_criteria WHERE id = ?', [criteria_id]);
    const c = updated[0];

    return res.status(200).json({
      success: true,
      data: {
        id: c.id,
        name: c.name,
        passing_average: parseFloat(c.passing_average),
        passing_per_subject: parseFloat(c.passing_per_subject),
        max_failing_subjects: c.max_failing_subjects,
        is_active: c.is_active === 1,
        created_at: c.created_at
      },
      error: null
    });
  } catch (error) {
    console.error('Update promotion criteria error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update promotion criteria.' }
    });
  }
};

const deletePromotionCriteria = async (req, res) => {
  try {
    const { criteria_id } = req.params;
    const schoolId = req.user.school_id;

    const [existing] = await pool.query(
      'SELECT * FROM promotion_criteria WHERE id = ? AND school_id = ?',
      [criteria_id, schoolId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'Promotion criteria not found.' }
      });
    }

    await pool.query('DELETE FROM promotion_criteria WHERE id = ? AND school_id = ?', [criteria_id, schoolId]);

    return res.status(200).json({
      success: true,
      data: { message: 'Promotion criteria deleted successfully.' },
      error: null
    });
  } catch (error) {
    console.error('Delete promotion criteria error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete promotion criteria.' }
    });
  }
};

module.exports = {
  // Lifecycle metadata
  listAcademicYearsForLifecycle, listSemestersForLifecycle,
  // Grades
  listGrades, getGrade, createGrade, updateGrade, deleteGrade,
  // Classes (nested under grades - API contract)
  listClassesByGrade, createClassUnderGrade,
  // Classes (direct access)
  listClasses, getClass, createClass, updateClass, deleteClass,
  // Subjects (flat routes)
  listSubjects, createSubject, updateSubject, deleteSubject,
  // Subjects (nested under grades - API contract)
  listSubjectsByGrade, addSubjectToGrade, updateSubjectInGrade, removeSubjectFromGrade, deactivateSubjectInGrade, activateSubjectInGrade,
  // Assessment Types
  listAssessmentTypes, createAssessmentType, updateAssessmentType, deleteAssessmentType,
  // Weight Templates
  listWeightTemplates, getWeightTemplate, createWeightTemplate, updateWeightTemplate, deleteWeightTemplate,
  // Teaching Assignments
  listTeachingAssignments, createTeachingAssignment, updateTeachingAssignment, deleteTeachingAssignment,
  // Teachers
  listTeachers,
  // Class Head
  assignClassHead, removeClassHead,
  // Registrars
  createRegistrar, listRegistrars, updateRegistrar, deactivateRegistrar, activateRegistrar, deleteRegistrar, resetRegistrarPassword,
  // Store House Users
  createStoreHouseUser, listStoreHouseUsers, updateStoreHouseUser, deactivateStoreHouseUser, activateStoreHouseUser, deleteStoreHouseUser, resetStoreHouseUserPassword,
  // Multi-year lifecycle
  initializeClassesForAcademicYear, openSemester, closeSemesterSubmission, lockSemester, reopenSemester,
  // Promotion Criteria
  listPromotionCriteria, getPromotionCriteria, createPromotionCriteria, updatePromotionCriteria, deletePromotionCriteria
};




