// Authentication Controller
// Handles login, get current user, and logout

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtConfig = require('../config/jwt');
const { pool } = require('../config/db');

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT token
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required.'
        }
      });
    }

    // Find user by email
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.'
        }
      });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Your account has been disabled. Contact administrator.'
        }
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.'
        }
      });
    }

    // Get school name if user belongs to a school
    let schoolName = null;
    if (user.school_id) {
      const [schools] = await pool.query(
        'SELECT name, status FROM schools WHERE id = ?',
        [user.school_id]
      );
      if (schools.length > 0) {
        schoolName = schools[0].name;

        // Block login if school is inactive (admin is exempt)
        if (schools[0].status === 'inactive' && user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            data: null,
            error: {
              code: 'SCHOOL_INACTIVE',
              message: 'Your school has been suspended. Contact the platform administrator.'
            }
          });
        }
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.id,
        school_id: user.school_id,
        role: user.role
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        access_token: token,
        token_type: 'Bearer',
        expires_in: jwtConfig.expiresIn,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          school_id: user.school_id,
          school_name: schoolName
        }
      },
      error: null
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during login.'
      }
    });
  }
};

/**
 * GET /api/v1/auth/me
 * Get current authenticated user's profile
 */
const getCurrentUser = async (req, res) => {
  try {
    // req.user is set by verifyToken middleware
    const userId = req.user.id;

    // Get full user details
    const [users] = await pool.query(
      'SELECT id, name, email, phone, role, school_id, is_active, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found.'
        }
      });
    }

    const user = users[0];

    // Get school name if user belongs to a school
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

    // Get additional info based on role
    let additionalInfo = {};

    // If student, get student details
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
          grade_name: students[0].grade_name
        };
      }
    }

    // If class_head, get assigned class
    if (user.role === 'class_head') {
      const [classes] = await pool.query(
        `SELECT c.id, c.name as class_name, g.name as grade_name
         FROM classes c
         JOIN grades g ON c.grade_id = g.id
         WHERE c.class_head_id = ?`,
        [userId]
      );
      if (classes.length > 0) {
        additionalInfo = {
          assigned_classes: classes.map(c => ({
            id: c.id,
            name: `${c.grade_name} - ${c.class_name}`
          }))
        };
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        school_id: user.school_id,
        school_name: schoolName,
        is_active: user.is_active,
        created_at: user.created_at,
        ...additionalInfo
      },
      error: null
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching user profile.'
      }
    });
  }
};

/**
 * POST /api/v1/auth/logout
 * Logout user (client should discard token)
 * Note: Since JWT is stateless, we just return success
 * In production, you might want to implement token blacklisting
 */
const logout = async (req, res) => {
  try {
    // JWT is stateless, so we can't invalidate the token server-side
    // The client should discard the token
    // In a production app, you might implement token blacklisting

    return res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully.'
      },
      error: null
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during logout.'
      }
    });
  }
};

module.exports = {
  login,
  getCurrentUser,
  logout
};




