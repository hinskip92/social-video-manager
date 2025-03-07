import { Link, useLocation } from 'react-router-dom';
import { XMarkIcon, FolderPlusIcon, Cog6ToothIcon, FolderIcon } from '@heroicons/react/24/outline';
import { useDirectories } from '../contexts/DirectoryContext';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const Sidebar = ({ open, setOpen }: SidebarProps) => {
  const location = useLocation();
  const { directories, selectedDirectory, setSelectedDirectory, addDirectory } = useDirectories();

  const handleAddDirectory = async () => {
    try {
      const paths = await window.electronAPI.openDirectory();
      if (paths && paths.length > 0) {
        addDirectory(paths[0]);
      }
    } catch (error) {
      console.error('Error adding directory:', error);
    }
  };

  return (
    <aside
      className={`z-30 fixed inset-y-0 left-0 w-64 transition-transform duration-300 transform bg-white dark:bg-gray-800 md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col h-full py-4 overflow-y-auto">
        <div className="flex items-center justify-between px-4">
          <Link to="/" className="text-lg font-bold text-gray-800 dark:text-gray-200">
            Social Video Manager
          </Link>
          <button
            className="p-1 rounded-md text-gray-500 md:hidden focus:outline-none"
            onClick={() => setOpen(false)}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-grow mt-6">
          <div className="flex justify-between items-center px-4 mb-2">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              DIRECTORIES
            </h2>
            <button
              onClick={handleAddDirectory}
              className="p-1 text-blue-500 hover:text-blue-600 focus:outline-none"
              aria-label="Add Directory"
            >
              <FolderPlusIcon className="w-5 h-5" />
            </button>
          </div>
          
          <div className="px-2">
            {directories.length === 0 ? (
              <div className="px-4 py-3 text-sm text-center text-gray-500">
                No directories added yet.<br />
                Click the + button to add one.
              </div>
            ) : (
              <ul className="space-y-1">
                {directories.map((directory) => (
                  <li key={directory.path}>
                    <button
                      className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        selectedDirectory === directory.path
                          ? 'text-white bg-blue-600'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => setSelectedDirectory(directory.path)}
                    >
                      <FolderIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                      <span className="truncate">{directory.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        <div className="px-4 mt-6">
          <Link
            to="/settings"
            className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
              location.pathname === '/settings'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Cog6ToothIcon className="w-5 h-5 mr-3 flex-shrink-0" />
            <span>Settings</span>
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar; 