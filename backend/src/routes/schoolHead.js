// School Head Routes
const express = require('express');
const router = express.Router();
const schoolHeadController = require('../controllers/schoolHeadController');
const { verifyToken, checkRole, checkPasswordChanged } = require('../middleware/auth');

// All routes require authentication and school_head role
router.use(verifyToken);
router.use(checkPasswordChanged);
router.use(checkRole('school_head'));

// ==========================================
// GRADES
// ==========================================
router.get('/grades', schoolHeadController.listGrades);
router.get('/grades/:grade_id', schoolHeadController.getGrade);
router.post('/grades', schoolHeadController.createGrade);
router.put('/grades/:grade_id', schoolHeadController.updateGrade);
router.delete('/grades/:grade_id', schoolHeadController.deleteGrade);

// ==========================================
// SUBJECTS (nested under grades - API contract)
// ==========================================
router.get('/grades/:grade_id/subjects', schoolHeadController.listSubjectsByGrade);
router.post('/grades/:grade_id/subjects', schoolHeadController.addSubjectToGrade);
router.put('/grades/:grade_id/subjects/:subject_id', schoolHeadController.updateSubjectInGrade);
router.patch('/grades/:grade_id/subjects/:subject_id/deactivate', schoolHeadController.deactivateSubjectInGrade);
router.patch('/grades/:grade_id/subjects/:subject_id/activate', schoolHeadController.activateSubjectInGrade);
router.delete('/grades/:grade_id/subjects/:subject_id', schoolHeadController.removeSubjectFromGrade);

// ==========================================
// CLASSES (nested under grades - API contract)
// ==========================================
router.get('/grades/:grade_id/classes', schoolHeadController.listClassesByGrade);
router.post('/grades/:grade_id/classes', schoolHeadController.createClassUnderGrade);

// ==========================================
// CLASSES (direct access)
// ==========================================
router.get('/classes', schoolHeadController.listClasses);
router.get('/classes/:class_id', schoolHeadController.getClass);
router.post('/classes', schoolHeadController.createClass);
router.put('/classes/:class_id', schoolHeadController.updateClass);
router.delete('/classes/:class_id', schoolHeadController.deleteClass);

// Class Head Assignment
router.post('/classes/:class_id/class-head', schoolHeadController.assignClassHead);
router.delete('/classes/:class_id/class-head', schoolHeadController.removeClassHead);

// ==========================================
// ACADEMIC YEAR LIFECYCLE
// ==========================================
router.post('/academic-years/:academic_year_id/initialize-classes', schoolHeadController.initializeClassesForAcademicYear);
router.post('/semesters/:semester_id/open', schoolHeadController.openSemester);
router.post('/semesters/:semester_id/close-submission', schoolHeadController.closeSemesterSubmission);
router.post('/semesters/:semester_id/lock', schoolHeadController.lockSemester);
router.post('/semesters/:semester_id/reopen', schoolHeadController.reopenSemester);

// ==========================================
// SUBJECTS
// ==========================================
router.get('/subjects', schoolHeadController.listSubjects);
router.post('/subjects', schoolHeadController.createSubject);
router.put('/subjects/:subject_id', schoolHeadController.updateSubject);
router.delete('/subjects/:subject_id', schoolHeadController.deleteSubject);

// ==========================================
// ASSESSMENT TYPES
// ==========================================
router.get('/assessment-types', schoolHeadController.listAssessmentTypes);
router.post('/assessment-types', schoolHeadController.createAssessmentType);
router.put('/assessment-types/:type_id', schoolHeadController.updateAssessmentType);
router.delete('/assessment-types/:type_id', schoolHeadController.deleteAssessmentType);

// ==========================================
// WEIGHT TEMPLATES
// ==========================================
router.get('/weight-templates', schoolHeadController.listWeightTemplates);
router.get('/weight-templates/:template_id', schoolHeadController.getWeightTemplate);
router.post('/weight-templates', schoolHeadController.createWeightTemplate);
router.put('/weight-templates/:template_id', schoolHeadController.updateWeightTemplate);
router.delete('/weight-templates/:template_id', schoolHeadController.deleteWeightTemplate);

// ==========================================
// TEACHING ASSIGNMENTS
// ==========================================
router.get('/teaching-assignments', schoolHeadController.listTeachingAssignments);
router.post('/teaching-assignments', schoolHeadController.createTeachingAssignment);
router.put('/teaching-assignments/:assignment_id', schoolHeadController.updateTeachingAssignment);
router.delete('/teaching-assignments/:assignment_id', schoolHeadController.deleteTeachingAssignment);

// ==========================================
// TEACHERS
// ==========================================
router.get('/teachers', schoolHeadController.listTeachers);

// ==========================================
// REGISTRAR MANAGEMENT
// ==========================================
router.post('/registrars', schoolHeadController.createRegistrar);
router.get('/registrars', schoolHeadController.listRegistrars);
router.put('/registrars/:user_id', schoolHeadController.updateRegistrar);
router.patch('/registrars/:user_id/deactivate', schoolHeadController.deactivateRegistrar);
router.patch('/registrars/:user_id/activate', schoolHeadController.activateRegistrar);
router.delete('/registrars/:user_id', schoolHeadController.deleteRegistrar);
router.delete('/registrars/delete/:user_id', schoolHeadController.deleteRegistrar);
router.post('/registrars/:user_id/reset-password', schoolHeadController.resetRegistrarPassword);
router.post('/registrars/reset-password/:user_id', schoolHeadController.resetRegistrarPassword);

// ==========================================
// STORE HOUSE USER MANAGEMENT
// ==========================================
router.post('/store-house-users', schoolHeadController.createStoreHouseUser);
router.get('/store-house-users', schoolHeadController.listStoreHouseUsers);
router.put('/store-house-users/:user_id', schoolHeadController.updateStoreHouseUser);
router.patch('/store-house-users/:user_id/deactivate', schoolHeadController.deactivateStoreHouseUser);
router.patch('/store-house-users/:user_id/activate', schoolHeadController.activateStoreHouseUser);
router.delete('/store-house-users/:user_id', schoolHeadController.deleteStoreHouseUser);
router.delete('/store-house-users/delete/:user_id', schoolHeadController.deleteStoreHouseUser);
router.post('/store-house-users/:user_id/reset-password', schoolHeadController.resetStoreHouseUserPassword);
router.post('/store-house-users/reset-password/:user_id', schoolHeadController.resetStoreHouseUserPassword);

module.exports = router;




