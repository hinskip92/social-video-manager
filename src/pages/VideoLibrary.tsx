import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDirectories } from '../contexts/DirectoryContext';
import { ArrowPathIcon, PlayIcon, FilmIcon, MagnifyingGlassIcon, FunnelIcon, ClockIcon, TagIcon } from '@heroicons/react/24/outline';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/solid';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

    // Filter by directory *only* when no search term is provided
    if (!searchTerm && selectedDirectory) {
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

  // Determine page title based on context
  const pageTitle = searchTerm
    ? 'Search Results'
    : selectedDirectory
    ? directories.find(d => d.path === selectedDirectory)?.name || 'Videos'
    : 'All Videos';

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-soft border border-gray-100 dark:border-dark-700 p-6 animate-slide-down">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
              {pageTitle}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'} found
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search videos..."
                className="input input-search w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Category Filter */}
            <div className="relative">
              <select
                className="input pr-8 appearance-none cursor-pointer"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <FunnelIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-dark-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-dark-600 text-gray-900 dark:text-white shadow-soft' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-dark-600 text-gray-900 dark:text-white shadow-soft' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                List
              </button>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="btn btn-icon btn-secondary"
              disabled={isLoading}
            >
              <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      {filteredVideos.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 animate-scale-in">
          <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-700 dark:to-dark-600 flex items-center justify-center">
            <FilmIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {directories.length === 0
              ? 'Welcome to Video Manager'
              : searchTerm
              ? 'No matches found'
              : selectedDirectory
              ? 'No videos in this directory'
              : 'No videos available'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
            {directories.length === 0
              ? 'Get started by adding a directory from the sidebar. Your videos will appear here.'
              : searchTerm
              ? 'Try adjusting your search terms or filters.'
              : selectedDirectory
              ? 'This directory doesn\'t contain any videos yet.'
              : 'Select a directory from the sidebar to view videos.'}
          </p>
          {directories.length > 0 && !searchTerm && (
            <button
              onClick={handleRefresh}
              className="btn btn-primary"
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Refresh Videos
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {filteredVideos.map((video, index) => (
            <Link 
              key={video.id}
              to={`/video/${video.id}`}
              className="group card card-hover p-0 overflow-hidden animate-slide-up"
              style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
              onClick={() => setSelectedVideo(video)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-700 dark:to-dark-600 overflow-hidden">
                {video.thumbnail ? (
                  <img 
                    src={video.thumbnail} 
                    alt={video.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FilmIcon className="w-16 h-16 text-gray-400 dark:text-gray-600" />
                  </div>
                )}
                
                {/* Overlay */}
                <div className="video-overlay flex items-center justify-center">
                  <div className="p-3 rounded-full bg-white/90 dark:bg-dark-900/90 shadow-lg transform group-hover:scale-110 transition-transform">
                    <PlayIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
                
                {/* Duration badge */}
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs font-medium rounded">
                  {formatFileSize(video.size)}
                </div>
              </div>
              
              {/* Content */}
              <div className="p-4">
                <h3 className="font-medium text-gray-900 dark:text-white truncate mb-2" title={video.name}>
                  {video.name}
                </h3>
                
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <span>{formatDate(video.modifiedAt)}</span>
                  </div>
                  {video.category && (
                    <span className="badge badge-primary">
                      {video.category}
                    </span>
                  )}
                </div>
                
                {video.tags && video.tags.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    <TagIcon className="w-3.5 h-3.5 text-gray-400" />
                    {video.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="badge badge-accent text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {video.tags.length > 3 && (
                      <span className="text-xs text-gray-400">+{video.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVideos.map((video, index) => (
            <Link
              key={video.id}
              to={`/video/${video.id}`}
              className="group card card-hover p-4 flex items-center gap-4 animate-slide-up"
              style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
              onClick={() => setSelectedVideo(video)}
            >
              {/* Thumbnail */}
              <div className="relative w-32 aspect-video rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-700 dark:to-dark-600 overflow-hidden flex-shrink-0">
                {video.thumbnail ? (
                  <img 
                    src={video.thumbnail} 
                    alt={video.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FilmIcon className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-2 rounded-full bg-white/90 dark:bg-dark-900/90 shadow-lg">
                    <PlayIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-white truncate mb-1">
                  {video.name}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>{formatFileSize(video.size)}</span>
                  <span>•</span>
                  <span>{formatDate(video.modifiedAt)}</span>
                  {video.category && (
                    <>
                      <span>•</span>
                      <span className="badge badge-primary">{video.category}</span>
                    </>
                  )}
                </div>
                {video.tags && video.tags.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5">
                    {video.tags.map(tag => (
                      <span key={tag} className="badge badge-accent text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Trending indicator */}
              <div className="flex-shrink-0">
                <ArrowTrendingUpIcon className="w-5 h-5 text-accent-500" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoLibrary;
