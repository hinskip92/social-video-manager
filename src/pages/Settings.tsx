import { useState } from 'react';
import { useDirectories } from '../contexts/DirectoryContext';
import { TrashIcon } from '@heroicons/react/24/outline';

const Settings = () => {
  const { directories, removeDirectory, refreshVideos } = useDirectories();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await refreshVideos();
    setIsRefreshing(false);
  };

  return (
    <div className="py-6">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
        Settings
      </h2>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg shadow dark:bg-gray-800 p-6">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            Manage Directories
          </h3>

          {directories.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              No directories added yet. Add a directory from the sidebar.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Manage your video directories. Removing a directory will remove all its videos from the library.
              </p>
              <ul className="space-y-2">
                {directories.map((directory) => (
                  <li 
                    key={directory.path}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                  >
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {directory.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 break-all">
                        {directory.path}
                      </p>
                    </div>
                    <button
                      onClick={() => removeDirectory(directory.path)}
                      className="p-2 text-red-500 hover:text-red-700 focus:outline-none"
                      aria-label={`Remove ${directory.name}`}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow dark:bg-gray-800 p-6">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            Video Library
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Refresh your video library to scan for new videos in all directories.
          </p>
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing || directories.length === 0}
            className={`px-4 py-2 rounded-md ${
              directories.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isRefreshing ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </span>
            ) : (
              'Refresh All Videos'
            )}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow dark:bg-gray-800 p-6">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            About
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Social Video Manager v1.0.0
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            A local, interactive social media video asset manager.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings; 