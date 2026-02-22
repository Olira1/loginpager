// Store House Routes
// All routes are protected and require store_house role

const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth');
const storeHouseController = require('../controllers/storeHouseController');

// Apply middleware to all routes
router.use(verifyToken);
router.use(checkRole('store_house'));

// ==========================================
// ROSTERS
// ==========================================

// GET /api/v1/store-house/rosters - List all rosters
router.get('/rosters', storeHouseController.listRosters);

// GET /api/v1/store-house/rosters/:roster_id - Get roster details
router.get('/rosters/:roster_id', storeHouseController.getRoster);

// ==========================================
// STUDENT SEARCH & RECORDS
// ==========================================

// GET /api/v1/store-house/students/search - Search students
router.get('/students/search', storeHouseController.searchStudents);

// GET /api/v1/store-house/students/:student_id/cumulative-record - Get cumulative record
router.get('/students/:student_id/cumulative-record', storeHouseController.getCumulativeRecord);

// ==========================================
// TRANSCRIPTS
// ==========================================

// GET /api/v1/store-house/transcripts - List all transcripts
router.get('/transcripts', storeHouseController.listTranscripts);

// GET /api/v1/store-house/transcripts/:transcript_id - Get transcript details
router.get('/transcripts/:transcript_id', storeHouseController.getTranscript);

// POST /api/v1/store-house/students/:student_id/transcript - Generate transcript
router.post('/students/:student_id/transcript', storeHouseController.generateTranscript);

module.exports = router;



