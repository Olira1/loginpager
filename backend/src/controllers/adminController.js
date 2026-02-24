// Admin Controller
// Handles school management, promotion criteria, and platform statistics

const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const { validatePasswordStrength } = require('../utils/passwordGenerator');

// ==========================================
// SCHOOL MANAGEMENT
// ==========================================

/**
 * GET /api/v1/admin/schools
 * List all schools with pagination and filtering
 */
const listSchools = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'all';
    const search = req.query.search || '';

    // Build query conditions
    let whereClause = '1=1';
    const params = [];

    if (status !== 'all') {
      whereClause += ' AND s.status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (s.name LIKE ? OR s.code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Get total count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM schools s WHERE ${whereClause}`,
      params
    );
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // Get schools with school head info
    const [schools] = await pool.query(
      `SELECT s.id, s.name, s.code, s.address, s.phone, s.email, s.status,
              s.school_head_id, s.created_at, s.updated_at,
              u.name as school_head_name, u.phone as school_head_phone
       FROM schools s
       LEFT JOIN users u ON s.school_head_id = u.id
       WHERE ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Format response
    const items = schools.map(school => ({
      id: school.id,
      name: school.name,
      code: school.code,
      address: school.address,
      phone: school.phone,
      email: school.email,
      school_head: school.school_head_id ? {
        id: school.school_head_id,
        name: school.school_head_name,
        phone: school.school_head_phone
      } : null,
      status: school.status,
      created_at: school.created_at,
      updated_at: school.updated_at
    }));

    return res.status(200).json({
      success: true,
      data: {
        items,
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
    console.error('List schools error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching schools.'
      }
    });
  }
};

/**
 * GET /api/v1/admin/schools/:school_id
 * Get school details with statistics
 */
const getSchool = async (req, res) => {
  try {
    const { school_id } = req.params;

    // Get school with school head info
    const [schools] = await pool.query(
      `SELECT s.*, u.name as school_head_name, u.phone as school_head_phone
       FROM schools s
       LEFT JOIN users u ON s.school_head_id = u.id
       WHERE s.id = ?`,
      [school_id]
    );

    if (schools.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'School not found.'
        }
      });
    }

    const school = schools[0];

    // Get statistics
    const [studentCount] = await pool.query(
      `SELECT COUNT(*) as total FROM students st
       JOIN classes c ON st.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       WHERE g.school_id = ?`,
      [school_id]
    );

    const [teacherCount] = await pool.query(
      `SELECT COUNT(*) as total FROM users 
       WHERE school_id = ? AND role IN ('teacher', 'class_head')`,
      [school_id]
    );

    const [classCount] = await pool.query(
      `SELECT COUNT(*) as total FROM classes c
       JOIN grades g ON c.grade_id = g.id
       WHERE g.school_id = ?`,
      [school_id]
    );

    return res.status(200).json({
      success: true,
      data: {
        id: school.id,
        name: school.name,
        code: school.code,
        address: school.address,
        phone: school.phone,
        email: school.email,
        school_head: school.school_head_id ? {
          id: school.school_head_id,
          name: school.school_head_name,
          phone: school.school_head_phone
        } : null,
        status: school.status,
        statistics: {
          total_students: studentCount[0].total,
          total_teachers: teacherCount[0].total,
          total_classes: classCount[0].total
        },
        created_at: school.created_at,
        updated_at: school.updated_at
      },
      error: null
    });
  } catch (error) {
    console.error('Get school error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching school details.'
      }
    });
  }
};

/**
 * POST /api/v1/admin/schools
 * Create a new school
 */
const createSchool = async (req, res) => {
  try {
    const { name, code, address, phone, email, school_head_id } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name and code are required.'
        }
      });
    }

    // Check if code already exists
    const [existing] = await pool.query(
      'SELECT id FROM schools WHERE code = ?',
      [code]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'CONFLICT',
          message: 'School code already exists.'
        }
      });
    }

    // Validate school_head_id if provided
    if (school_head_id) {
      const [headUser] = await pool.query(
        'SELECT id, name, phone FROM users WHERE id = ? AND role = ?',
        [school_head_id, 'school_head']
      );

      if (headUser.length === 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid school head ID or user is not a school head.'
          }
        });
      }
    }

    // Create school
    const [result] = await pool.query(
      `INSERT INTO schools (name, code, address, phone, email, school_head_id, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [name, code, address || null, phone || null, email || null, school_head_id || null]
    );

    // Update school_head's school_id
    if (school_head_id) {
      await pool.query(
        'UPDATE users SET school_id = ? WHERE id = ?',
        [result.insertId, school_head_id]
      );
    }

    // Get created school with school head info
    const [newSchool] = await pool.query(
      `SELECT s.*, u.name as school_head_name, u.phone as school_head_phone
       FROM schools s
       LEFT JOIN users u ON s.school_head_id = u.id
       WHERE s.id = ?`,
      [result.insertId]
    );

    const school = newSchool[0];

    return res.status(201).json({
      success: true,
      data: {
        id: school.id,
        name: school.name,
        code: school.code,
        address: school.address,
        phone: school.phone,
        email: school.email,
        school_head: school.school_head_id ? {
          id: school.school_head_id,
          name: school.school_head_name,
          phone: school.school_head_phone
        } : null,
        status: school.status,
        created_at: school.created_at
      },
      error: null
    });
  } catch (error) {
    console.error('Create school error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while creating school.'
      }
    });
  }
};

