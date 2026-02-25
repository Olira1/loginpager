const express = require('express');
const multer = require('multer');
const registrarController = require('../controllers/registrarControllerV2');
const { verifyToken, checkRole, checkPasswordChanged } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// All registrar routes require registrar role
router.use(verifyToken);
router.use(checkPasswordChanged);
router.use(checkRole('registrar'));

// ==========================================
// STUDENTS
// ==========================================
router.post('/students', registrarController.createStudent);
router.get('/students', registrarController.listStudents);
router.get('/students/:student_id', registrarController.getStudent);
router.put('/students/:student_id', registrarController.updateStudent);
router.patch('/students/:student_id/deactivate', registrarController.deactivateStudent);
router.patch('/students/:student_id/activate', registrarController.activateStudent);

// Students bulk upload
router.post('/students/upload', upload.single('file'), registrarController.uploadStudents);
router.get('/students/upload/template', registrarController.getStudentUploadTemplate);

// ==========================================
// TEACHERS
// ==========================================
router.post('/teachers', registrarController.createTeacher);
router.get('/teachers', registrarController.listTeachers);
router.get('/teachers/:teacher_id', registrarController.getTeacher);
router.put('/teachers/:teacher_id', registrarController.updateTeacher);
router.patch('/teachers/:teacher_id/deactivate', registrarController.deactivateTeacher);
router.patch('/teachers/:teacher_id/activate', registrarController.activateTeacher);

// Teachers bulk upload
router.post('/teachers/upload', upload.single('file'), registrarController.uploadTeachers);
router.get('/teachers/upload/template', registrarController.getTeacherUploadTemplate);

// ==========================================
// PASSWORD RESET
// ==========================================
router.post('/users/:user_id/reset-password', registrarController.resetUserPassword);

// ==========================================
// PARENTS
// ==========================================
router.get('/parents', registrarController.listParents);
router.get('/parents/:parent_id', registrarController.getParent);
router.put('/parents/:parent_id', registrarController.updateParent);

// ==========================================
// STATISTICS
// ==========================================
router.get('/metadata', registrarController.getRegistrationMetadata);
router.get('/statistics', registrarController.getStatistics);

module.exports = router;

