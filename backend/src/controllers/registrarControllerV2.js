const xlsx = require('xlsx');
const { pool } = require('../config/db');
const { generatePassword, hashPassword } = require('../utils/passwordGenerator');
const { generateStudentCode, generateStaffCode } = require('../utils/codeGenerator');

const isGenderValid = (g) => g === 'M' || g === 'F';
const toSex = (g) => (g === 'M' ? 'Male' : 'Female');

const getSchool = async (schoolId) => {
  const [rows] = await pool.query('SELECT id, name FROM schools WHERE id = ?', [schoolId]);
  return rows[0] || null;
};

const getGradeInSchool = async (gradeId, schoolId) => {
  const [rows] = await pool.query('SELECT id, name FROM grades WHERE id = ? AND school_id = ?', [gradeId, schoolId]);
  return rows[0] || null;
};

const getClassInSchool = async (classId, schoolId) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, g.id as grade_id
     FROM classes c
     JOIN grades g ON c.grade_id = g.id
     WHERE c.id = ? AND g.school_id = ?`,
    [classId, schoolId]
  );
  return rows[0] || null;
};

const getAcademicYear = async (id) => {
  const [rows] = await pool.query('SELECT id, name FROM academic_years WHERE id = ?', [id]);
  return rows[0] || null;
};

const createOrGetParent = async (connection, schoolId, parent) => {
  const phone = String(parent.phone || '').trim();
  const [existing] = await connection.query(
    "SELECT id, name, phone FROM users WHERE role = 'parent' AND phone = ? LIMIT 1",
    [phone]
  );
  if (existing.length > 0) {
    return { id: existing[0].id, full_name: existing[0].name, phone: existing[0].phone, is_new_account: false, credentials: null };
  }

  const firstName = String(parent.first_name || '').trim();
  const lastName = String(parent.last_name || '').trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const tempPassword = generatePassword();
  const hashed = await hashPassword(tempPassword);

  const [inserted] = await connection.query(
    `INSERT INTO users
      (name, first_name, last_name, username, email, password, phone, gender, role, school_id, is_active, must_change_password)
     VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, 'parent', ?, true, false)`,
    [fullName, firstName, lastName, phone, hashed, phone, schoolId]
  );

  return {
    id: inserted.insertId,
    full_name: fullName,
    phone,
    is_new_account: true,
    credentials: { username: phone, temporary_password: tempPassword, must_change_password: false }
  };
};

const createStudent = async (req, res) => {
  let connection;
  try {
    const schoolId = req.user.school_id;
    const { first_name, last_name, gender, date_of_birth, grade_id, class_id, academic_year_id, parent } = req.body;
    if (!first_name || !last_name || !gender || !date_of_birth || !grade_id || !class_id || !academic_year_id) {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Missing required student fields.' } });
    }
    if (!parent || !parent.first_name || !parent.last_name || !parent.phone || !parent.relationship) {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Missing required parent fields.' } });
    }
    if (!isGenderValid(gender)) {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Gender must be M or F.' } });
    }

    const grade = await getGradeInSchool(grade_id, schoolId);
    const cls = await getClassInSchool(class_id, schoolId);
    const year = await getAcademicYear(academic_year_id);
    if (!grade || !cls || !year || Number(cls.grade_id) !== Number(grade_id)) {
      return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Grade, class, or academic year not found.' } });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    const studentCode = await generateStudentCode(schoolId, new Date().getFullYear());
    const tempPassword = generatePassword();
    const hashed = await hashPassword(tempPassword);
    const fullName = `${first_name} ${last_name}`.trim();

    const [userInserted] = await connection.query(
      `INSERT INTO users
        (name, first_name, last_name, username, email, password, phone, gender, role, school_id, is_active, must_change_password)
       VALUES (?, ?, ?, ?, NULL, ?, NULL, ?, 'student', ?, true, true)`,
      [fullName, first_name, last_name, studentCode, hashed, gender, schoolId]
    );
    const [studentInserted] = await connection.query(
      `INSERT INTO students (user_id, class_id, student_id_number, date_of_birth, sex, date_of_admission, academic_year_id)
       VALUES (?, ?, ?, ?, ?, CURDATE(), ?)`,
      [userInserted.insertId, class_id, studentCode, date_of_birth, toSex(gender), academic_year_id]
    );
    const parentResult = await createOrGetParent(connection, schoolId, parent);
    await connection.query(
      `INSERT INTO student_parents (student_id, parent_id, relationship)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE relationship = VALUES(relationship)`,
      [studentInserted.insertId, parentResult.id, String(parent.relationship).toLowerCase()]
    );

    await connection.commit();
    return res.status(201).json({
      success: true,
      data: {
        student: {
          id: studentInserted.insertId,
          student_code: studentCode,
          first_name,
          last_name,
          full_name: fullName,
          gender,
          date_of_birth,
          grade: { id: grade.id, name: grade.name },
          class: { id: cls.id, name: cls.name },
          academic_year: { id: year.id, name: year.name },
          status: 'active',
          created_at: new Date().toISOString()
        },
        student_credentials: { username: studentCode, temporary_password: tempPassword, must_change_password: true },
        parent: {
          id: parentResult.id,
          full_name: parentResult.full_name,
          phone: parentResult.phone,
          relationship: String(parent.relationship).toLowerCase(),
          is_new_account: parentResult.is_new_account
        },
        parent_credentials: parentResult.credentials
      },
      error: null
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Create student error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while creating student.' } });
  } finally {
    if (connection) connection.release();
  }
};

const listStudents = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    let whereClause = "u.role = 'student' AND u.school_id = ?";
    const params = [schoolId];
    if (req.query.grade_id) { whereClause += ' AND g.id = ?'; params.push(req.query.grade_id); }
    if (req.query.class_id) { whereClause += ' AND c.id = ?'; params.push(req.query.class_id); }
    if (req.query.academic_year_id) { whereClause += ' AND s.academic_year_id = ?'; params.push(req.query.academic_year_id); }
    if (req.query.status && req.query.status !== 'all') { whereClause += ' AND u.is_active = ?'; params.push(req.query.status === 'active'); }
    if (req.query.search) { whereClause += ' AND (u.name LIKE ? OR s.student_id_number LIKE ?)'; params.push(`%${req.query.search}%`, `%${req.query.search}%`); }
    if (req.query.gender) { whereClause += ' AND u.gender = ?'; params.push(req.query.gender); }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       WHERE ${whereClause}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT s.id, s.student_id_number, s.date_of_birth, u.name as full_name, u.gender, u.is_active, u.created_at,
              g.id as grade_id, g.name as grade_name, c.id as class_id, c.name as class_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       WHERE ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return res.status(200).json({
      success: true,
      data: {
        items: rows.map((r) => ({
          id: r.id,
          student_code: r.student_id_number,
          full_name: r.full_name,
          gender: r.gender,
          date_of_birth: r.date_of_birth,
          grade: { id: r.grade_id, name: r.grade_name },
          class: { id: r.class_id, name: r.class_name },
          status: r.is_active ? 'active' : 'inactive',
          created_at: r.created_at
        })),
        pagination: { page, limit, total_items: countRows[0].total, total_pages: Math.ceil(countRows[0].total / limit) }
      },
      error: null
    });
  } catch (error) {
    console.error('List students error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while fetching students.' } });
  }
};

const createTeacher = async (req, res) => {
  let connection;
  try {
    const schoolId = req.user.school_id;
    const { first_name, last_name, gender, date_of_birth, email, phone, qualification, specialization } = req.body;
    if (!first_name || !last_name || !gender || !phone) {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'first_name, last_name, gender, and phone are required.' } });
    }
    if (!isGenderValid(gender)) {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Gender must be M or F.' } });
    }
    if (email) {
      const [exists] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
      if (exists.length > 0) {
        return res.status(409).json({ success: false, data: null, error: { code: 'CONFLICT', message: 'Email already exists.' } });
      }
    }
    const school = await getSchool(schoolId);
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const staffCode = await generateStaffCode(schoolId, new Date().getFullYear());
    const tempPassword = generatePassword();
    const hashed = await hashPassword(tempPassword);
    const fullName = `${first_name} ${last_name}`.trim();

    const [userInserted] = await connection.query(
      `INSERT INTO users
        (name, first_name, last_name, username, email, password, phone, gender, role, school_id, is_active, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'teacher', ?, true, true)`,
      [fullName, first_name, last_name, staffCode, email || null, hashed, phone, gender, schoolId]
    );
    const [teacherInserted] = await connection.query(
      `INSERT INTO teachers (user_id, staff_code, date_of_birth, qualification, specialization, school_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userInserted.insertId, staffCode, date_of_birth || null, qualification || null, specialization || null, schoolId]
    );

    await connection.commit();
    return res.status(201).json({
      success: true,
      data: {
        teacher: {
          id: teacherInserted.insertId,
          staff_code: staffCode,
          first_name,
          last_name,
          full_name: fullName,
          gender,
          date_of_birth: date_of_birth || null,
          email: email || null,
          phone,
          qualification: qualification || null,
          specialization: specialization || null,
          school: { id: school.id, name: school.name },
          status: 'active',
          created_at: new Date().toISOString()
        },
        credentials: { username: staffCode, temporary_password: tempPassword, must_change_password: true }
      },
      error: null
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Create teacher error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while creating teacher.' } });
  } finally {
    if (connection) connection.release();
  }
};

