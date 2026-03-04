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

// ============ ACADEMIC YEAR LIFECYCLE ============

/**
 * List academic years for lifecycle forms
 */
export const getLifecycleAcademicYears = async () => {
  const response = await api.get('/school/academic-years');
  return response.data;
};

/**
 * List semesters for lifecycle forms
 * @param {Object} params - optional { academic_year_id }
 */
export const getLifecycleSemesters = async (params = {}) => {
  const response = await api.get('/school/semesters', { params });
  return response.data;
};

/**
 * Initialize classes for a target academic year from a source year
 * @param {number} academicYearId - Target academic year ID
 * @param {Object} data - { source_academic_year_id, copy_class_heads }
 */
export const initializeClassesForAcademicYear = async (academicYearId, data) => {
  const response = await api.post(`/school/academic-years/${academicYearId}/initialize-classes`, data);
  return response.data;
};

/**
 * Open semester for grade entry
 * @param {number} semesterId
 * @param {Object} data - optional { reason }
 */
export const openSemester = async (semesterId, data = {}) => {
  const response = await api.post(`/school/semesters/${semesterId}/open`, data);
  return response.data;
};

/**
 * Close semester submissions
 * @param {number} semesterId
 * @param {Object} data - optional { reason }
 */
export const closeSemesterSubmission = async (semesterId, data = {}) => {
  const response = await api.post(`/school/semesters/${semesterId}/close-submission`, data);
  return response.data;
};

/**
 * Lock semester
 * @param {number} semesterId
 * @param {Object} data - optional { reason }
 */
export const lockSemester = async (semesterId, data = {}) => {
  const response = await api.post(`/school/semesters/${semesterId}/lock`, data);
  return response.data;
};

/**
 * Reopen semester
 * @param {number} semesterId
 * @param {Object} data - optional { reason }
 */
export const reopenSemester = async (semesterId, data = {}) => {
  const response = await api.post(`/school/semesters/${semesterId}/reopen`, data);
  return response.data;
};

// ============ SUBJECTS ============

/**
 * Get subjects for a grade
 * @param {number} gradeId - Grade ID
 */
export const getSubjects = async (gradeId, params = {}) => {
  const response = await api.get(`/school/grades/${gradeId}/subjects`, { params });
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
export const removeSubject = async (gradeId, subjectId, params = {}) => {
  const response = await api.delete(`/school/grades/${gradeId}/subjects/${subjectId}`, { params });
  return response.data;
};

/**
 * Deactivate subject before deletion
 * @param {number} gradeId - Grade ID
 * @param {number} subjectId - Subject ID
 */
export const deactivateSubject = async (gradeId, subjectId, params = {}) => {
  const response = await api.patch(`/school/grades/${gradeId}/subjects/${subjectId}/deactivate`, {}, { params });
  return response.data;
};

/**
 * Activate a previously deactivated subject
 * @param {number} gradeId - Grade ID
 * @param {number} subjectId - Subject ID
 */
export const activateSubject = async (gradeId, subjectId, params = {}) => {
  const response = await api.patch(`/school/grades/${gradeId}/subjects/${subjectId}/activate`, {}, { params });
  return response.data;
};

// ============ ASSESSMENT TYPES ============

/**
 * Get all assessment types
 * @param {Object} params - Query parameters (academic_year_id)
 */
export const getAssessmentTypes = async (params = {}) => {
  const response = await api.get('/school/assessment-types', { params });
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

// ============ REGISTRARS ============

/**
 * Get list of registrars in the school
 * @param {Object} params - Query parameters (page, limit, status, search)
 */
export const getRegistrars = async (params = {}) => {
  const response = await api.get('/school/registrars', { params });
  return response.data;
};

/**
 * Create registrar account
 * @param {Object} data - Registrar data
 */
export const createRegistrar = async (data) => {
  const response = await api.post('/school/registrars', data);
  return response.data;
};

/**
 * Update registrar account
 * @param {number} userId - Registrar user ID
 * @param {Object} data - Updated registrar fields
 */
export const updateRegistrar = async (userId, data) => {
  const response = await api.put(`/school/registrars/${userId}`, data);
  return response.data;
};

/**
 * Activate registrar account
 * @param {number} userId - Registrar user ID
 */
export const activateRegistrar = async (userId) => {
  const response = await api.patch(`/school/registrars/${userId}/activate`);
  return response.data;
};

/**
 * Deactivate registrar account
 * @param {number} userId - Registrar user ID
 */
export const deactivateRegistrar = async (userId) => {
  const response = await api.patch(`/school/registrars/${userId}/deactivate`);
  return response.data;
};

/**
 * Delete registrar account
 * @param {number} userId - Registrar user ID
 */
export const deleteRegistrar = async (userId) => {
  try {
    const response = await api.delete(`/school/registrars/${userId}`);
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      const fallback = await api.delete(`/school/registrars/delete/${userId}`);
      return fallback.data;
    }
    throw error;
  }
};

/**
 * Reset registrar password
 * @param {number} userId - Registrar user ID
 */
export const resetRegistrarPassword = async (userId) => {
  const response = await api.post(`/school/registrars/${userId}/reset-password`);
  return response.data;
};

// ============ STORE HOUSE USERS ============

/**
 * Get list of store house users in the school
 * @param {Object} params - Query parameters (page, limit, status, search)
 */
export const getStoreHouseUsers = async (params = {}) => {
  const response = await api.get('/school/store-house-users', { params });
  return response.data;
};

/**
 * Create store house user account
 * @param {Object} data - Store house user data
 */
export const createStoreHouseUser = async (data) => {
  const response = await api.post('/school/store-house-users', data);
  return response.data;
};

/**
 * Update store house user account
 * @param {number} userId - Store house user ID
 * @param {Object} data - Updated store house user fields
 */
export const updateStoreHouseUser = async (userId, data) => {
  const response = await api.put(`/school/store-house-users/${userId}`, data);
  return response.data;
};

/**
 * Activate store house user account
 * @param {number} userId - Store house user ID
 */
export const activateStoreHouseUser = async (userId) => {
  const response = await api.patch(`/school/store-house-users/${userId}/activate`);
  return response.data;
};

/**
 * Deactivate store house user account
 * @param {number} userId - Store house user ID
 */
export const deactivateStoreHouseUser = async (userId) => {
  const response = await api.patch(`/school/store-house-users/${userId}/deactivate`);
  return response.data;
};

/**
 * Delete store house user account
 * @param {number} userId - Store house user ID
 */
export const deleteStoreHouseUser = async (userId) => {
  try {
    const response = await api.delete(`/school/store-house-users/${userId}`);
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      const fallback = await api.delete(`/school/store-house-users/delete/${userId}`);
      return fallback.data;
    }
    throw error;
  }
};

