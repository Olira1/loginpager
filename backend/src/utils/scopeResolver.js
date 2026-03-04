// Scope Resolver - Shared logic for Teacher vs Class Head portal per academic year
// Used by both classHeadController and teacherController for getScope endpoint
// When user has BOTH class_head (e.g. 9A) and teacher (e.g. 10A) for DIFFERENT classes,
// returns 'teacher' so they use Teacher portal for that year.

const { pool } = require('../config/db');

const getClassHeadClass = async (userId, academicYearId = null) => {
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
  return classes.length > 0 ? classes[0] : null;
};

const getTeacherAssignedClass = async (userId, academicYearId = null) => {
  let query = `SELECT DISTINCT c.id, c.name, c.academic_year_id, g.name as grade_name, g.id as grade_id
     FROM teaching_assignments ta
     JOIN classes c ON c.id = ta.class_id
     JOIN grades g ON g.id = c.grade_id
     WHERE ta.teacher_id = ?`;
  const params = [userId];
  if (academicYearId) {
    query += ' AND ta.academic_year_id = ?';
    params.push(academicYearId);
  }
  query += ' ORDER BY c.academic_year_id DESC, c.id ASC';
  const [classes] = await pool.query(query, params);
  return classes.length > 0 ? classes[0] : null;
};

/**
 * Resolve scope for a user in a given academic year.
 * Returns { classInfo, scope } where scope is 'class_head' | 'teacher' | null.
 * - Only class_head → class_head portal
 * - Only teacher → teacher portal
 * - Both, different classes (e.g. class_head 9A, teacher 10A) → teacher portal
 * - Both, same class → class_head portal
 */
const resolveReadableClassContext = async (userId, academicYearId = null) => {
  const [teacherClass, classHeadClass] = await Promise.all([
    getTeacherAssignedClass(userId, academicYearId),
    getClassHeadClass(userId, academicYearId)
  ]);

  if (classHeadClass && !teacherClass) return { classInfo: classHeadClass, scope: 'class_head' };
  if (teacherClass && !classHeadClass) return { classInfo: teacherClass, scope: 'teacher' };
  if (teacherClass && classHeadClass && teacherClass.id !== classHeadClass.id) {
    return { classInfo: teacherClass, scope: 'teacher' };
  }
  if (classHeadClass) return { classInfo: classHeadClass, scope: 'class_head' };
  if (teacherClass) return { classInfo: teacherClass, scope: 'teacher' };
  return { classInfo: null, scope: null };
};

module.exports = { resolveReadableClassContext };
