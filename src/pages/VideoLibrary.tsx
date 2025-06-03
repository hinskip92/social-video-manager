import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDirectories } from '../contexts/DirectoryContext';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface VideoWithThumbnail {
  id: string;
  name: string;
  path: string;
  size?: number;
  createdAt: Date;
  modifiedAt: Date;
  directory: string;
  thumbnail?: string;
  category?: string;
  tags?: string[];
}

const VideoLibrary = () => {
  const { videos, directories, selectedDirectory, refreshVideos, setSelectedVideo } = useDirectories();
  const [filteredVideos, setFilteredVideos] = useState<VideoWithThumbnail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy] = useState<'name' | 'date'>('date');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnailsEnabled, setThumbnailsEnabled] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const categories = Array.from(new Set(videos.map(v => v.category).filter(Boolean)));

  // Load thumbnails for videos
  useEffect(() => {
    const loadThumbnails = async () => {
      if (videos.length === 0) return;
      
      try {
        // Test if thumbnails are available by trying with the first video
        if (videos.length > 0 && thumbnailsEnabled) {
          try {
            await window.electronAPI.getVideoThumbnail(videos[0].path);
          } catch (error) {
            console.warn('Thumbnail generation not available:', error);
            setThumbnailsEnabled(false);
          }
        }
        
        // If thumbnails are enabled, try to fetch them
        if (thumbnailsEnabled) {
          const videosWithThumbnails = await Promise.all(
            videos.map(async (video) => {
              try {
                const thumbnail = await window.electronAPI.getVideoThumbnail(video.path);
                return { ...video, thumbnail };
              } catch (error) {
                console.error(`Error loading thumbnail for ${video.name}:`, error);
                return { ...video, thumbnail: undefined };
              }
            })
          );
          filterAndSortVideos(videosWithThumbnails);
        } else {
          // Just convert videos to the right format without thumbnails
          const videosWithoutThumbnails = videos.map(video => ({ ...video, thumbnail: undefined }));
          filterAndSortVideos(videosWithoutThumbnails);
        }
      } catch (error) {
        console.error('Error in loadThumbnails:', error);
        // Fall back to no thumbnails
        const videosWithoutThumbnails = videos.map(video => ({ ...video, thumbnail: undefined }));
        filterAndSortVideos(videosWithoutThumbnails);
      }
    };
    
    loadThumbnails();
  }, [videos, thumbnailsEnabled]);

  // Filter videos based on selected directory and search term
  const filterAndSortVideos = (videosToFilter = videos) => {
    let result = [...videosToFilter];

    // Filter by directory if one is selected
    if (selectedDirectory) {
      result = result.filter(video => video.directory === selectedDirectory);
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      result = result.filter(video => video.category === categoryFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(video =>
        video.name.toLowerCase().includes(term) ||
        (video.tags && video.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }
    
    // Sort videos
    result = result.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        return sortOrder === 'asc'
          ? new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime()
          : new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
      }
    });
    
    setFilteredVideos(result);
  };

  // Update filtered videos when filters or sort options change
  useEffect(() => {
    if (videos.length > 0) {
      const updatedVideos = videos.map(video => ({ ...video, thumbnail: undefined }));
      filterAndSortVideos(updatedVideos);
    }
  }, [selectedDirectory, searchTerm, sortBy, sortOrder, categoryFilter]);

  const handleRefresh = async () => {
    setIsLoading(true);
    await refreshVideos();
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

return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
          {selectedDirectory 
            ? directories.find(d => d.path === selectedDirectory)?.name || 'Videos'
            : 'All Videos'}
        </h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search videos..."
              className="w-64 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              className="px-2 py-2 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 bg-white rounded-md hover:text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:text-white"
            disabled={isLoading}
          >
            <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {filteredVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow dark:bg-gray-800">
          <p className="mb-4 text-lg text-gray-600 dark:text-gray-400">
            {directories.length === 0
              ? 'No directories added yet. Add a directory from the sidebar.'
              : searchTerm
              ? 'No videos match your search.'
              : 'No videos found in this directory.'}
          </p>
          {directories.length > 0 && !searchTerm && (
            <button
              onClick={handleRefresh}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Refresh Videos
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredVideos.map((video) => (
            <Link 
              key={video.id}
              to={`/video/${video.id}`}
              className="block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="relative aspect-w-16 aspect-h-9 bg-gray-200 dark:bg-gray-700">
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={video.name}>
                  {video.name}
                </h3>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                  <span>{formatFileSize(video.size)}</span>
                  <span>{formatDate(video.modifiedAt)}</span>
                </div>
                {video.category && (
                  <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    {video.category}
                  </div>
                )}
                {video.tags && video.tags.length > 0 && (
                  <div className="mt-1 space-x-1">
                    {video.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-block px-1 py-0.5 bg-gray-200 dark:bg-gray-700 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
export default VideoLibrary;