const listTeachers = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    let whereClause = "u.school_id = ? AND u.role IN ('teacher','class_head')";
    const params = [schoolId];
    if (req.query.status && req.query.status !== 'all') { whereClause += ' AND u.is_active = ?'; params.push(req.query.status === 'active'); }
    if (req.query.search) { whereClause += ' AND (u.name LIKE ? OR t.staff_code LIKE ? OR u.email LIKE ?)'; params.push(`%${req.query.search}%`, `%${req.query.search}%`, `%${req.query.search}%`); }
    if (req.query.gender) { whereClause += ' AND u.gender = ?'; params.push(req.query.gender); }
    if (req.query.specialization) { whereClause += ' AND t.specialization LIKE ?'; params.push(`%${req.query.specialization}%`); }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM teachers t JOIN users u ON t.user_id = u.id WHERE ${whereClause}`, params);
    const [rows] = await pool.query(
      `SELECT t.id, t.staff_code, t.qualification, t.specialization, u.name as full_name, u.gender, u.email, u.phone, u.is_active, u.created_at
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return res.status(200).json({
      success: true,
      data: {
        items: rows.map((r) => ({
          id: r.id,
          staff_code: r.staff_code,
          full_name: r.full_name,
          gender: r.gender,
          email: r.email,
          phone: r.phone,
          qualification: r.qualification,
          specialization: r.specialization,
          status: r.is_active ? 'active' : 'inactive',
          created_at: r.created_at
        })),
        pagination: { page, limit, total_items: countRows[0].total, total_pages: Math.ceil(countRows[0].total / limit) }
      },
      error: null
    });
  } catch (error) {
    console.error('List teachers error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while fetching teachers.' } });
  }
};