/**
 * Reset store house user password
 * @param {number} userId - Store house user ID
 */
export const resetStoreHouseUserPassword = async (userId) => {
  const response = await api.post(`/school/store-house-users/${userId}/reset-password`);
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

// ============ PROMOTION CRITERIA ============

/**
 * Get list of promotion criteria for the school
 * @param {Object} params - Query parameters (page, limit)
 */
export const getPromotionCriteria = async (params = {}) => {
  const response = await api.get('/school/promotion-criteria', { params });
  return response.data;
};

/**
 * Get single promotion criteria details
 * @param {number} criteriaId - Criteria ID
 */
export const getPromotionCriteriaById = async (criteriaId) => {
  const response = await api.get(`/school/promotion-criteria/${criteriaId}`);
  return response.data;
};

/**
 * Create new promotion criteria
 * @param {Object} data - Criteria data
 */
export const createPromotionCriteria = async (data) => {
  const response = await api.post('/school/promotion-criteria', data);
  return response.data;
};

/**
 * Update promotion criteria
 * @param {number} criteriaId - Criteria ID
 * @param {Object} data - Updated criteria data
 */
export const updatePromotionCriteria = async (criteriaId, data) => {
  const response = await api.put(`/school/promotion-criteria/${criteriaId}`, data);
  return response.data;
};

/**
 * Delete promotion criteria
 * @param {number} criteriaId - Criteria ID
 */
export const deletePromotionCriteria = async (criteriaId) => {
  const response = await api.delete(`/school/promotion-criteria/${criteriaId}`);
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
  // Academic Year Lifecycle
  getLifecycleAcademicYears,
  getLifecycleSemesters,
  initializeClassesForAcademicYear,
  openSemester,
  closeSemesterSubmission,
  lockSemester,
  reopenSemester,
  // Subjects
  getSubjects,
  getAllSubjects,
  addSubject,
  updateSubject,
  deactivateSubject,
  activateSubject,
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
  // Registrars
  getRegistrars,
  createRegistrar,
  updateRegistrar,
  activateRegistrar,
  deactivateRegistrar,
  deleteRegistrar,
  resetRegistrarPassword,
  // Store House Users
  getStoreHouseUsers,
  createStoreHouseUser,
  updateStoreHouseUser,
  activateStoreHouseUser,
  deactivateStoreHouseUser,
  deleteStoreHouseUser,
  resetStoreHouseUserPassword,
  // Teaching Assignments
  getTeachingAssignments,
  createTeachingAssignment,
  updateTeachingAssignment,
  deleteTeachingAssignment,
  // Promotion Criteria
  getPromotionCriteria,
  getPromotionCriteriaById,
  createPromotionCriteria,
  updatePromotionCriteria,
  deletePromotionCriteria,
  // Reports
  getClassAverages,
};

