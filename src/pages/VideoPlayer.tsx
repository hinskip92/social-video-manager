import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { useDirectories } from '../contexts/DirectoryContext';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const VideoPlayer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getVideoById, setSelectedVideo, updateVideoMetadata } = useDirectories();
  const [video, setVideo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const playerRef = useRef<ReactPlayer>(null);
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (id) {
      const foundVideo = getVideoById(id);
      if (foundVideo) {
        setVideo(foundVideo);
        setSelectedVideo(foundVideo);
        setCategory(foundVideo.category || '');
        setTagsInput(foundVideo.tags ? foundVideo.tags.join(', ') : '');
        setIsLoading(false);
      } else {
        setError(`Video not found with ID: ${id}`);
        setIsLoading(false);
      }
    }
  }, [id, getVideoById, setSelectedVideo]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-xl text-red-600 mb-4">{error || 'Video not found'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Back to Library
        </button>
      </div>
    );
  }

  // Format the file path for video playback
  // Use an absolute URL with proper protocol
  const videoUrl = `file:///${video.path.replace(/\/g, '/')}`;
  
  const handlePlayerError = (error: any) => {
    console.error('ReactPlayer error:', error);
    setPlayerError(`Error playing video: ${error?.message || 'Unknown error'}`);
  };

  return (
    <div className="py-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-1" />
          Back to Library
        </button>
      </div>

      <div className="bg-white rounded-lg shadow dark:bg-gray-800 overflow-hidden">
        {playerError ? (
          <div className="p-6 text-center text-red-500">
            <p>{playerError}</p>
            <p className="mt-2 text-sm">
              This application may need additional permissions to play local videos. Try opening the file in your default video player instead.
            </p>
            <button 
              onClick={() => setPlayerError(null)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="aspect-w-16">
            <ReactPlayer
              ref={playerRef}
              url={videoUrl}
              controls
              width="100%"
              height="100%"
              style={{ backgroundColor: '#000' }}
              config={{
                file: {
                  attributes: {
                    controlsList: 'nodownload',
                  },
                  forceVideo: true,
                },
              }}
              onError={handlePlayerError}
            />
          </div>
        )}

        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            {video.name}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  File Path:
                </span>
                <p className="text-gray-700 dark:text-gray-300 break-all">
                  {video.path}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  File Size:
                </span>
                <p className="text-gray-700 dark:text-gray-300">
                  {formatFileSize(video.size)}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Created:
                </span>
                <p className="text-gray-700 dark:text-gray-300">
                  {formatDate(video.createdAt)}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Modified:
                </span>
                <p className="text-gray-700 dark:text-gray-300">
                  {formatDate(video.modifiedAt)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Add a direct link to open the video in the system's default player */}
          <div className="mt-6">
            <button
              onClick={() => {
                // Try to open the file with the system's default video player
                // This is a fallback if in-app playback doesn't work
                window.open(`file://${video.path}`, '_blank');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Open in Default Player
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <input
                type="text"
                className="mt-1 p-2 w-full border rounded-md dark:bg-gray-700 dark:text-gray-300"
                value={category}
                onChange={e => setCategory(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags (comma separated)</label>
              <input
                type="text"
                className="mt-1 p-2 w-full border rounded-md dark:bg-gray-700 dark:text-gray-300"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
              />
            </div>
            <button
              onClick={() => {
                const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
                updateVideoMetadata(video.id, { category, tags });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Metadata
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer; 