const getStudent = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { student_id } = req.params;
    const [rows] = await pool.query(
      `SELECT s.id, s.student_id_number, s.date_of_birth, s.academic_year_id, u.first_name, u.last_name, u.name as full_name, u.gender, u.username,
              u.must_change_password, u.is_active, u.created_at, u.updated_at, g.id as grade_id, g.name as grade_name,
              c.id as class_id, c.name as class_name, ay.name as academic_year_name, p.id as parent_id, p.name as parent_name, p.phone as parent_phone, sp.relationship
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       LEFT JOIN academic_years ay ON ay.id = s.academic_year_id
       LEFT JOIN student_parents sp ON sp.student_id = s.id
       LEFT JOIN users p ON p.id = sp.parent_id
       WHERE s.id = ? AND g.school_id = ?`,
      [student_id, schoolId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Student not found or does not belong to this school.' } });
    }
    const s = rows[0];
    return res.status(200).json({
      success: true,
      data: {
        id: s.id,
        student_code: s.student_id_number,
        first_name: s.first_name,
        last_name: s.last_name,
        full_name: s.full_name,
        gender: s.gender,
        date_of_birth: s.date_of_birth,
        grade: { id: s.grade_id, name: s.grade_name },
        class: { id: s.class_id, name: s.class_name },
        academic_year: s.academic_year_id ? { id: s.academic_year_id, name: s.academic_year_name } : null,
        parent: s.parent_id ? { id: s.parent_id, full_name: s.parent_name, phone: s.parent_phone, relationship: s.relationship } : null,
        user_account: { username: s.username, must_change_password: !!s.must_change_password, last_login: null },
        status: s.is_active ? 'active' : 'inactive',
        created_at: s.created_at,
        updated_at: s.updated_at
      },
      error: null
    });
  } catch (error) {
    console.error('Get student error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while fetching student details.' } });
  }
};

