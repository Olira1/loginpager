// Dashboard Layout Component
// Main wrapper for all authenticated pages
// Includes Sidebar, Header, and content area

import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * DashboardLayout Component
 * Provides the main layout structure for all dashboard pages
 */
const DashboardLayout = () => {
  const isMobileInitial = () => window.matchMedia('(max-width: 1023px)').matches;
  const [isMobile, setIsMobile] = useState(isMobileInitial);
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobileInitial());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const handleChange = (event) => {
      const mobile = event.matches;
      setIsMobile(mobile);
      // Keep mobile closed by default; keep desktop open by default.
      setSidebarOpen(!mobile);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet />

          {/* Footer - Moved inside scrollable area to scroll with content */}
          <footer className="mt-8 py-4 px-6 text-center text-sm text-gray-400 border-t border-gray-200">
            © 2026 SchoolPortal. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

