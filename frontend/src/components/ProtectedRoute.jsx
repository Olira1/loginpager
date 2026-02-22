// Protected Route - Route guard component
// Protects routes from unauthorized access
// Redirects to login if not authenticated
// Optionally checks for specific roles

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * ProtectedRoute Component
 * @param {React.ReactNode} children - Child components to render if authorized
 * @param {string|string[]} allowedRoles - Optional role(s) allowed to access this route
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-gray-500 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted location for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role access if allowedRoles is specified
  if (allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!roles.includes(user?.role)) {
      // User doesn't have required role, redirect to their dashboard
      const roleRedirects = {
        admin: '/admin',
        school_head: '/school',
        teacher: '/teacher',
        class_head: '/class-head',
        student: '/student',
        parent: '/parent',
        store_house: '/store-house',
      };
      
      const redirectPath = roleRedirects[user?.role] || '/dashboard';
      return <Navigate to={redirectPath} replace />;
    }
  }

  // User is authenticated and has required role (if specified)
  return children;
};

export default ProtectedRoute;

