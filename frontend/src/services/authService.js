// Auth Service - Authentication API calls
// Handles login, logout, and getCurrentUser

import api from './api';

/**
 * Login user with username and password
 * @param {string} username - Email, student code, staff code, or phone
 * @param {string} password - User password
 * @returns {Promise} - API response with access_token and user data
 */
export const login = async (username, password) => {
  const response = await api.post('/auth/login', { username, password });
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

/**
 * Change current user's password
 * @param {string} current_password - Current password
 * @param {string} new_password - New password
 * @param {string} confirm_password - New password confirmation
 * @returns {Promise} - API response
 */
export const changePassword = async (current_password, new_password, confirm_password) => {
  const response = await api.post('/auth/change-password', {
    current_password,
    new_password,
    confirm_password
  });
  return response.data;
};

/**
 * Recover username by phone number
 * @param {string} phone - Phone number used for account
 * @returns {Promise} - API response
 */
export const forgotUsername = async (phone) => {
  const response = await api.post('/auth/forgot-username', { phone });
  return response.data;
};

export default {
  login,
  getCurrentUser,
  logout,
  changePassword,
  forgotUsername,
};

