// Header Component - Top navigation bar
// Shows user info, notifications, and logout

import { useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { roleDisplayNames } from '../../config/navigation';

/**
 * Header Component
 * @param {function} onMenuClick - Toggle sidebar callback
 */
const Header = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Get user initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  // Get role display name
  const getRoleDisplay = () => {
    return roleDisplayNames[user?.role] || user?.role;
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* Left Side - Menu Button (mobile) + Page Title */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>

        {/* Page Title Area - Can be customized per page */}
        <div className="hidden sm:block">
          <h1 className="text-lg font-semibold text-gray-900">
            {getRoleDisplay()} Portal
          </h1>
        </div>
      </div>

      {/* Right Side - Notifications + User */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
          {/* Notification Badge */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {/* Avatar */}
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {getInitials(user?.name)}
            </div>

            {/* User Info (hidden on mobile) */}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 max-w-[120px] truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500">
                {getRoleDisplay()}
              </p>
            </div>

            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              {/* User Info (shown in dropdown on mobile) */}
              <div className="px-4 py-3 border-b border-gray-100 sm:hidden">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>

              {/* School Name (if applicable) */}
              {user?.school_name && (
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400">School</p>
                  <p className="text-sm text-gray-700 truncate">{user.school_name}</p>
                </div>
              )}

              {/* Profile Link */}
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // Navigate to profile based on role
                  const basePath = user?.role === 'admin' ? '/admin' : `/${user?.role?.replace('_', '-')}`;
                  navigate(`${basePath}/profile`);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>My Profile</span>
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

