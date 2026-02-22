// School Head Service - API calls for School Head endpoints
// Manages grades, classes, subjects, assessments, and assignments

import api from './api';

// ============ GRADES ============

/**
 * Get list of all grades
 * @param {Object} params - Query parameters (page, limit, academic_year_id)
 */
export const getGrades = async (params = {}) => {
  const response = await api.get('/school/grades', { params });
  return response.data;
};

/**
 * Get single grade details
 * @param {number} gradeId - Grade ID
 */
export const getGrade = async (gradeId) => {
  const response = await api.get(`/school/grades/${gradeId}`);
  return response.data;
};

/**
 * Create new grade
 * @param {Object} data - Grade data
 */
export const createGrade = async (data) => {
  const response = await api.post('/school/grades', data);
  return response.data;
};

/**
 * Update grade
 * @param {number} gradeId - Grade ID
 * @param {Object} data - Updated grade data
 */
export const updateGrade = async (gradeId, data) => {
  const response = await api.put(`/school/grades/${gradeId}`, data);
  return response.data;
};

/**
 * Delete grade
 * @param {number} gradeId - Grade ID
 */
export const deleteGrade = async (gradeId) => {
  const response = await api.delete(`/school/grades/${gradeId}`);
  return response.data;
};

// ============ CLASSES ============

/**
 * Get classes for a grade
 * @param {number} gradeId - Grade ID
 * @param {Object} params - Query parameters
 */
export const getClasses = async (gradeId, params = {}) => {
  const response = await api.get(`/school/grades/${gradeId}/classes`, { params });
  return response.data;
};

/**
 * Get all classes (across all grades)
 */
export const getAllClasses = async (params = {}) => {
  const response = await api.get('/school/classes', { params });
  return response.data;
};

/**
 * Get single class details
 * @param {number} classId - Class ID
 */
export const getClass = async (classId) => {
  const response = await api.get(`/school/classes/${classId}`);
  return response.data;
};

/**
 * Create new class under a grade
 * @param {number} gradeId - Grade ID
 * @param {Object} data - Class data
 */
export const createClass = async (gradeId, data) => {
  const response = await api.post(`/school/grades/${gradeId}/classes`, data);
  return response.data;
};

/**
 * Update class
 * @param {number} classId - Class ID
 * @param {Object} data - Updated class data
 */
export const updateClass = async (classId, data) => {
  const response = await api.put(`/school/classes/${classId}`, data);
  return response.data;
};

/**
 * Delete class
 * @param {number} classId - Class ID
 */
export const deleteClass = async (classId) => {
  const response = await api.delete(`/school/classes/${classId}`);
  return response.data;
};

/**
 * Assign class head to a class
 * @param {number} classId - Class ID
 * @param {number} teacherId - Teacher ID
 */
export const assignClassHead = async (classId, teacherId) => {
  const response = await api.post(`/school/classes/${classId}/class-head`, { teacher_id: teacherId });
  return response.data;
};

/**
 * Remove class head from a class
 * @param {number} classId - Class ID
 */
export const removeClassHead = async (classId) => {
  const response = await api.delete(`/school/classes/${classId}/class-head`);
  return response.data;
};

// ============ SUBJECTS ============

/**
 * Get subjects for a grade
 * @param {number} gradeId - Grade ID
 */
export const getSubjects = async (gradeId) => {
  const response = await api.get(`/school/grades/${gradeId}/subjects`);
  return response.data;
};

/**
 * Get all subjects (across all grades)
 */
export const getAllSubjects = async (params = {}) => {
  const response = await api.get('/school/subjects', { params });
  return response.data;
};

/**
 * Add subject to grade
 * @param {number} gradeId - Grade ID
 * @param {Object} data - Subject data
 */
export const addSubject = async (gradeId, data) => {
  const response = await api.post(`/school/grades/${gradeId}/subjects`, data);
  return response.data;
};

/**
 * Update subject
 * @param {number} gradeId - Grade ID
 * @param {number} subjectId - Subject ID
 * @param {Object} data - Updated subject data
 */
export const updateSubject = async (gradeId, subjectId, data) => {
  const response = await api.put(`/school/grades/${gradeId}/subjects/${subjectId}`, data);
  return response.data;
};

/**
 * Remove subject from grade
 * @param {number} gradeId - Grade ID
 * @param {number} subjectId - Subject ID
 */
export const removeSubject = async (gradeId, subjectId) => {
  const response = await api.delete(`/school/grades/${gradeId}/subjects/${subjectId}`);
  return response.data;
};

// ============ ASSESSMENT TYPES ============

