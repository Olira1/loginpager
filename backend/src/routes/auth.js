const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, checkPasswordChanged } = require('../middleware/auth');

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password (validates current, enforces policy)
 * @access  Private
 */
router.post('/change-password', verifyToken, authController.changePassword);

/**
 * @route   POST /api/v1/auth/forgot-username
 * @desc    Look up username by phone number
 * @access  Public
 */
router.post('/forgot-username', authController.forgotUsername);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current logged in user
 * @access  Private
 */
router.get('/me', verifyToken, checkPasswordChanged, authController.getCurrentUser);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', verifyToken, authController.logout);

module.exports = router;