/**
 * PUT /api/v1/admin/schools/:school_id
 * Update school
 */
const updateSchool = async (req, res) => {
  try {
    const { school_id } = req.params;
    const { name, address, phone, email, school_head_id } = req.body;

    // Check if school exists
    const [existing] = await pool.query(
      'SELECT * FROM schools WHERE id = ?',
      [school_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'School not found.'
        }
      });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (school_head_id !== undefined) {
      updates.push('school_head_id = ?');
      params.push(school_head_id);
    }

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

    params.push(school_id);

    await pool.query(
      `UPDATE schools SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated school
    const [updated] = await pool.query(
      `SELECT s.*, u.name as school_head_name, u.phone as school_head_phone
       FROM schools s
       LEFT JOIN users u ON s.school_head_id = u.id
       WHERE s.id = ?`,
      [school_id]
    );

    const school = updated[0];

    return res.status(200).json({
      success: true,
      data: {
        id: school.id,
        name: school.name,
        code: school.code,
        address: school.address,
        phone: school.phone,
        email: school.email,
        school_head: school.school_head_id ? {
          id: school.school_head_id,
          name: school.school_head_name,
          phone: school.school_head_phone
        } : null,
        status: school.status,
        updated_at: school.updated_at
      },
      error: null
    });
  } catch (error) {
    console.error('Update school error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating school.'
      }
    });
  }
};

/**
 * DELETE /api/v1/admin/schools/:school_id
 * Delete school (soft delete by setting status to inactive)
 */
const deleteSchool = async (req, res) => {
  try {
    const { school_id } = req.params;

    // Check if school exists
    const [existing] = await pool.query(
      'SELECT * FROM schools WHERE id = ?',
      [school_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'School not found.'
        }
      });
    }

    // Check if school has active users
    const [activeUsers] = await pool.query(
      'SELECT COUNT(*) as total FROM users WHERE school_id = ? AND is_active = true',
      [school_id]
    );

    if (activeUsers[0].total > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'CONFLICT',
          message: 'School has active users and cannot be deleted. Deactivate the school instead.'
        }
      });
    }

    // Delete school
    await pool.query('DELETE FROM schools WHERE id = ?', [school_id]);

    return res.status(200).json({
      success: true,
      data: {
        message: 'School deleted successfully.'
      },
      error: null
    });
  } catch (error) {
    console.error('Delete school error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while deleting school.'
      }
    });
  }
};

/**
 * PATCH /api/v1/admin/schools/:school_id/activate
 * Activate a school
 */
const activateSchool = async (req, res) => {
  try {
    const { school_id } = req.params;

    const [existing] = await pool.query(
      'SELECT * FROM schools WHERE id = ?',
      [school_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'School not found.'
        }
      });
    }

    if (existing[0].status === 'active') {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'CONFLICT',
          message: 'School is already active.'
        }
      });
    }

    await pool.query(
      "UPDATE schools SET status = 'active' WHERE id = ?",
      [school_id]
    );

    return res.status(200).json({
      success: true,
      data: {
        id: parseInt(school_id),
        name: existing[0].name,
        status: 'active',
        activated_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Activate school error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while activating school.'
      }
    });
  }
};

/**
 * PATCH /api/v1/admin/schools/:school_id/deactivate
 * Deactivate a school
 */
const deactivateSchool = async (req, res) => {
  try {
    const { school_id } = req.params;

    const [existing] = await pool.query(
      'SELECT * FROM schools WHERE id = ?',
      [school_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'School not found.'
        }
      });
    }

    if (existing[0].status === 'inactive') {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'CONFLICT',
          message: 'School is already inactive.'
        }
      });
    }

    await pool.query(
      "UPDATE schools SET status = 'inactive' WHERE id = ?",
      [school_id]
    );

    return res.status(200).json({
      success: true,
      data: {
        id: parseInt(school_id),
        name: existing[0].name,
        status: 'inactive',
        deactivated_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Deactivate school error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while deactivating school.'
      }
    });
  }
};

// ==========================================
// SCHOOL HEAD MANAGEMENT
// ==========================================

/**
 * POST /api/v1/admin/school-heads
 * Create school head user and attach to school
 */
const createSchoolHead = async (req, res) => {
  let connection;
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      gender,
      password,
      school_id
    } = req.body;

    if (!first_name || !last_name || !email || !phone || !gender || !password || !school_id) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'first_name, last_name, email, phone, gender, password, and school_id are required.'
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

    const [schoolRows] = await pool.query(
      'SELECT id, name, status FROM schools WHERE id = ?',
      [school_id]
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

    if (schoolRows[0].status !== 'active') {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'School must be active to assign a school head.'
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

    const [activeHead] = await pool.query(
      `SELECT id FROM users
       WHERE role = 'school_head' AND school_id = ? AND is_active = true
       LIMIT 1`,
      [school_id]
    );
    if (activeHead.length > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'CONFLICT',
          message: 'School already has an active school head.'
        }
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const fullName = `${first_name} ${last_name}`.trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    const [insertResult] = await connection.query(
      `INSERT INTO users
        (name, first_name, last_name, username, email, password, phone, gender, role, school_id, is_active, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'school_head', ?, true, true)`,
      [fullName, first_name, last_name, email, email, hashedPassword, phone, gender, school_id]
    );

    await connection.query(
      'UPDATE schools SET school_head_id = ? WHERE id = ?',
      [insertResult.insertId, school_id]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      data: {
        id: insertResult.insertId,
        first_name,
        last_name,
        full_name: fullName,
        email,
        phone,
        gender,
        role: 'school_head',
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
    if (connection) await connection.rollback();
    console.error('Create school head error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while creating school head.'
      }
    });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * GET /api/v1/admin/school-heads
 * List school heads with pagination and filters
 */
const listSchoolHeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'all';
    const schoolId = req.query.school_id;
    const search = req.query.search || '';

    let whereClause = "u.role = 'school_head'";
    const params = [];

    if (status === 'active') {
      whereClause += ' AND u.is_active = true';
    } else if (status === 'inactive') {
      whereClause += ' AND u.is_active = false';
    }

    if (schoolId) {
      whereClause += ' AND u.school_id = ?';
      params.push(schoolId);
    }

    if (search) {
      whereClause += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`,
      params
    );
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.first_name, u.last_name, u.email, u.phone, u.gender, u.role, u.school_id,
              u.is_active, u.created_at, s.name as school_name
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE ${whereClause}
       ORDER BY u.created_at DESC
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
          school: u.school_id ? {
            id: u.school_id,
            name: u.school_name
          } : null,
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
    console.error('List school heads error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching school heads.'
      }
    });
  }
};

