// Teacher Service - API calls for all Teacher endpoints
// Covers: assigned classes/subjects, assessment weights, grade management,
// submissions, and computed averages

import api from './api';

// ============================================================
// ASSIGNED CLASSES & SUBJECTS
// ============================================================

/**
 * Get classes assigned to the teacher
 * @param {Object} params - { academic_year_id }
 */
export const getAssignedClasses = async (params = {}) => {
  const response = await api.get('/teacher/classes', { params });
  return response.data;
};

/**
 * Get subjects assigned to the teacher
 * @param {Object} params - { academic_year_id }
 */
export const getAssignedSubjects = async (params = {}) => {
  const response = await api.get('/teacher/subjects', { params });
  return response.data;
};

// ============================================================
// ASSESSMENT WEIGHTS
// ============================================================

/**
 * Get suggested weights from School Head defaults
 * @param {Object} params - { class_id, subject_id, semester_id }
 */
export const getWeightSuggestions = async (params) => {
  const response = await api.get('/teacher/assessment-weights/suggestions', { params });
  return response.data;
};

/**
 * Get current assessment weights for a class/subject/semester
 * @param {Object} params - { class_id, subject_id, semester_id }
 */
export const getAssessmentWeights = async (params) => {
  const response = await api.get('/teacher/assessment-weights', { params });
  return response.data;
};

/**
 * Set assessment weights for a class/subject/semester
 * Weights must sum to 100%
 * @param {Object} data - { class_id, subject_id, semester_id, weights: [{ assessment_type_id, weight_percent }] }
 */
export const setAssessmentWeights = async (data) => {
  const response = await api.post('/teacher/assessment-weights', data);
  return response.data;
};

// ============================================================
// STUDENT LIST
// ============================================================

/**
 * Get students for a class (for grade entry)
 * @param {number} classId - Class ID
 * @param {Object} params - { subject_id, page, limit }
 */
export const getClassStudents = async (classId, params = {}) => {
  const response = await api.get(`/teacher/classes/${classId}/students`, { params });
  return response.data;
};

// ============================================================
// GRADE MANAGEMENT
// ============================================================

/**
 * List all student grades for a class/subject/semester
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
 * @param {Object} data - { class_id, subject_id, semester_id, assessment_type_id, max_score, grades: [{ student_id, score }] }
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
 * Delete a grade entry
 * @param {number} gradeId - Grade ID
 */
export const deleteGrade = async (gradeId) => {
  const response = await api.delete(`/teacher/grades/${gradeId}`);
  return response.data;
};

// ============================================================
// SUBMIT GRADES FOR APPROVAL
// ============================================================

/**
 * Submit all grades for a class/subject/semester for Class Head approval
 * @param {number} classId - Class ID
 * @param {number} subjectId - Subject ID
 * @param {Object} data - { semester_id, remarks }
 */
export const submitGradesForApproval = async (classId, subjectId, data) => {
  const response = await api.post(`/teacher/classes/${classId}/subjects/${subjectId}/submit`, data);
  return response.data;
};

// ============================================================
// SUBMISSION STATUS
// ============================================================

/**
 * View status of grade submissions across all assignments
 * @param {Object} params - { semester_id, academic_year_id }
 */
export const getSubmissionStatus = async (params = {}) => {
  const response = await api.get('/teacher/submissions', { params });
  return response.data;
};

// ============================================================
// COMPUTED AVERAGES (READ-ONLY)
// ============================================================

/**
 * View computed averages and rankings for a class/subject
 * @param {number} classId - Class ID
 * @param {number} subjectId - Subject ID
 * @param {Object} params - { semester_id }
 */
export const getComputedAverages = async (classId, subjectId, params = {}) => {
  const response = await api.get(`/teacher/classes/${classId}/subjects/${subjectId}/averages`, { params });
  return response.data;
};

// ============================================================
// DEFAULT EXPORT
// ============================================================
export default {
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
