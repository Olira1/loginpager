// Parent Routes
const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { verifyToken, checkRole } = require('../middleware/auth');

// All routes require authentication and parent role
router.use(verifyToken);
router.use(checkRole('parent'));

// ==========================================
// CHILDREN
// ==========================================
router.get('/children', parentController.listChildren);

// ==========================================
// CHILD REPORTS
// ==========================================
router.get('/children/:student_id/reports/semester', parentController.getChildSemesterReport);
router.get('/children/:student_id/reports/year', parentController.getChildYearReport);

// ==========================================
// CHILD SUBJECTS (scores must come before :subject_id)
// ==========================================
router.get('/children/:student_id/subjects/scores', parentController.listChildSubjectScores);
router.get('/children/:student_id/subjects/:subject_id/grades', parentController.getChildSubjectGrades);

// ==========================================
// CHILD RANK
// ==========================================
router.get('/children/:student_id/rank', parentController.getChildRank);

module.exports = router;