const updateStudent = async (req, res) => {
  let connection;
  try {
    const schoolId = req.user.school_id;
    const { student_id } = req.params;
    const { first_name, last_name, gender, date_of_birth, class_id } = req.body;

    const [existingRows] = await pool.query(
      `SELECT s.id, s.user_id, u.first_name, u.last_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       WHERE s.id = ? AND g.school_id = ?`,
      [student_id, schoolId]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Student not found.' } });
    }
    if (gender !== undefined && !isGenderValid(gender)) {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Gender must be M or F.' } });
    }
    if (class_id !== undefined) {
      const targetClass = await getClassInSchool(class_id, schoolId);
      if (!targetClass) {
        return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Class not found in this school.' } });
      }
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const userUpdates = [];
    const userParams = [];
    if (first_name !== undefined) { userUpdates.push('first_name = ?'); userParams.push(first_name); }
    if (last_name !== undefined) { userUpdates.push('last_name = ?'); userParams.push(last_name); }
    if (gender !== undefined) { userUpdates.push('gender = ?'); userParams.push(gender); }
    if (first_name !== undefined || last_name !== undefined) {
      const newFirst = first_name !== undefined ? first_name : existingRows[0].first_name;
      const newLast = last_name !== undefined ? last_name : existingRows[0].last_name;
      userUpdates.push('name = ?');
      userParams.push(`${newFirst || ''} ${newLast || ''}`.trim());
    }
    if (userUpdates.length > 0) {
      userParams.push(existingRows[0].user_id);
      await connection.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
    }

    const studentUpdates = [];
    const studentParams = [];
    if (date_of_birth !== undefined) { studentUpdates.push('date_of_birth = ?'); studentParams.push(date_of_birth); }
    if (class_id !== undefined) { studentUpdates.push('class_id = ?'); studentParams.push(class_id); }
    if (gender !== undefined) { studentUpdates.push('sex = ?'); studentParams.push(toSex(gender)); }
    if (studentUpdates.length > 0) {
      studentParams.push(student_id);
      await connection.query(`UPDATE students SET ${studentUpdates.join(', ')} WHERE id = ?`, studentParams);
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      data: {
        id: Number(student_id),
        message: 'Student updated successfully.',
        updated_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Update student error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while updating student.' } });
  } finally {
    if (connection) connection.release();
  }
};

const deactivateStudent = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { student_id } = req.params;
    const [rows] = await pool.query(
      `SELECT s.id, s.student_id_number, u.id as user_id, u.name, u.is_active
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       WHERE s.id = ? AND g.school_id = ?`,
      [student_id, schoolId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Student not found.' } });
    }
    if (!rows[0].is_active) {
      return res.status(409).json({ success: false, data: null, error: { code: 'CONFLICT', message: 'Student is already inactive.' } });
    }
    await pool.query('UPDATE users SET is_active = false, deactivated_at = ? WHERE id = ?', [new Date(), rows[0].user_id]);
    return res.status(200).json({
      success: true,
      data: {
        id: rows[0].id,
        student_code: rows[0].student_id_number,
        full_name: rows[0].name,
        status: 'inactive',
        reason: req.body?.reason || null,
        deactivated_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Deactivate student error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while deactivating student.' } });
  }
};

const activateStudent = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { student_id } = req.params;
    const [rows] = await pool.query(
      `SELECT s.id, s.student_id_number, u.id as user_id, u.name, u.is_active
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       WHERE s.id = ? AND g.school_id = ?`,
      [student_id, schoolId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Student not found.' } });
    }
    if (rows[0].is_active) {
      return res.status(409).json({ success: false, data: null, error: { code: 'CONFLICT', message: 'Student is already active.' } });
    }
    await pool.query('UPDATE users SET is_active = true, deactivated_at = NULL WHERE id = ?', [rows[0].user_id]);
    return res.status(200).json({
      success: true,
      data: {
        id: rows[0].id,
        student_code: rows[0].student_id_number,
        full_name: rows[0].name,
        status: 'active',
        activated_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Activate student error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while activating student.' } });
  }
};

const getTeacher = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { teacher_id } = req.params;
    const [rows] = await pool.query(
      `SELECT t.id, t.staff_code, t.date_of_birth, t.qualification, t.specialization, u.first_name, u.last_name, u.name as full_name, u.gender,
              u.email, u.phone, u.username, u.must_change_password, u.is_active, u.created_at, u.updated_at
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ? AND t.school_id = ?`,
      [teacher_id, schoolId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Teacher not found or does not belong to this school.' } });
    }
    const t = rows[0];
    return res.status(200).json({
      success: true,
      data: {
        id: t.id,
        staff_code: t.staff_code,
        first_name: t.first_name,
        last_name: t.last_name,
        full_name: t.full_name,
        gender: t.gender,
        date_of_birth: t.date_of_birth,
        email: t.email,
        phone: t.phone,
        qualification: t.qualification,
        specialization: t.specialization,
        user_account: {
          username: t.username,
          must_change_password: !!t.must_change_password,
          last_login: null
        },
        status: t.is_active ? 'active' : 'inactive',
        created_at: t.created_at,
        updated_at: t.updated_at
      },
      error: null
    });
  } catch (error) {
    console.error('Get teacher error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while fetching teacher details.' } });
  }
};

const updateTeacher = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { teacher_id } = req.params;
    const { first_name, last_name, email, phone, gender, date_of_birth, qualification, specialization } = req.body;

    const [teacherRows] = await pool.query(
      `SELECT t.id, t.user_id, u.first_name, u.last_name
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ? AND t.school_id = ?`,
      [teacher_id, schoolId]
    );
    if (teacherRows.length === 0) {
      return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Teacher not found.' } });
    }
    if (gender !== undefined && !isGenderValid(gender)) {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Gender must be M or F.' } });
    }
    if (email !== undefined) {
      const [emailRows] = await pool.query('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [email, teacherRows[0].user_id]);
      if (emailRows.length > 0) {
        return res.status(409).json({ success: false, data: null, error: { code: 'CONFLICT', message: 'Email already in use.' } });
      }
    }

    const userUpdates = [];
    const userParams = [];
    if (first_name !== undefined) { userUpdates.push('first_name = ?'); userParams.push(first_name); }
    if (last_name !== undefined) { userUpdates.push('last_name = ?'); userParams.push(last_name); }
    if (email !== undefined) { userUpdates.push('email = ?'); userParams.push(email); }
    if (phone !== undefined) { userUpdates.push('phone = ?'); userParams.push(phone); }
    if (gender !== undefined) { userUpdates.push('gender = ?'); userParams.push(gender); }
    if (first_name !== undefined || last_name !== undefined) {
      const newFirst = first_name !== undefined ? first_name : teacherRows[0].first_name;
      const newLast = last_name !== undefined ? last_name : teacherRows[0].last_name;
      userUpdates.push('name = ?');
      userParams.push(`${newFirst || ''} ${newLast || ''}`.trim());
    }
    if (userUpdates.length > 0) {
      userParams.push(teacherRows[0].user_id);
      await pool.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
    }

    const teacherUpdates = [];
    const teacherParams = [];
    if (date_of_birth !== undefined) { teacherUpdates.push('date_of_birth = ?'); teacherParams.push(date_of_birth); }
    if (qualification !== undefined) { teacherUpdates.push('qualification = ?'); teacherParams.push(qualification); }
    if (specialization !== undefined) { teacherUpdates.push('specialization = ?'); teacherParams.push(specialization); }
    if (teacherUpdates.length > 0) {
      teacherParams.push(teacher_id);
      await pool.query(`UPDATE teachers SET ${teacherUpdates.join(', ')} WHERE id = ?`, teacherParams);
    }

    return res.status(200).json({
      success: true,
      data: {
        id: Number(teacher_id),
        message: 'Teacher updated successfully.',
        updated_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Update teacher error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while updating teacher.' } });
  }
};

const deactivateTeacher = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { teacher_id } = req.params;
    const [rows] = await pool.query(
      `SELECT t.id, t.staff_code, u.id as user_id, u.name, u.is_active
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ? AND t.school_id = ?`,
      [teacher_id, schoolId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Teacher not found.' } });
    }
    if (!rows[0].is_active) {
      return res.status(409).json({ success: false, data: null, error: { code: 'CONFLICT', message: 'Teacher is already inactive.' } });
    }

    await pool.query('UPDATE users SET is_active = false, deactivated_at = ? WHERE id = ?', [new Date(), rows[0].user_id]);
    return res.status(200).json({
      success: true,
      data: {
        id: rows[0].id,
        staff_code: rows[0].staff_code,
        full_name: rows[0].name,
        status: 'inactive',
        reason: req.body?.reason || null,
        deactivated_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Deactivate teacher error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while deactivating teacher.' } });
  }
};

const activateTeacher = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { teacher_id } = req.params;
    const [rows] = await pool.query(
      `SELECT t.id, t.staff_code, u.id as user_id, u.name, u.is_active
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ? AND t.school_id = ?`,
      [teacher_id, schoolId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Teacher not found.' } });
    }
    if (rows[0].is_active) {
      return res.status(409).json({ success: false, data: null, error: { code: 'CONFLICT', message: 'Teacher is already active.' } });
    }

    await pool.query('UPDATE users SET is_active = true, deactivated_at = NULL WHERE id = ?', [rows[0].user_id]);
    return res.status(200).json({
      success: true,
      data: {
        id: rows[0].id,
        staff_code: rows[0].staff_code,
        full_name: rows[0].name,
        status: 'active',
        activated_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Activate teacher error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while activating teacher.' } });
  }
};

const getParent = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { parent_id } = req.params;
    const [rows] = await pool.query(
      `SELECT id, first_name, last_name, name, phone, username, must_change_password, is_active, created_at
       FROM users
       WHERE id = ? AND role = 'parent' AND school_id = ?`,
      [parent_id, schoolId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Parent not found.' } });
    }
    const p = rows[0];
    const [children] = await pool.query(
      `SELECT s.id as student_id, s.student_id_number as student_code, u.name as full_name, g.name as grade_name, c.name as class_name, sp.relationship, u.is_active
       FROM student_parents sp
       JOIN students s ON s.id = sp.student_id
       JOIN users u ON u.id = s.user_id
       JOIN classes c ON c.id = s.class_id
       JOIN grades g ON g.id = c.grade_id
       WHERE sp.parent_id = ?`,
      [parent_id]
    );
    return res.status(200).json({
      success: true,
      data: {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        full_name: p.name,
        phone: p.phone,
        user_account: {
          username: p.username,
          must_change_password: !!p.must_change_password,
          last_login: null
        },
        children: children.map((c) => ({
          student_id: c.student_id,
          student_code: c.student_code,
          full_name: c.full_name,
          grade_name: c.grade_name,
          class_name: c.class_name,
          relationship: c.relationship,
          status: c.is_active ? 'active' : 'inactive'
        })),
        status: p.is_active ? 'active' : 'inactive',
        created_at: p.created_at
      },
      error: null
    });
  } catch (error) {
    console.error('Get parent error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while fetching parent details.' } });
  }
};

const updateParent = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { parent_id } = req.params;
    const { first_name, last_name, phone } = req.body;
    const [rows] = await pool.query(
      `SELECT id, first_name, last_name
       FROM users
       WHERE id = ? AND role = 'parent' AND school_id = ?`,
      [parent_id, schoolId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Parent not found.' } });
    }
    if (phone !== undefined) {
      const [phoneRows] = await pool.query(
        "SELECT id FROM users WHERE role = 'parent' AND phone = ? AND id <> ? LIMIT 1",
        [phone, parent_id]
      );
      if (phoneRows.length > 0) {
        return res.status(409).json({ success: false, data: null, error: { code: 'CONFLICT', message: 'Phone number already in use by another parent.' } });
      }
    }

    const updates = [];
    const params = [];
    if (first_name !== undefined) { updates.push('first_name = ?'); params.push(first_name); }
    if (last_name !== undefined) { updates.push('last_name = ?'); params.push(last_name); }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
      updates.push('username = ?');
      params.push(phone);
    }
    if (first_name !== undefined || last_name !== undefined) {
      const nf = first_name !== undefined ? first_name : rows[0].first_name;
      const nl = last_name !== undefined ? last_name : rows[0].last_name;
      updates.push('name = ?');
      params.push(`${nf || ''} ${nl || ''}`.trim());
    }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'No fields to update.' } });
    }
    params.push(parent_id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query('SELECT id, first_name, last_name, name, phone, username, updated_at FROM users WHERE id = ?', [parent_id]);
    const p = updated[0];
    const usernameChanged = phone !== undefined;
    return res.status(200).json({
      success: true,
      data: {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        full_name: p.name,
        phone: p.phone,
        username_changed: usernameChanged,
        new_username: usernameChanged ? p.username : null,
        updated_at: p.updated_at
      },
      error: null
    });
  } catch (error) {
    console.error('Update parent error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while updating parent.' } });
  }
};

