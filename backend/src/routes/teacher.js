// Teacher Routes
const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { verifyToken, checkRole, checkPasswordChanged } = require('../middleware/auth');

// All routes require authentication and teacher or class_head role
router.use(verifyToken);
router.use(checkPasswordChanged);
router.use(checkRole('teacher', 'class_head'));

// ==========================================
// ASSIGNED CLASSES & SUBJECTS
// ==========================================
router.get('/academic-years', teacherController.listAcademicYears);
router.get('/semesters', teacherController.listSemesters);
router.get('/classes', teacherController.listAssignedClasses);
router.get('/subjects', teacherController.listAssignedSubjects);

// ==========================================
// ASSESSMENT WEIGHTS
// ==========================================
router.get('/assessment-weights/suggestions', teacherController.getWeightSuggestions);
router.get('/assessment-weights', teacherController.getAssessmentWeights);
router.post('/assessment-weights', teacherController.setAssessmentWeights);
router.post('/assessment-types', teacherController.createAssessmentType);
router.delete('/assessment-types/:assessment_type_id', teacherController.deleteAssessmentType);

// ==========================================
// STUDENT LIST
// ==========================================
router.get('/classes/:class_id/students', teacherController.getStudentList);

// ==========================================
// STUDENT GRADES (MARKS)
// ==========================================
router.get('/classes/:class_id/subjects/:subject_id/grades', teacherController.listStudentGrades);
router.post('/grades', teacherController.enterGrade);
router.post('/grades/bulk', teacherController.enterBulkGrades);
router.put('/grades/:grade_id', teacherController.updateGrade);
router.delete('/grades/:grade_id', teacherController.deleteGrade);

// ==========================================
// SUBMIT GRADES
// ==========================================
router.post('/classes/:class_id/subjects/:subject_id/submit', teacherController.submitGrades);

// ==========================================
// SUBMISSION STATUS
// ==========================================
router.get('/submissions', teacherController.getSubmissionStatus);

// ==========================================
// COMPUTED AVERAGES
// ==========================================
router.get('/classes/:class_id/subjects/:subject_id/averages', teacherController.getComputedAverages);

module.exports = router;




