// Class Head Service - API calls for Class Head endpoints
// Includes both class-head-specific and teacher-inherited endpoints
// Class Head inherits all Teacher endpoints (the backend allows class_head role on teacher routes)

import api from './api';

// ============================================================
// CLASS HEAD SPECIFIC ENDPOINTS
// ============================================================

// ============ STUDENTS ============

/**
 * List all students in the class head's assigned class
 * @param {Object} params - Query parameters (page, limit, search)
 */
export const getStudents = async (params = {}) => {
  const response = await api.get('/class-head/students', { params });
  return response.data;
};

/**
 * Get computed student rankings for the class
 * @param {Object} params - Query parameters (semester_id)
 */
export const getStudentRankings = async (params = {}) => {
  const response = await api.get('/class-head/students/rankings', { params });
  return response.data;
};

// ============ SUBMISSION REVIEW ============

/**
 * Get subject submission checklist - shows which subjects have submitted grades
 * @param {Object} params - Query parameters (semester_id)
 */
export const getSubmissionChecklist = async (params = {}) => {
  const response = await api.get('/class-head/submissions/checklist', { params });
  return response.data;
};

/**
 * Review a specific submission - view student scores for a subject
 * @param {number} submissionId - Submission ID
 */
export const reviewSubmission = async (submissionId) => {
  const response = await api.get(`/class-head/submissions/${submissionId}/review`);
  return response.data;
};

/**
 * Approve a submitted grade submission
 * @param {number} submissionId - Submission ID
 * @param {Object} data - { remarks: "optional approval remarks" }
 */
export const approveSubmission = async (submissionId, data = {}) => {
  const response = await api.post(`/class-head/submissions/${submissionId}/approve`, data);
  return response.data;
};

/**
 * Reject a submission (request revision from teacher)
 * @param {number} submissionId - Submission ID
 * @param {Object} data - { reason: "required reason for rejection" }
 */
export const rejectSubmission = async (submissionId, data) => {
  const response = await api.post(`/class-head/submissions/${submissionId}/reject`, data);
  return response.data;
};

// ============ COMPILE & PUBLISH ============

/**
 * Compile final grades - calculates total, average, rank for all students
 * @param {Object} data - { semester_id, academic_year_id }
 */
export const compileGrades = async (data) => {
  const response = await api.post('/class-head/compile-grades', data);
  return response.data;
};

/**
 * Publish semester results - makes results visible to students/parents
 * @param {Object} data - { semester_id, academic_year_id }
 */
export const publishSemesterResults = async (data) => {
  const response = await api.post('/class-head/publish/semester', data);
  return response.data;
};

/**
 * Publish year results - publishes combined year results
 * @param {Object} data - { academic_year_id, notify_students, notify_parents, send_to_store_house }
 */
export const publishYearResults = async (data) => {
  const response = await api.post('/class-head/publish/year', data);
  return response.data;
};

// ============ REPORTS ============

/**
 * Get class performance snapshot - all students with subject scores
 * @param {Object} params - Query parameters (semester_id, academic_year_id)
 */
export const getClassSnapshot = async (params = {}) => {
  const response = await api.get('/class-head/reports/class-snapshot', { params });
  return response.data;
};

/**
 * Get individual student report
 * @param {number} studentId - Student ID
 * @param {Object} params - { semester_id, academic_year_id, type: 'semester'|'year' }
 */
export const getStudentReport = async (studentId, params = {}) => {
  const response = await api.get(`/class-head/reports/student/${studentId}`, { params });
  return response.data;
};

// ============ STORE HOUSE ============

/**
 * Send roster data to store house
 * @param {Object} data - { semester_id, academic_year_id }
 */
export const sendRosterToStoreHouse = async (data) => {
  const response = await api.post('/class-head/store-house/send-roster', data);
  return response.data;
};

// ============================================================
// TEACHER-INHERITED ENDPOINTS
// (Class Head can access all teacher endpoints)
// ============================================================

// ============ ASSIGNED CLASSES & SUBJECTS ============

/**
 * Get classes assigned to the class head (as a teacher)
 * @param {Object} params - Query parameters (academic_year_id)
 */
export const getAssignedClasses = async (params = {}) => {
  const response = await api.get('/teacher/classes', { params });
  return response.data;
};

/**
 * Get subjects assigned to the class head (as a teacher)
 * @param {Object} params - Query parameters (academic_year_id)
 */
export const getAssignedSubjects = async (params = {}) => {
  const response = await api.get('/teacher/subjects', { params });
  return response.data;
};

// ============ ASSESSMENT WEIGHTS ============

