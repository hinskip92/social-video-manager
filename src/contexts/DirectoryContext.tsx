import { createContext, useState, useContext, ReactNode } from 'react';

interface Directory {
  path: string;
  name: string;
}

interface Video {
  id: string;
  name: string;
  path: string;
  size?: number;
  createdAt: Date;
  modifiedAt: Date;
  directory: string;
  category?: string;
  tags?: string[];
}

interface DirectoryContextType {
  directories: Directory[];
  videos: Video[];
  selectedDirectory: string | null;
  selectedVideo: Video | null;
  addDirectory: (path: string) => void;
  removeDirectory: (path: string) => void;
  setSelectedDirectory: (path: string | null) => void;
  setSelectedVideo: (video: Video | null) => void;
  refreshVideos: () => Promise<void>;
  getVideoById: (id: string) => Video | undefined;
  updateVideoMetadata: (
    id: string,
    metadata: { category?: string; tags?: string[] }
  ) => void;
}

const DirectoryContext = createContext<DirectoryContextType | undefined>(undefined);

// Helper function to create safe IDs
export function createSafeId(path: string, name: string): string {
  // Use a hash of the file path to create a unique, safe ID
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16); // Convert to a hexadecimal string
  };
  
  return hashCode(`${path}_${name}`);
}

export function DirectoryProvider({ children }: { children: ReactNode }) {
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const META_KEY = 'videoMetadata';

  function loadMetadata(id: string) {
    try {
      const raw = localStorage.getItem(META_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      return data[id] || {};
    } catch {
      return {};
    }
  }

  function saveMetadata(id: string, metadata: { category?: string; tags?: string[] }) {
    try {
      const raw = localStorage.getItem(META_KEY);
      const data = raw ? JSON.parse(raw) : {};
      data[id] = { ...(data[id] || {}), ...metadata };
      localStorage.setItem(META_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  async function addDirectory(path: string) {
    // Extract directory name from path
    const dirName = path.split(/[/\\]/).pop() || path;
    
    // Check if directory already exists
    if (directories.some(dir => dir.path === path)) {
      return;
    }
    
    const newDirectory: Directory = {
      path,
      name: dirName,
    };

    // Use functional update to avoid relying on stale state
    setDirectories((prev) => [...prev, newDirectory]);
    
    // If this is the first directory, set it as selected
    if (directories.length === 0) {
      setSelectedDirectory(path);
    }
    
    // Load videos from this directory
    await loadVideosFromDirectory(path);
  }

  function getVideoById(id: string): Video | undefined {
    return videos.find(video => video.id === id);
  }

  function removeDirectory(path: string) {
    setDirectories(directories.filter(dir => dir.path !== path));
    setVideos(videos.filter(video => video.directory !== path));
    
    // If the selected directory is being removed, select the first available or null
    if (selectedDirectory === path) {
      const firstDir = directories.find(dir => dir.path !== path);
      setSelectedDirectory(firstDir?.path || null);
    }
  }

  async function loadVideosFromDirectory(dirPath: string) {
    try {
      // Call electron API to read directory
      const files = await window.electronAPI.readDirectory(dirPath);
      
      // Convert to our video format
      const newVideos = files
        .filter(file => !file.isDirectory)
        .map(file => {
          const id = createSafeId(dirPath, file.name);
          const meta = loadMetadata(id);
          return {
            id,
            name: file.name,
            path: file.path,
            size: file.size,
            createdAt: new Date(file.createdAt),
            modifiedAt: new Date(file.modifiedAt),
            directory: dirPath,
            category: meta.category,
            tags: meta.tags || [],
          } as Video;
        });
      
      // Merge with existing videos, removing duplicates
      setVideos(prev => {
        const existing = new Set(prev.map(v => v.path));
        const uniqueNewVideos = newVideos.filter(v => !existing.has(v.path));
        return [...prev, ...uniqueNewVideos];
      });
    } catch (error) {
      console.error('Error loading videos:', error);
    }
  }

  async function refreshVideos() {
    // Clear current videos
    setVideos([]);
    
    // Reload videos from all directories
    for (const dir of directories) {
      await loadVideosFromDirectory(dir.path);
    }
  }

  function updateVideoMetadata(
    id: string,
    metadata: { category?: string; tags?: string[] }
  ) {
    setVideos(prev =>
      prev.map(video =>
        video.id === id ? { ...video, ...metadata } : video
      )
    );
    saveMetadata(id, metadata);
  }

  return (
    <DirectoryContext.Provider
      value={{
        directories,
        videos,
        selectedDirectory,
        selectedVideo,
        addDirectory,
        removeDirectory,
        setSelectedDirectory,
        setSelectedVideo,
        refreshVideos,
        getVideoById,
        updateVideoMetadata,
      }}
    >
      {children}
    </DirectoryContext.Provider>
  );
}

export function useDirectories() {
  const context = useContext(DirectoryContext);
  if (context === undefined) {
    throw new Error('useDirectories must be used within a DirectoryProvider');
  }
  return context;
} 