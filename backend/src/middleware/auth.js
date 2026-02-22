// Authentication Middleware
// Verifies JWT token and attaches user to request

const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { pool } = require('../config/db');

/**
 * Middleware to verify JWT token
 * Attaches decoded user info to req.user
 */
const verifyToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided. Please login.'
        }
      });
    }

    // Extract token (remove "Bearer " prefix)
    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, jwtConfig.secret);

    // Get user from database to ensure they still exist and are active
    const [users] = await pool.query(
      'SELECT id, name, email, phone, role, school_id, is_active FROM users WHERE id = ?',
      [decoded.user_id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found. Please login again.'
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

    // Check if user's school is active (admin is exempt - they manage all schools)
    if (user.school_id && user.role !== 'admin') {
      const [schools] = await pool.query(
        'SELECT status FROM schools WHERE id = ?',
        [user.school_id]
      );
      if (schools.length > 0 && schools[0].status === 'inactive') {
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

    // Attach user to request object
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      school_id: user.school_id
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired. Please login again.'
        }
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token. Please login again.'
        }
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication error occurred.'
      }
    });
  }
};

/**
 * Middleware to check user roles
 * @param  {...string} allowedRoles - Roles that can access the route
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource.'
        }
      });
    }

    next();
  };
};

/**
 * Middleware to check if user belongs to a specific school
 * Admin is exempt (can access all schools)
 */
const checkSchoolAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.'
      }
    });
  }

  // Admin can access all schools
  if (req.user.role === 'admin') {
    return next();
  }

  // Get school_id from params or body
  const requestedSchoolId = req.params.school_id || req.body.school_id;

  // If no school_id in request, allow (will use user's school_id)
  if (!requestedSchoolId) {
    return next();
  }

  // Check if user's school matches requested school
  if (req.user.school_id !== parseInt(requestedSchoolId)) {
    return res.status(403).json({
      success: false,
      data: null,
      error: {
        code: 'FORBIDDEN',
        message: 'You can only access resources from your own school.'
      }
    });
  }

  next();
};

module.exports = {
  verifyToken,
  checkRole,
  checkSchoolAccess
};




