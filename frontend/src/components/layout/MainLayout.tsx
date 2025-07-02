import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * MainLayout serves as the primary structural component for the authenticated user interface.
 * It provides a consistent shell with a header, a main content area for nested routes,
 * and a bottom navigation bar.
 */
const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Placeholder */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm h-16 flex items-center justify-center z-20">
        <p className="text-lg font-bold text-gray-800 dark:text-white">YALURIDE</p>
      </header>

      {/* Main Content Area */}
      {/* The Outlet component from react-router-dom renders the matched child route's component. */}
      {/* The area is scrollable and has padding at the bottom to avoid being obscured by the fixed navigation bar. */}
      <main className="flex-grow overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation Placeholder */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 h-16 flex items-center justify-around z-20">
        {/* These will be replaced by actual navigation links/icons */}
        <div className="text-center text-gray-600 dark:text-gray-300">
          <span className="block text-xs">Home</span>
        </div>
        <div className="text-center text-gray-600 dark:text-gray-300">
          <span className="block text-xs">Rides</span>
        </div>
        <div className="text-center text-gray-600 dark:text-gray-300">
          <span className="block text-xs">Wallet</span>
        </div>
        <div className="text-center text-gray-600 dark:text-gray-300">
          <span className="block text-xs">Profile</span>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
