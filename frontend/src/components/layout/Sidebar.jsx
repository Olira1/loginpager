// Sidebar Component - Role-based navigation
// Displays navigation items based on user role

import { NavLink } from 'react-router-dom';
import { GraduationCap, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNavigationForRole } from '../../config/navigation';

/**
 * Sidebar Component
 * @param {boolean} isOpen - Whether sidebar is open (mobile)
 * @param {function} onClose - Close sidebar callback (mobile)
 */
const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navItems = getNavigationForRole(user?.role);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-white border-r border-gray-200
          transition-all duration-300 ease-in-out
          lg:static lg:z-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isOpen ? 'lg:w-64 lg:translate-x-0' : 'lg:w-0 lg:overflow-hidden lg:translate-x-0 lg:border-r-0'}
        `}
      >
        <div className="w-64 h-full flex flex-col">
          {/* Logo Section */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2 text-indigo-600">
              <GraduationCap className="w-8 h-8" />
              <span className="text-xl font-bold">SchoolPortal</span>
            </div>
            
            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
  
          {/* Navigation */}
          <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === `/${user?.role?.replace('_', '-')}`}
                  onClick={onClose}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive
                      ? 'bg-indigo-50 text-indigo-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
  
          {/* Footer */}
          <div className="p-4 border-t border-gray-200 flex-shrink-0">
            <p className="text-xs text-gray-400 text-center">
              © 2026 SchoolPortal
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