/**
 * GET /api/v1/admin/school-heads/:user_id
 * Get one school head details
 */
const getSchoolHead = async (req, res) => {
  try {
    const { user_id } = req.params;

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.first_name, u.last_name, u.email, u.phone, u.gender, u.role,
              u.school_id, u.is_active, u.must_change_password, u.created_at, u.updated_at,
              s.name as school_name
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.id = ? AND u.role = 'school_head'`,
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'School head not found.'
        }
      });
    }

    const u = rows[0];
    return res.status(200).json({
      success: true,
      data: {
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        full_name: u.name,
        email: u.email,
        phone: u.phone,
        gender: u.gender,
        role: u.role,
        school: u.school_id ? {
          id: u.school_id,
          name: u.school_name
        } : null,
        status: u.is_active ? 'active' : 'inactive',
        must_change_password: !!u.must_change_password,
        created_at: u.created_at,
        updated_at: u.updated_at
      },
      error: null
    });
  } catch (error) {
    console.error('Get school head error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching school head.'
      }
    });
  }
};

/**
 * PUT /api/v1/admin/school-heads/:user_id
 * Update school head details
 */
const updateSchoolHead = async (req, res) => {
  let connection;
  try {
    const { user_id } = req.params;
    const { first_name, last_name, email, phone, gender, school_id } = req.body;

    const [existing] = await pool.query(
      `SELECT id, school_id FROM users
       WHERE id = ? AND role = 'school_head'`,
      [user_id]
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'School head not found.'
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
      const [emailExists] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
        [email, user_id]
      );
      if (emailExists.length > 0) {
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

    let targetSchool = null;
    if (school_id !== undefined) {
      const [schoolRows] = await pool.query(
        'SELECT id, name, status FROM schools WHERE id = ?',
        [school_id]
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
      if (schoolRows[0].status !== 'active') {
        return res.status(400).json({
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'School must be active to assign a school head.'
          }
        });
      }

      const [activeHead] = await pool.query(
        `SELECT id FROM users
         WHERE role = 'school_head' AND school_id = ? AND is_active = true AND id <> ?
         LIMIT 1`,
        [school_id, user_id]
      );
      if (activeHead.length > 0) {
        return res.status(409).json({
          success: false,
          data: null,
          error: {
            code: 'CONFLICT',
            message: 'School already has an active school head.'
          }
        });
      }
      targetSchool = schoolRows[0];
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
    if (school_id !== undefined) { updates.push('school_id = ?'); params.push(school_id); }

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

    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (first_name !== undefined || last_name !== undefined) {
      const [nameRows] = await connection.query(
        'SELECT first_name, last_name FROM users WHERE id = ?',
        [user_id]
      );
      const updatedFirst = first_name !== undefined ? first_name : nameRows[0].first_name;
      const updatedLast = last_name !== undefined ? last_name : nameRows[0].last_name;
      updates.push('name = ?');
      params.push(`${updatedFirst || ''} ${updatedLast || ''}`.trim());
    }

    params.push(user_id);
    await connection.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    if (school_id !== undefined) {
      await connection.query(
        'UPDATE schools SET school_head_id = NULL WHERE school_head_id = ?',
        [user_id]
      );
      await connection.query(
        'UPDATE schools SET school_head_id = ? WHERE id = ?',
        [user_id, school_id]
      );
    }

    const [updatedRows] = await connection.query(
      `SELECT u.id, u.name, u.first_name, u.last_name, u.email, u.phone, u.gender, u.school_id, u.updated_at,
              s.name as school_name
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.id = ?`,
      [user_id]
    );

    await connection.commit();

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
        gender: u.gender,
        school: u.school_id ? { id: u.school_id, name: u.school_name } : null,
        updated_at: u.updated_at
      },
      error: null
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Update school head error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating school head.'
      }
    });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * PATCH /api/v1/admin/school-heads/:user_id/deactivate
 * Deactivate school head account
 */
const deactivateSchoolHead = async (req, res) => {
  let connection;
  try {
    const { user_id } = req.params;

    const [rows] = await pool.query(
      `SELECT id, name, is_active
       FROM users
       WHERE id = ? AND role = 'school_head'`,
      [user_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'School head not found.'
        }
      });
    }

    if (!rows[0].is_active) {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'CONFLICT',
          message: 'School head is already inactive.'
        }
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query(
      'UPDATE users SET is_active = false, deactivated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [user_id]
    );
    await connection.query(
      'UPDATE schools SET school_head_id = NULL WHERE school_head_id = ?',
      [user_id]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      data: {
        id: parseInt(user_id),
        full_name: rows[0].name,
        status: 'inactive',
        deactivated_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Deactivate school head error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while deactivating school head.'
      }
    });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * PATCH /api/v1/admin/school-heads/:user_id/activate
 * Activate school head account
 */
const activateSchoolHead = async (req, res) => {
  let connection;
  try {
    const { user_id } = req.params;

    const [rows] = await pool.query(
      `SELECT id, name, school_id, is_active
       FROM users
       WHERE id = ? AND role = 'school_head'`,
      [user_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'School head not found.'
        }
      });
    }

    if (rows[0].is_active) {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'CONFLICT',
          message: 'School head is already active.'
        }
      });
    }

    if (!rows[0].school_id) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'School head has no school assignment.'
        }
      });
    }

    const [otherActive] = await pool.query(
      `SELECT id FROM users
       WHERE role = 'school_head' AND school_id = ? AND is_active = true AND id <> ?
       LIMIT 1`,
      [rows[0].school_id, user_id]
    );
    if (otherActive.length > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'CONFLICT',
          message: 'School already has an active school head.'
        }
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query(
      'UPDATE users SET is_active = true, deactivated_at = NULL WHERE id = ?',
      [user_id]
    );
    await connection.query(
      'UPDATE schools SET school_head_id = ? WHERE id = ?',
      [user_id, rows[0].school_id]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      data: {
        id: parseInt(user_id),
        full_name: rows[0].name,
        status: 'active',
        activated_at: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Activate school head error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while activating school head.'
      }
    });
  } finally {
    if (connection) connection.release();
  }
};

// ==========================================
// PROMOTION CRITERIA MANAGEMENT
// ==========================================

/**
 * GET /api/v1/admin/promotion-criteria
 * List all promotion criteria
 */
const listPromotionCriteria = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM promotion_criteria'
    );
    const totalItems = countResult[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    const [criteria] = await pool.query(
      `SELECT * FROM promotion_criteria ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
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
          created_at: c.created_at
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
    console.error('List promotion criteria error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching promotion criteria.'
      }
    });
  }
};

