// Auth Context - Global authentication state management
// Provides user, login, logout functions to all components

import { createContext, useContext, useState, useEffect } from 'react';
import {
  login as loginApi,
  getCurrentUser,
  logout as logoutApi,
  changePassword as changePasswordApi
} from '../services/authService';

// Create the context
const AuthContext = createContext(null);

// Role-based redirect paths
const ROLE_PATHS = {
  admin: '/admin',
  school_head: '/school',
  teacher: '/teacher',
  class_head: '/class-head',
  student: '/student',
  parent: '/parent',
  store_house: '/store-house',
  registrar: '/registrar',
};

/**
 * Auth Provider Component
 * Wraps the app and provides authentication state
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * Clear all auth data from state and storage
   */
  const clearAuth = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
  };

  // Check for existing token on app load
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (storedToken) {
        setToken(storedToken);
        try {
          // Validate token by fetching current user
          const response = await getCurrentUser();
          if (response.success) {
            setUser(response.data);
            setIsAuthenticated(true);
          } else {
            // Token invalid, clear storage
            clearAuth();
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }
        } catch (error) {
          // Token invalid, expired, or school suspended
          clearAuth();
          const isSchoolSuspended = error.response?.status === 403 &&
            error.response?.data?.error?.code === 'SCHOOL_INACTIVE';
          if (window.location.pathname !== '/login') {
            window.location.href = isSchoolSuspended
              ? '/login?error=school_suspended'
              : '/login';
          }
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  /**
   * Login function
   * @param {string} username - Email, student code, staff code, or phone
   * @param {string} password - User password
   * @param {boolean} remember - If true, store in localStorage, else sessionStorage
   * @returns {Object} - { success: boolean, error?: string, redirectPath?: string }
   */
  const login = async (username, password, remember = false) => {
    try {
      const response = await loginApi(username, password);
      
      if (response.success) {
        const { access_token, user: userData } = response.data;
        
        // Store token based on "remember me" choice
        if (remember) {
          localStorage.setItem('token', access_token);
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          sessionStorage.setItem('token', access_token);
          sessionStorage.setItem('user', JSON.stringify(userData));
        }
        
        // Update state
        setToken(access_token);
        setUser(userData);
        setIsAuthenticated(true);
        
        // Enforce first-login password update flow
        if (userData.must_change_password) {
          return { success: true, redirectPath: '/change-password', mustChangePassword: true };
        }

        // Get redirect path based on role
        const redirectPath = ROLE_PATHS[userData.role] || '/dashboard';
        
        return { success: true, redirectPath };
      } else {
        return { 
          success: false, 
          error: response.error?.message || 'Login failed' 
        };
      }
    } catch (error) {
      // Handle API errors
      const errorMessage = error.response?.data?.error?.message || 'Invalid username or password';
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Change password for current user
   */
  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
      const response = await changePasswordApi(currentPassword, newPassword, confirmPassword);
      if (!response.success) {
        return {
          success: false,
          error: response.error?.message || 'Password change failed'
        };
      }

      const refreshed = await getCurrentUser();
      if (refreshed.success) {
        const updatedUser = refreshed.data;
        setUser(updatedUser);

        if (localStorage.getItem('token')) {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        if (sessionStorage.getItem('token')) {
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
        }

        return {
          success: true,
          redirectPath: ROLE_PATHS[updatedUser.role] || '/dashboard'
        };
      }

      return { success: true, redirectPath: '/dashboard' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Password change failed'
      };
    }
  };

  /**
   * Logout function
   * Clears auth state and redirects to login
   */
  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      // Ignore logout API errors, still clear local state
      console.error('Logout API error:', error);
    }
    
    clearAuth();
  };

  /**
   * Get redirect path for current user's role
   */
  const getRedirectPath = () => {
    if (user?.role) {
      return ROLE_PATHS[user.role] || '/dashboard';
    }
    return '/login';
  };

  // Context value
  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    changePassword,
    getRedirectPath,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use auth context
 * @returns {Object} - Auth context value
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;