/**
 * Get all assessment types
 */
export const getAssessmentTypes = async () => {
  const response = await api.get('/school/assessment-types');
  return response.data;
};

/**
 * Create assessment type
 * @param {Object} data - Assessment type data
 */
export const createAssessmentType = async (data) => {
  const response = await api.post('/school/assessment-types', data);
  return response.data;
};

/**
 * Update assessment type
 * @param {number} typeId - Assessment type ID
 * @param {Object} data - Updated data
 */
export const updateAssessmentType = async (typeId, data) => {
  const response = await api.put(`/school/assessment-types/${typeId}`, data);
  return response.data;
};

/**
 * Delete assessment type
 * @param {number} typeId - Assessment type ID
 */
export const deleteAssessmentType = async (typeId) => {
  const response = await api.delete(`/school/assessment-types/${typeId}`);
  return response.data;
};

// ============ WEIGHT TEMPLATES ============

/**
 * Get weight templates
 * @param {Object} params - Query parameters (grade_id, subject_id)
 */
export const getWeightTemplates = async (params = {}) => {
  const response = await api.get('/school/weight-templates', { params });
  return response.data;
};

/**
 * Get weight template details
 * @param {number} templateId - Template ID
 */
export const getWeightTemplate = async (templateId) => {
  const response = await api.get(`/school/weight-templates/${templateId}`);
  return response.data;
};

/**
 * Create weight template
 * @param {Object} data - Template data
 */
export const createWeightTemplate = async (data) => {
  const response = await api.post('/school/weight-templates', data);
  return response.data;
};

/**
 * Update weight template
 * @param {number} templateId - Template ID
 * @param {Object} data - Updated data
 */
export const updateWeightTemplate = async (templateId, data) => {
  const response = await api.put(`/school/weight-templates/${templateId}`, data);
  return response.data;
};

/**
 * Delete weight template
 * @param {number} templateId - Template ID
 */
export const deleteWeightTemplate = async (templateId) => {
  const response = await api.delete(`/school/weight-templates/${templateId}`);
  return response.data;
};

// ============ TEACHERS ============

/**
 * Get list of teachers in the school
 */
export const getTeachers = async (params = {}) => {
  const response = await api.get('/school/teachers', { params });
  return response.data;
};

// ============ TEACHING ASSIGNMENTS ============

/**
 * Get teaching assignments
 * @param {Object} params - Query parameters (teacher_id, class_id, subject_id, grade_id)
 */
export const getTeachingAssignments = async (params = {}) => {
  const response = await api.get('/school/teaching-assignments', { params });
  return response.data;
};

/**
 * Create teaching assignment
 * @param {Object} data - Assignment data (teacher_id, class_id, subject_id, academic_year_id)
 */
export const createTeachingAssignment = async (data) => {
  const response = await api.post('/school/teaching-assignments', data);
  return response.data;
};

/**
 * Update teaching assignment
 * @param {number} assignmentId - Assignment ID
 * @param {Object} data - Updated data
 */
export const updateTeachingAssignment = async (assignmentId, data) => {
  const response = await api.put(`/school/teaching-assignments/${assignmentId}`, data);
  return response.data;
};

/**
 * Delete teaching assignment
 * @param {number} assignmentId - Assignment ID
 */
export const deleteTeachingAssignment = async (assignmentId) => {
  const response = await api.delete(`/school/teaching-assignments/${assignmentId}`);
  return response.data;
};

// ============ REPORTS ============

/**
 * Get class averages report
 * @param {Object} params - Query parameters (grade_id, class_id, semester_id, academic_year_id)
 */
export const getClassAverages = async (params) => {
  const response = await api.get('/school/reports/class-averages', { params });
  return response.data;
};

export default {
  // Grades
  getGrades,
  getGrade,
  createGrade,
  updateGrade,
  deleteGrade,
  // Classes
  getClasses,
  getAllClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  assignClassHead,
  removeClassHead,
  // Subjects
  getSubjects,
  getAllSubjects,
  addSubject,
  updateSubject,
  removeSubject,
  // Assessment Types
  getAssessmentTypes,
  createAssessmentType,
  updateAssessmentType,
  deleteAssessmentType,
  // Weight Templates
  getWeightTemplates,
  getWeightTemplate,
  createWeightTemplate,
  updateWeightTemplate,
  deleteWeightTemplate,
  // Teachers
  getTeachers,
  // Teaching Assignments
  getTeachingAssignments,
  createTeachingAssignment,
  updateTeachingAssignment,
  deleteTeachingAssignment,
  // Reports
  getClassAverages,
};

