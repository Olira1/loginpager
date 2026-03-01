// Admin Routes
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, checkRole, checkPasswordChanged } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(verifyToken);
router.use(checkPasswordChanged);
router.use(checkRole('admin'));

// ==========================================
// SCHOOL MANAGEMENT
// ==========================================

/**
 * @route   GET /api/v1/admin/schools
 * @desc    List all schools
 * @access  Admin only
 */
router.get('/schools', adminController.listSchools);

/**
 * @route   GET /api/v1/admin/schools/:school_id
 * @desc    Get school details
 * @access  Admin only
 */
router.get('/schools/:school_id', adminController.getSchool);

/**
 * @route   POST /api/v1/admin/schools
 * @desc    Create a new school
 * @access  Admin only
 */
router.post('/schools', adminController.createSchool);

/**
 * @route   PUT /api/v1/admin/schools/:school_id
 * @desc    Update school
 * @access  Admin only
 */
router.put('/schools/:school_id', adminController.updateSchool);

/**
 * @route   DELETE /api/v1/admin/schools/:school_id
 * @desc    Delete school
 * @access  Admin only
 */
router.delete('/schools/:school_id', adminController.deleteSchool);

/**
 * @route   PATCH /api/v1/admin/schools/:school_id/activate
 * @desc    Activate a school
 * @access  Admin only
 */
router.patch('/schools/:school_id/activate', adminController.activateSchool);

/**
 * @route   PATCH /api/v1/admin/schools/:school_id/deactivate
 * @desc    Deactivate a school
 * @access  Admin only
 */
router.patch('/schools/:school_id/deactivate', adminController.deactivateSchool);

// ==========================================
// SCHOOL HEAD MANAGEMENT
// ==========================================
router.post('/school-heads', adminController.createSchoolHead);
router.get('/school-heads', adminController.listSchoolHeads);
router.get('/school-heads/:user_id', adminController.getSchoolHead);
router.put('/school-heads/:user_id', adminController.updateSchoolHead);
router.patch('/school-heads/:user_id/deactivate', adminController.deactivateSchoolHead);
router.patch('/school-heads/:user_id/activate', adminController.activateSchoolHead);
router.post('/school-heads/:user_id/reset-password', adminController.resetSchoolHeadPassword);
router.post('/school-heads/reset-password/:user_id', adminController.resetSchoolHeadPassword);

// ==========================================
// PROMOTION CRITERIA
// ==========================================

/**
 * @route   GET /api/v1/admin/promotion-criteria
 * @desc    List all promotion criteria
 * @access  Admin only
 */
router.get('/promotion-criteria', adminController.listPromotionCriteria);

/**
 * @route   GET /api/v1/admin/promotion-criteria/:criteria_id
 * @desc    Get promotion criteria details
 * @access  Admin only
 */
router.get('/promotion-criteria/:criteria_id', adminController.getPromotionCriteria);

/**
 * @route   POST /api/v1/admin/promotion-criteria
 * @desc    Create promotion criteria
 * @access  Admin only
 */
router.post('/promotion-criteria', adminController.createPromotionCriteria);

/**
 * @route   PUT /api/v1/admin/promotion-criteria/:criteria_id
 * @desc    Update promotion criteria
 * @access  Admin only
 */
router.put('/promotion-criteria/:criteria_id', adminController.updatePromotionCriteria);

/**
 * @route   DELETE /api/v1/admin/promotion-criteria/:criteria_id
 * @desc    Delete promotion criteria
 * @access  Admin only
 */
router.delete('/promotion-criteria/:criteria_id', adminController.deletePromotionCriteria);

// ==========================================
// ACADEMIC YEAR LIFECYCLE
// ==========================================
router.get('/academic-years', adminController.listAcademicYears);
router.post('/academic-years', adminController.createAcademicYear);
router.post('/academic-years/:academic_year_id/activate', adminController.activateAcademicYear);
router.post('/academic-years/:academic_year_id/lock', adminController.lockAcademicYear);
router.post('/academic-years/:academic_year_id/reopen', adminController.reopenAcademicYear);

// ==========================================
// STATISTICS
// ==========================================

/**
 * @route   GET /api/v1/admin/statistics
 * @desc    Get platform-wide statistics
 * @access  Admin only
 */
router.get('/statistics', adminController.getStatistics);
router.get('/statistics/schools/:school_id', adminController.getSchoolStatistics);

module.exports = router;