const uploadStudents = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'file is required.' } });
    if (!String(req.file.originalname || '').toLowerCase().endsWith('.xlsx')) {
      return res.status(400).json({ success: false, data: null, error: { code: 'INVALID_FILE_FORMAT', message: 'Only .xlsx files are supported.' } });
    }
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    return res.status(200).json({
      success: true,
      data: { upload_id: `upload-stu-${Date.now()}`, total_rows: rows.length, successful: 0, failed: 0, results: { created_students: [], failed_rows: [] }, uploaded_at: new Date().toISOString() },
      error: null
    });
  } catch (error) {
    console.error('Upload students error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'Upload processing failed.' } });
  }
};

const getStudentUploadTemplate = async (req, res) => res.status(200).json({
  success: true,
  data: {
    download_url: '/api/v1/downloads/templates/student_upload_template.xlsx',
    filename: 'student_upload_template.xlsx',
    columns: ['first_name', 'last_name', 'gender', 'date_of_birth', 'parent_first_name', 'parent_last_name', 'parent_phone', 'parent_relationship']
  },
  error: null
});

const uploadTeachers = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'file is required.' } });
    if (!String(req.file.originalname || '').toLowerCase().endsWith('.xlsx')) {
      return res.status(400).json({ success: false, data: null, error: { code: 'INVALID_FILE_FORMAT', message: 'Only .xlsx files are supported.' } });
    }
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    return res.status(200).json({
      success: true,
      data: { upload_id: `upload-tch-${Date.now()}`, total_rows: rows.length, successful: 0, failed: 0, results: { created_teachers: [], failed_rows: [] }, uploaded_at: new Date().toISOString() },
      error: null
    });
  } catch (error) {
    console.error('Upload teachers error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'Upload processing failed.' } });
  }
};

