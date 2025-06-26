import { Link, useLocation, useNavigate } from 'react-router-dom';
import { XMarkIcon, FolderPlusIcon, Cog6ToothIcon, FolderIcon, DocumentTextIcon, PhotoIcon, VideoCameraIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useDirectories } from '../contexts/DirectoryContext';
import { usePhotos } from '../contexts/PhotoContext';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const Sidebar = ({ open, setOpen }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { directories, selectedDirectory, setSelectedDirectory, addDirectory } = useDirectories();
  const { directories: photoDirs, selectedDirectory: selectedPhotoDir, setSelectedDirectory: setSelectedPhotoDir, addDirectory: addPhotoDirectory } = usePhotos();

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

  const handleAddPhotoDirectory = async () => {
    try {
      const paths = await window.electronAPI.openDirectory();
      if (paths && paths.length > 0) {
        addPhotoDirectory(paths[0]);
      }
    } catch (error) {
      console.error('Error adding photo directory:', error);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 md:hidden animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}
      
      <aside
        className={`z-30 fixed inset-y-0 left-0 w-72 transition-all duration-300 transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full glass bg-white/95 dark:bg-dark-900/95 border-r border-gray-200/50 dark:border-dark-700/50">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200/50 dark:border-dark-700/50">
              <div className="flex items-center justify-between">
                <Link to="/" className="flex items-center space-x-3 group">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg group-hover:shadow-glow transition-shadow">
                    <VideoCameraIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-lg font-display font-bold text-gray-900 dark:text-white">Video Manager</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Social Media Tools</p>
                  </div>
                </Link>
                <button
                  className="btn btn-icon btn-ghost md:hidden"
                  onClick={() => setOpen(false)}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex-grow overflow-y-auto p-4 space-y-6">
              {/* Video Directories */}
              <div className="animate-slide-up">
                <div className="flex items-center justify-between mb-3 px-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Video Libraries
                  </h2>
                  <button
                    onClick={handleAddDirectory}
                    className="btn btn-icon btn-ghost text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    aria-label="Add Directory"
                  >
                    <FolderPlusIcon className="w-4 h-4" />
                  </button>
                </div>
                
                {directories.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-dark-800 flex items-center justify-center">
                      <FolderIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No directories yet</p>
                    <button
                      onClick={handleAddDirectory}
                      className="btn btn-sm btn-primary"
                    >
                      Add Directory
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {directories.map((directory, index) => (
                      <li key={directory.path} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                        <button
                          className={`nav-item group ${
                            selectedDirectory === directory.path
                              ? 'nav-item-active'
                              : 'nav-item-inactive'
                          }`}
                          onClick={() => setSelectedDirectory(directory.path)}
                        >
                          <FolderIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                          <span className="truncate flex-1 text-left">{directory.name}</span>
                          {selectedDirectory === directory.path && (
                            <SparklesIcon className="w-4 h-4 ml-2 animate-pulse" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Photo Directories */}
              <div className="animate-slide-up animation-delay-100">
                <div className="flex items-center justify-between mb-3 px-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Photo Libraries
                  </h2>
                  <button
                    onClick={handleAddPhotoDirectory}
                    className="btn btn-icon btn-ghost text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    aria-label="Add Photo Directory"
                  >
                    <FolderPlusIcon className="w-4 h-4" />
                  </button>
                </div>

                {photoDirs.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-dark-800 flex items-center justify-center">
                      <PhotoIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No photo dirs</p>
                    <button
                      onClick={handleAddPhotoDirectory}
                      className="btn btn-sm btn-accent"
                    >
                      Add Photos
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {photoDirs.map((directory, index) => (
                      <li key={directory.path} className="animate-slide-up" style={{ animationDelay: `${(directories.length + index) * 50}ms` }}>
                        <button
                          className={`nav-item group ${
                            selectedPhotoDir === directory.path && location.pathname === '/photos'
                              ? 'nav-item-active'
                              : 'nav-item-inactive'
                          }`}
                          onClick={() => {
                            setSelectedPhotoDir(directory.path);
                            navigate('/photos');
                          }}
                        >
                          <PhotoIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                          <span className="truncate flex-1 text-left">{directory.name}</span>
                          {selectedPhotoDir === directory.path && location.pathname === '/photos' && (
                            <SparklesIcon className="w-4 h-4 ml-2 animate-pulse" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            
            {/* Bottom Navigation */}
            <div className="p-4 border-t border-gray-200/50 dark:border-dark-700/50 space-y-1">
              <Link
                to="/scripts"
                className={`nav-item group ${
                  location.pathname === '/scripts'
                    ? 'nav-item-active'
                    : 'nav-item-inactive'
                }`}
              >
                <DocumentTextIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                <span>Scripts</span>
              </Link>

              <Link
                to="/photos"
                className={`nav-item group ${
                  location.pathname === '/photos'
                    ? 'nav-item-active'
                    : 'nav-item-inactive'
                }`}
              >
                <PhotoIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                <span>Photo Gallery</span>
              </Link>

              <Link
                to="/settings"
                className={`nav-item group ${
                  location.pathname === '/settings'
                    ? 'nav-item-active'
                    : 'nav-item-inactive'
                }`}
              >
                <Cog6ToothIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar; 