// Class Head Routes
// Note: Class Head also has access to all Teacher endpoints
const express = require('express');
const router = express.Router();
const classHeadController = require('../controllers/classHeadController');
const { verifyToken, checkRole } = require('../middleware/auth');

// All routes require authentication and class_head role
router.use(verifyToken);
router.use(checkRole('class_head'));

// ==========================================
// STUDENTS
// ==========================================
router.get('/students', classHeadController.listStudents);
router.get('/students/rankings', classHeadController.getStudentRankings);

// ==========================================
// SUBMISSIONS
// ==========================================
router.get('/submissions/checklist', classHeadController.getSubmissionChecklist);
router.get('/submissions/:submission_id/review', classHeadController.reviewSubmission);
router.post('/submissions/:submission_id/approve', classHeadController.approveSubmission);
router.post('/submissions/:submission_id/reject', classHeadController.rejectSubmission);

// ==========================================
// COMPILE & PUBLISH
// ==========================================
router.post('/compile-grades', classHeadController.compileGrades);
router.post('/publish/semester', classHeadController.publishSemesterResults);
router.post('/publish/year', classHeadController.publishYearResults);

// ==========================================
// REPORTS
// ==========================================
router.get('/reports/class-snapshot', classHeadController.getClassSnapshot);
router.get('/reports/student/:student_id', classHeadController.getStudentReport);

// ==========================================
// STORE HOUSE
// ==========================================
router.post('/store-house/send-roster', classHeadController.sendRosterToStoreHouse);

module.exports = router;