/**
 * GET /api/v1/admin/promotion-criteria/:criteria_id
 * Get promotion criteria details
 */
const getPromotionCriteria = async (req, res) => {
  try {
    const { criteria_id } = req.params;

    const [criteria] = await pool.query(
      'SELECT * FROM promotion_criteria WHERE id = ?',
      [criteria_id]
    );

    if (criteria.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'Promotion criteria not found.'
        }
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
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching promotion criteria.'
      }
    });
  }
};

/**
 * POST /api/v1/admin/promotion-criteria
 * Create promotion criteria
 */
const createPromotionCriteria = async (req, res) => {
  try {
    const { name, passing_average, passing_per_subject, max_failing_subjects, is_active } = req.body;

    if (!name || passing_average === undefined || passing_per_subject === undefined || max_failing_subjects === undefined) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, passing_average, passing_per_subject, and max_failing_subjects are required.'
        }
      });
    }

    const [result] = await pool.query(
      `INSERT INTO promotion_criteria (name, passing_average, passing_per_subject, max_failing_subjects, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [name, passing_average, passing_per_subject, max_failing_subjects, is_active !== false]
    );

    const [created] = await pool.query(
      'SELECT * FROM promotion_criteria WHERE id = ?',
      [result.insertId]
    );

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
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while creating promotion criteria.'
      }
    });
  }
};

/**
 * PUT /api/v1/admin/promotion-criteria/:criteria_id
 * Update promotion criteria
 */
const updatePromotionCriteria = async (req, res) => {
  try {
    const { criteria_id } = req.params;
    const { name, passing_average, passing_per_subject, max_failing_subjects, is_active } = req.body;

    const [existing] = await pool.query(
      'SELECT * FROM promotion_criteria WHERE id = ?',
      [criteria_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'Promotion criteria not found.'
        }
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
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No fields to update.'
        }
      });
    }

    params.push(criteria_id);
    await pool.query(`UPDATE promotion_criteria SET ${updates.join(', ')} WHERE id = ?`, params);

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
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating promotion criteria.'
      }
    });
  }
};

/**
 * DELETE /api/v1/admin/promotion-criteria/:criteria_id
 * Delete promotion criteria
 */
const deletePromotionCriteria = async (req, res) => {
  try {
    const { criteria_id } = req.params;

    const [existing] = await pool.query(
      'SELECT * FROM promotion_criteria WHERE id = ?',
      [criteria_id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'Promotion criteria not found.'
        }
      });
    }

    await pool.query('DELETE FROM promotion_criteria WHERE id = ?', [criteria_id]);

    return res.status(200).json({
      success: true,
      data: {
        message: 'Promotion criteria deleted successfully.'
      },
      error: null
    });
  } catch (error) {
    console.error('Delete promotion criteria error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while deleting promotion criteria.'
      }
    });
  }
};

// ==========================================
// PLATFORM STATISTICS
// ==========================================

/**
 * GET /api/v1/admin/statistics
 * Get platform-wide statistics
 * Returns data in API contract format
 */
const getStatistics = async (req, res) => {
  try {
    // Total schools
    const [schoolCount] = await pool.query('SELECT COUNT(*) as total FROM schools');
    const [activeSchools] = await pool.query("SELECT COUNT(*) as total FROM schools WHERE status = 'active'");
    
    // Total students
    const [studentCount] = await pool.query('SELECT COUNT(*) as total FROM students');
    
    // Total teachers (including class_head role as they also teach)
    const [teacherCount] = await pool.query("SELECT COUNT(*) as total FROM users WHERE role IN ('teacher', 'class_head')");
    
    // Total classes
    const [classCount] = await pool.query('SELECT COUNT(*) as total FROM classes');

    // Students by grade level
    const [studentsByGrade] = await pool.query(
      `SELECT g.level as grade_level, COUNT(s.id) as count 
       FROM students s
       JOIN classes c ON s.class_id = c.id
       JOIN grades g ON c.grade_id = g.id
       GROUP BY g.level
       ORDER BY g.level`
    );

    // Format students by grade
    const studentsByGradeObj = {};
    studentsByGrade.forEach(row => {
      studentsByGradeObj[row.grade_level] = row.count;
    });

    return res.status(200).json({
      success: true,
      data: {
        total_schools: schoolCount[0].total,
        active_schools: activeSchools[0].total,
        inactive_schools: schoolCount[0].total - activeSchools[0].total,
        total_students: studentCount[0].total,
        total_teachers: teacherCount[0].total,
        total_classes: classCount[0].total,
        schools_by_status: {
          active: activeSchools[0].total,
          inactive: schoolCount[0].total - activeSchools[0].total
        },
        students_by_grade: studentsByGradeObj,
        last_updated: new Date().toISOString()
      },
      error: null
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching statistics.'
      }
    });
  }
};

module.exports = {
  // Schools
  listSchools,
  getSchool,
  createSchool,
  updateSchool,
  deleteSchool,
  activateSchool,
  deactivateSchool,
  // School Heads
  createSchoolHead,
  listSchoolHeads,
  getSchoolHead,
  updateSchoolHead,
  deactivateSchoolHead,
  activateSchoolHead,
  // Promotion Criteria
  listPromotionCriteria,
  getPromotionCriteria,
  createPromotionCriteria,
  updatePromotionCriteria,
  deletePromotionCriteria,
  // Statistics
  getStatistics
};




