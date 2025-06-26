import { Bars3Icon, SunIcon, MoonIcon, MagnifyingGlassIcon, BellIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header = ({ sidebarOpen, setSidebarOpen }: HeaderProps) => {
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('darkMode') === 'true' ||
    (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <header className="z-20 sticky top-0 glass bg-white/80 dark:bg-dark-900/80 border-b border-gray-200/50 dark:border-dark-700/50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              className="btn btn-icon btn-ghost md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Menu"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>

            {/* Search bar */}
            <div className={`relative transition-all duration-300 ${searchFocused ? 'w-80' : 'w-64'}`}>
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <MagnifyingGlassIcon className={`w-5 h-5 transition-colors ${searchFocused ? 'text-primary-500' : 'text-gray-400'}`} />
              </div>
              <input
                className="input input-search"
                type="text"
                placeholder="Search videos, photos..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                aria-label="Search"
              />
              {searchFocused && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-fade-in">
                  <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-dark-700 dark:text-gray-400 rounded">ESC</kbd>
                </div>
              )}
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button className="btn btn-icon btn-ghost relative group">
              <BellIcon className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full animate-pulse"></span>
              <span className="tooltip -bottom-8 right-0">Notifications</span>
            </button>

            {/* Theme toggle */}
            <button
              className="btn btn-icon btn-ghost relative group"
              onClick={toggleDarkMode}
              aria-label="Toggle theme"
            >
              <div className="relative w-5 h-5 overflow-hidden">
                <SunIcon className={`absolute inset-0 w-5 h-5 text-yellow-500 transition-all duration-300 ${darkMode ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`} />
                <MoonIcon className={`absolute inset-0 w-5 h-5 text-primary-400 transition-all duration-300 ${darkMode ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`} />
              </div>
              <span className="tooltip -bottom-8 right-0">{darkMode ? 'Light mode' : 'Dark mode'}</span>
            </button>

            {/* User avatar */}
            <div className="ml-3 relative group">
              <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium shadow-soft">
                  U
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200">User</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 