const getTeacherUploadTemplate = async (req, res) => res.status(200).json({
  success: true,
  data: {
    download_url: '/api/v1/downloads/templates/teacher_upload_template.xlsx',
    filename: 'teacher_upload_template.xlsx',
    columns: ['first_name', 'last_name', 'gender', 'date_of_birth', 'email', 'phone', 'qualification', 'specialization']
  },
  error: null
});

const resetUserPassword = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const { user_id } = req.params;
    const [rows] = await pool.query('SELECT id, name, username, role, school_id FROM users WHERE id = ?', [user_id]);
    if (rows.length === 0) return res.status(404).json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'User not found.' } });
    const target = rows[0];
    if (target.school_id !== schoolId || !['student', 'teacher', 'class_head', 'parent'].includes(target.role)) {
      return res.status(403).json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'You cannot reset password for this user.' } });
    }
    const temp = generatePassword();
    const hashed = await hashPassword(temp);
    const mustChange = target.role === 'parent' ? false : true;
    await pool.query('UPDATE users SET password = ?, must_change_password = ? WHERE id = ?', [hashed, mustChange, user_id]);
    return res.status(200).json({
      success: true,
      data: {
        user_id: target.id,
        full_name: target.name,
        username: target.username,
        role: target.role,
        new_temporary_password: temp,
        must_change_password: mustChange,
        reset_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Reset user password error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while resetting password.' } });
  }
};

const listParents = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    let whereClause = "p.role = 'parent' AND p.school_id = ?";
    const params = [schoolId];
    if (search) { whereClause += ' AND (p.name LIKE ? OR p.phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM users p WHERE ${whereClause}`, params);
    const [parents] = await pool.query(
      `SELECT p.id, p.name, p.phone, p.is_active, p.created_at
       FROM users p
       WHERE ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const items = [];
    for (const p of parents) {
      const [children] = await pool.query(
        `SELECT s.id as student_id, s.student_id_number as student_code, u.name as full_name, c.name as class_name, sp.relationship
         FROM student_parents sp
         JOIN students s ON s.id = sp.student_id
         JOIN users u ON u.id = s.user_id
         JOIN classes c ON c.id = s.class_id
         WHERE sp.parent_id = ?`,
        [p.id]
      );
      items.push({
        id: p.id,
        full_name: p.name,
        phone: p.phone,
        children_count: children.length,
        children,
        status: p.is_active ? 'active' : 'inactive',
        created_at: p.created_at
      });
    }
    return res.status(200).json({
      success: true,
      data: {
        items,
        pagination: { page, limit, total_items: countRows[0].total, total_pages: Math.ceil(countRows[0].total / limit) }
      },
      error: null
    });
  } catch (error) {
    console.error('List parents error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while fetching parents.' } });
  }
};

const getStatistics = async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const school = await getSchool(schoolId);
    const [[studentTotal]] = await pool.query("SELECT COUNT(*) as total FROM users WHERE school_id = ? AND role = 'student'", [schoolId]);
    const [[studentActive]] = await pool.query("SELECT COUNT(*) as total FROM users WHERE school_id = ? AND role = 'student' AND is_active = true", [schoolId]);
    const [[studentMale]] = await pool.query("SELECT COUNT(*) as total FROM users WHERE school_id = ? AND role = 'student' AND gender = 'M'", [schoolId]);
    const [[studentFemale]] = await pool.query("SELECT COUNT(*) as total FROM users WHERE school_id = ? AND role = 'student' AND gender = 'F'", [schoolId]);
    const [[teacherTotal]] = await pool.query("SELECT COUNT(*) as total FROM users WHERE school_id = ? AND role IN ('teacher','class_head')", [schoolId]);
    const [[teacherActive]] = await pool.query("SELECT COUNT(*) as total FROM users WHERE school_id = ? AND role IN ('teacher','class_head') AND is_active = true", [schoolId]);
    const [[teacherMale]] = await pool.query("SELECT COUNT(*) as total FROM users WHERE school_id = ? AND role IN ('teacher','class_head') AND gender = 'M'", [schoolId]);
    const [[teacherFemale]] = await pool.query("SELECT COUNT(*) as total FROM users WHERE school_id = ? AND role IN ('teacher','class_head') AND gender = 'F'", [schoolId]);
    const [[parentTotal]] = await pool.query("SELECT COUNT(*) as total FROM users WHERE school_id = ? AND role = 'parent'", [schoolId]);
    const [[parentActive]] = await pool.query("SELECT COUNT(*) as total FROM users WHERE school_id = ? AND role = 'parent' AND is_active = true", [schoolId]);

    const [byGradeRows] = await pool.query(
      `SELECT g.name as grade_name, COUNT(s.id) as total
       FROM students s
       JOIN classes c ON s.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       JOIN users u ON s.user_id = u.id
       WHERE g.school_id = ?
       GROUP BY g.name`,
      [schoolId]
    );
    const byGrade = {};
    byGradeRows.forEach((r) => { byGrade[r.grade_name] = r.total; });

    return res.status(200).json({
      success: true,
      data: {
        school: school ? { id: school.id, name: school.name } : null,
        students: {
          total: studentTotal.total,
          active: studentActive.total,
          inactive: studentTotal.total - studentActive.total,
          by_gender: { male: studentMale.total, female: studentFemale.total },
          by_grade: byGrade
        },
        teachers: {
          total: teacherTotal.total,
          active: teacherActive.total,
          inactive: teacherTotal.total - teacherActive.total,
          by_gender: { male: teacherMale.total, female: teacherFemale.total }
        },
        parents: {
          total: parentTotal.total,
          active: parentActive.total,
          inactive: parentTotal.total - parentActive.total
        },
        recent_registrations: { students_this_month: 0, teachers_this_month: 0 },
        last_updated: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Registrar statistics error:', error);
    return res.status(500).json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while fetching statistics.' } });
  }
};

module.exports = {
  createStudent,
  listStudents,
  getStudent,
  updateStudent,
  deactivateStudent,
  activateStudent,
  createTeacher,
  listTeachers,
  getTeacher,
  updateTeacher,
  deactivateTeacher,
  activateTeacher,
  uploadStudents,
  getStudentUploadTemplate,
  uploadTeachers,
  getTeacherUploadTemplate,
  resetUserPassword,
  listParents,
  getParent,
  updateParent,
  getStatistics
};

