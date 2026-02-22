// Admin Service - API calls for Admin endpoints
// Manages schools, promotion criteria, and statistics

import api from './api';

// ============ SCHOOLS ============

/**
 * Get list of all schools with pagination and filters
 * @param {Object} params - Query parameters (page, limit, status, search)
 */
export const getSchools = async (params = {}) => {
  const response = await api.get('/admin/schools', { params });
  return response.data;
};

/**
 * Get single school details
 * @param {number} schoolId - School ID
 */
export const getSchool = async (schoolId) => {
  const response = await api.get(`/admin/schools/${schoolId}`);
  return response.data;
};

/**
 * Create new school
 * @param {Object} data - School data
 */
export const createSchool = async (data) => {
  const response = await api.post('/admin/schools', data);
  return response.data;
};

/**
 * Update school
 * @param {number} schoolId - School ID
 * @param {Object} data - Updated school data
 */
export const updateSchool = async (schoolId, data) => {
  const response = await api.put(`/admin/schools/${schoolId}`, data);
  return response.data;
};

/**
 * Delete school
 * @param {number} schoolId - School ID
 */
export const deleteSchool = async (schoolId) => {
  const response = await api.delete(`/admin/schools/${schoolId}`);
  return response.data;
};

/**
 * Activate school
 * @param {number} schoolId - School ID
 */
export const activateSchool = async (schoolId) => {
  const response = await api.patch(`/admin/schools/${schoolId}/activate`);
  return response.data;
};

/**
 * Deactivate school
 * @param {number} schoolId - School ID
 */
export const deactivateSchool = async (schoolId) => {
  const response = await api.patch(`/admin/schools/${schoolId}/deactivate`);
  return response.data;
};

// ============ PROMOTION CRITERIA ============

/**
 * Get list of promotion criteria
 * @param {Object} params - Query parameters (page, limit)
 */
export const getPromotionCriteria = async (params = {}) => {
  const response = await api.get('/admin/promotion-criteria', { params });
  return response.data;
};

/**
 * Get single promotion criteria details
 * @param {number} criteriaId - Criteria ID
 */
export const getPromotionCriteriaById = async (criteriaId) => {
  const response = await api.get(`/admin/promotion-criteria/${criteriaId}`);
  return response.data;
};

/**
 * Create new promotion criteria
 * @param {Object} data - Criteria data
 */
export const createPromotionCriteria = async (data) => {
  const response = await api.post('/admin/promotion-criteria', data);
  return response.data;
};

/**
 * Update promotion criteria
 * @param {number} criteriaId - Criteria ID
 * @param {Object} data - Updated criteria data
 */
export const updatePromotionCriteria = async (criteriaId, data) => {
  const response = await api.put(`/admin/promotion-criteria/${criteriaId}`, data);
  return response.data;
};

/**
 * Delete promotion criteria
 * @param {number} criteriaId - Criteria ID
 */
export const deletePromotionCriteria = async (criteriaId) => {
  const response = await api.delete(`/admin/promotion-criteria/${criteriaId}`);
  return response.data;
};

// ============ STATISTICS ============

/**
 * Get platform-wide statistics
 */
export const getStatistics = async () => {
  const response = await api.get('/admin/statistics');
  return response.data;
};

/**
 * Get statistics for a specific school
 * @param {number} schoolId - School ID
 */
export const getSchoolStatistics = async (schoolId) => {
  const response = await api.get(`/admin/statistics/schools/${schoolId}`);
  return response.data;
};

export default {
  // Schools
  getSchools,
  getSchool,
  createSchool,
  updateSchool,
  deleteSchool,
  activateSchool,
  deactivateSchool,
  // Promotion Criteria
  getPromotionCriteria,
  getPromotionCriteriaById,
  createPromotionCriteria,
  updatePromotionCriteria,
  deletePromotionCriteria,
  // Statistics
  getStatistics,
  getSchoolStatistics,
};

