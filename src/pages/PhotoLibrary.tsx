import { useEffect, useState } from 'react';
import { usePhotos } from '../contexts/PhotoContext';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface PhotoWithPreview {
  id: string;
  name: string;
  path: string;
  size?: number;
  createdAt: Date;
  modifiedAt: Date;
  directory: string;
  category?: string;
  tags?: string[];
  previewUrl?: string;
}

const PhotoLibrary = () => {
  const { photos, directories, selectedDirectory, refreshPhotos } = usePhotos();
  const [filteredPhotos, setFilteredPhotos] = useState<PhotoWithPreview[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy] = useState<'name' | 'date'>('date');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const categories = Array.from(new Set(photos.map(p => p.category).filter(Boolean)));

  useEffect(() => {
    // For images we just need to convert file path to preview URL
    const photosWithPreview = photos.map(p => {
      const sanitized = p.path.split('\\').join('/');
      const url = `file:///${sanitized}`;
      return { ...p, previewUrl: url };
    });
    filterAndSortPhotos(photosWithPreview);
  }, [photos, selectedDirectory, searchTerm, sortBy, sortOrder, categoryFilter]);

  const filterAndSortPhotos = (photosToFilter = photos as unknown as PhotoWithPreview[]) => {
    let result = [...photosToFilter];

    if (!searchTerm && selectedDirectory) {
      result = result.filter(p => p.directory === selectedDirectory);
    }

    if (categoryFilter !== 'all') {
      result = result.filter(p => p.category === categoryFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.tags && p.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }

    result = result.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      } else {
        return sortOrder === 'asc'
          ? new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime()
          : new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
      }
    });

    setFilteredPhotos(result);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await refreshPhotos();
    setIsLoading(false);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const pageTitle = searchTerm
    ? 'Search Results'
    : selectedDirectory
    ? directories.find(d => d.path === selectedDirectory)?.name || 'Photos'
    : 'All Photos';

  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">{pageTitle}</h2>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search photos..."
            className="w-64 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="px-2 py-2 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 bg-white rounded-md hover:text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:text-white"
            disabled={isLoading}
          >
            <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow dark:bg-gray-800">
          <p className="mb-4 text-lg text-gray-600 dark:text-gray-400">
            {directories.length === 0
              ? 'No photo directories added yet. Add a directory from the sidebar.'
              : searchTerm
              ? 'No photos match your search.'
              : selectedDirectory
              ? 'No photos found in this directory.'
              : 'No photos available.'}
          </p>
          {directories.length > 0 && !searchTerm && (
            <button
              onClick={handleRefresh}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Refresh Photos
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredPhotos.map(photo => (
            <div
              key={photo.id}
              className="block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.open(`file://${photo.path}`, '_blank')}
            >
              <div className="relative aspect-w-1 aspect-h-1 bg-gray-200 dark:bg-gray-700 overflow-hidden">
                {photo.previewUrl ? (
                  <img src={photo.previewUrl} alt={photo.name} className="object-cover w-full h-full" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4V5h12v10z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={photo.name}>{photo.name}</h3>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                  <span>{formatFileSize(photo.size)}</span>
                  <span>{formatDate(photo.modifiedAt)}</span>
                </div>
                {photo.category && (
                  <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">{photo.category}</div>
                )}
                {photo.tags && photo.tags.length > 0 && (
                  <div className="mt-1 space-x-1">
                    {photo.tags.map(tag => (
                      <span key={tag} className="inline-block px-1 py-0.5 bg-gray-200 dark:bg-gray-700 text-xs rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoLibrary; 