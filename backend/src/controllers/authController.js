const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtConfig = require('../config/jwt');
const { pool } = require('../config/db');
const { validatePasswordStrength } = require('../utils/passwordGenerator');

/**
 * POST /api/v1/auth/login
 * Authenticate user by username (email, student_code, staff_code, or phone)
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username and password are required.',
        },
      });
    }

    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password.',
        },
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        data: null,
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Your account has been deactivated. Contact administrator.',
        },
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password.',
        },
      });
    }

    let schoolName = null;
    if (user.school_id) {
      const [schools] = await pool.query(
        'SELECT name, status FROM schools WHERE id = ?',
        [user.school_id]
      );
      if (schools.length > 0) {
        schoolName = schools[0].name;

        if (schools[0].status === 'inactive' && user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            data: null,
            error: {
              code: 'SCHOOL_INACTIVE',
              message: 'Your school has been suspended. Contact the platform administrator.',
            },
          });
        }
      }
    }

    const token = jwt.sign(
      {
        user_id: user.id,
        school_id: user.school_id,
        role: user.role,
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    return res.status(200).json({
      success: true,
      data: {
        access_token: token,
        token_type: 'Bearer',
        expires_in: jwtConfig.expiresIn,
        user: {
          id: user.id,
          name: user.name,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role,
          school_id: user.school_id,
          school_name: schoolName,
          must_change_password: !!user.must_change_password,
        },
      },
      error: null,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during login.',
      },
    });
  }
};

/**
 * POST /api/v1/auth/change-password
 * Validates current password, enforces policy, clears must_change_password flag
 */
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Current password and new password are required.',
        },
      });
    }

    const strength = validatePasswordStrength(new_password);
    if (!strength.valid) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'WEAK_PASSWORD',
          message: strength.message,
        },
      });
    }

    const [users] = await pool.query(
      'SELECT id, password FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'User not found.' },
      });
    }

    const isCurrentValid = await bcrypt.compare(current_password, users[0].password);
    if (!isCurrentValid) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Current password is incorrect.',
        },
      });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await pool.query(
      'UPDATE users SET password = ?, must_change_password = FALSE WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    return res.status(200).json({
      success: true,
      data: { message: 'Password changed successfully.' },
      error: null,
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while changing password.',
      },
    });
  }
};

/**
 * POST /api/v1/auth/forgot-username
 * Public endpoint -- returns username(s) matching a phone number
 */
const forgotUsername = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Phone number is required.',
        },
      });
    }

    const [users] = await pool.query(
      'SELECT username, role FROM users WHERE phone = ? AND is_active = TRUE',
      [phone]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'No account found with this phone number.',
        },
      });
    }

    const usernames = users.map((u) => ({
      username: u.username,
      role: u.role,
    }));

    return res.status(200).json({
      success: true,
      data: { usernames },
      error: null,
    });
  } catch (error) {
    console.error('Forgot username error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while looking up username.',
      },
    });
  }
};

/**
 * GET /api/v1/auth/me
 * Get current authenticated user's profile
 */
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.query(
      `SELECT id, name, first_name, last_name, username, email, phone, gender,
              role, school_id, is_active, must_change_password, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: 'User not found.' },
      });
    }

    const user = users[0];

    let schoolName = null;
    if (user.school_id) {
      const [schools] = await pool.query(
        'SELECT name FROM schools WHERE id = ?',
        [user.school_id]
      );
      if (schools.length > 0) {
        schoolName = schools[0].name;
      }
    }

    let additionalInfo = {};

    if (user.role === 'student') {
      const [students] = await pool.query(
        `SELECT s.student_id_number, s.date_of_birth, s.sex, c.name as class_name, g.name as grade_name
         FROM students s
         JOIN classes c ON s.class_id = c.id
         JOIN grades g ON c.grade_id = g.id
         WHERE s.user_id = ?`,
        [userId]
      );
      if (students.length > 0) {
        additionalInfo = {
          student_id_number: students[0].student_id_number,
          class_name: students[0].class_name,
          grade_name: students[0].grade_name,
        };
      }
    }

    if (user.role === 'class_head' || user.role === 'teacher') {
      const [teachers] = await pool.query(
        `SELECT t.staff_code, t.qualification, t.specialization
         FROM teachers t WHERE t.user_id = ?`,
        [userId]
      );
      if (teachers.length > 0) {
        additionalInfo = {
          staff_code: teachers[0].staff_code,
          qualification: teachers[0].qualification,
          specialization: teachers[0].specialization,
        };
      }
    }

    if (user.role === 'class_head') {
      const [classes] = await pool.query(
        `SELECT c.id, c.name as class_name, g.name as grade_name
         FROM classes c
         JOIN grades g ON c.grade_id = g.id
         WHERE c.class_head_id = ?`,
        [userId]
      );
      if (classes.length > 0) {
        additionalInfo.assigned_classes = classes.map((c) => ({
          id: c.id,
          name: `${c.grade_name} - ${c.class_name}`,
        }));
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        role: user.role,
        school_id: user.school_id,
        school_name: schoolName,
        is_active: user.is_active,
        must_change_password: !!user.must_change_password,
        created_at: user.created_at,
        ...additionalInfo,
      },
      error: null,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching user profile.',
      },
    });
  }
};

/**
 * POST /api/v1/auth/logout
 * Logout user (client should discard token)
 */
const logout = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully.' },
      error: null,
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during logout.',
      },
    });
  }
};

module.exports = {
  login,
  changePassword,
  forgotUsername,
  getCurrentUser,
  logout,
};
