// Auth Service - Authentication API calls
// Handles login, logout, and getCurrentUser

import api from './api';

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} - API response with access_token and user data
 */
export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

/**
 * Get current authenticated user
 * @returns {Promise} - API response with user data
 */
export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

/**
 * Logout current user
 * @returns {Promise} - API response confirming logout
 */
export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export default {
  login,
  getCurrentUser,
  logout,
};