/**
 * Get suggested assessment weights for a class/subject
 * @param {Object} params - { class_id, subject_id, semester_id }
 */
export const getWeightSuggestions = async (params) => {
  const response = await api.get('/teacher/assessment-weights/suggestions', { params });
  return response.data;
};

/**
 * Get current assessment weights for a class/subject
 * @param {Object} params - { class_id, subject_id, semester_id }
 */
export const getAssessmentWeights = async (params) => {
  const response = await api.get('/teacher/assessment-weights', { params });
  return response.data;
};

/**
 * Set assessment weights for a class/subject
 * @param {Object} data - { class_id, subject_id, semester_id, weights: [...] }
 */
export const setAssessmentWeights = async (data) => {
  const response = await api.post('/teacher/assessment-weights', data);
  return response.data;
};

// ============ STUDENT LIST (for grade entry) ============

/**
 * Get student list for a specific class (for grade entry)
 * @param {number} classId - Class ID
 * @param {Object} params - { subject_id, page, limit }
 */
export const getClassStudents = async (classId, params = {}) => {
  const response = await api.get(`/teacher/classes/${classId}/students`, { params });
  return response.data;
};

// ============ GRADE MANAGEMENT ============

/**
 * List student grades for a class/subject
 * @param {number} classId - Class ID
 * @param {number} subjectId - Subject ID
 * @param {Object} params - { semester_id, assessment_type_id }
 */
export const listStudentGrades = async (classId, subjectId, params = {}) => {
  const response = await api.get(`/teacher/classes/${classId}/subjects/${subjectId}/grades`, { params });
  return response.data;
};

/**
 * Enter a single student grade
 * @param {Object} data - { student_id, class_id, subject_id, semester_id, assessment_type_id, score, max_score, remarks }
 */
export const enterGrade = async (data) => {
  const response = await api.post('/teacher/grades', data);
  return response.data;
};

/**
 * Enter grades for multiple students at once
 * @param {Object} data - { class_id, subject_id, semester_id, assessment_type_id, max_score, grades: [...] }
 */
export const enterBulkGrades = async (data) => {
  const response = await api.post('/teacher/grades/bulk', data);
  return response.data;
};

/**
 * Update an existing grade
 * @param {number} gradeId - Grade ID
 * @param {Object} data - { score, remarks }
 */
export const updateGrade = async (gradeId, data) => {
  const response = await api.put(`/teacher/grades/${gradeId}`, data);
  return response.data;
};

/**
 * Delete a grade
 * @param {number} gradeId - Grade ID
 */
export const deleteGrade = async (gradeId) => {
  const response = await api.delete(`/teacher/grades/${gradeId}`);
  return response.data;
};

// ============ SUBMIT GRADES ============

/**
 * Submit grades for approval (sends to class head for review)
 * @param {number} classId - Class ID
 * @param {number} subjectId - Subject ID
 * @param {Object} data - { semester_id, remarks }
 */
export const submitGradesForApproval = async (classId, subjectId, data) => {
  const response = await api.post(`/teacher/classes/${classId}/subjects/${subjectId}/submit`, data);
  return response.data;
};

/**
 * Get submission status for all assignments
 * @param {Object} params - { semester_id, academic_year_id }
 */
export const getSubmissionStatus = async (params = {}) => {
  const response = await api.get('/teacher/submissions', { params });
  return response.data;
};

/**
 * Get computed averages for a class/subject (read-only)
 * @param {number} classId - Class ID
 * @param {number} subjectId - Subject ID
 * @param {Object} params - { semester_id }
 */
export const getComputedAverages = async (classId, subjectId, params = {}) => {
  const response = await api.get(`/teacher/classes/${classId}/subjects/${subjectId}/averages`, { params });
  return response.data;
};

// ============ DEFAULT EXPORT ============

export default {
  // Class Head specific
  getStudents,
  getStudentRankings,
  getSubmissionChecklist,
  reviewSubmission,
  approveSubmission,
  rejectSubmission,
  compileGrades,
  publishSemesterResults,
  publishYearResults,
  getClassSnapshot,
  getStudentReport,
  sendRosterToStoreHouse,
  // Teacher-inherited
  getAssignedClasses,
  getAssignedSubjects,
  getWeightSuggestions,
  getAssessmentWeights,
  setAssessmentWeights,
  getClassStudents,
  listStudentGrades,
  enterGrade,
  enterBulkGrades,
  updateGrade,
  deleteGrade,
  submitGradesForApproval,
  getSubmissionStatus,
  getComputedAverages,
};
