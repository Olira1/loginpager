// Auth Context - Global authentication state management
// Provides user, login, logout functions to all components

import { createContext, useContext, useState, useEffect } from 'react';
import { login as loginApi, getCurrentUser, logout as logoutApi } from '../services/authService';

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

  /**
   * Login function
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {boolean} remember - If true, store in localStorage, else sessionStorage
   * @returns {Object} - { success: boolean, error?: string, redirectPath?: string }
   */
  const login = async (email, password, remember = false) => {
    try {
      const response = await loginApi(email, password);
      
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
      const errorMessage = error.response?.data?.error?.message || 'Invalid email or password';
      return { success: false, error: errorMessage };
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
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;

