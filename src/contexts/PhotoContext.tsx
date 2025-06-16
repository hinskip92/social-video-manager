import { createContext, useState, useContext, ReactNode } from 'react';
import { createSafeId } from './DirectoryContext';

interface Photo {
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

interface Directory {
  path: string;
  name: string;
}

interface PhotoContextType {
  directories: Directory[];
  photos: Photo[];
  selectedDirectory: string | null;
  selectedPhoto: Photo | null;
  addDirectory: (path: string) => void;
  removeDirectory: (path: string) => void;
  setSelectedDirectory: (path: string | null) => void;
  setSelectedPhoto: (photo: Photo | null) => void;
  refreshPhotos: () => Promise<void>;
  getPhotoById: (id: string) => Photo | undefined;
  updatePhotoMetadata: (id: string, metadata: { category?: string; tags?: string[] }) => void;
}

const PhotoContext = createContext<PhotoContextType | undefined>(undefined);

export function PhotoProvider({ children }: { children: ReactNode }) {
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const META_KEY = 'photoMetadata';

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
    const dirName = path.split(/[/\\]/).pop() || path;
    if (directories.some((d) => d.path === path)) return;

    const newDir: Directory = { path, name: dirName };
    setDirectories((prev) => [...prev, newDir]);
    if (directories.length === 0) setSelectedDirectory(path);
    await loadPhotosFromDirectory(path);
  }

  function removeDirectory(path: string) {
    setDirectories((prev) => prev.filter((d) => d.path !== path));
    setPhotos((prev) => prev.filter((p) => p.directory !== path));
    if (selectedDirectory === path) {
      const first = directories.find((d) => d.path !== path);
      setSelectedDirectory(first?.path || null);
    }
  }

  function getPhotoById(id: string) {
    return photos.find((p) => p.id === id);
  }

  async function loadPhotosFromDirectory(dirPath: string) {
    try {
      const files = await window.electronAPI.readImageDirectory(dirPath);
      const newPhotos = files
        .filter((file) => !file.isDirectory)
        .map((file) => {
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
          } as Photo;
        });

      setPhotos((prev) => {
        const existing = new Set(prev.map((p) => p.path));
        const unique = newPhotos.filter((p) => !existing.has(p.path));
        return [...prev, ...unique];
      });
    } catch (err) {
      console.error('Error loading photos:', err);
    }
  }

  async function refreshPhotos() {
    setPhotos([]);
    for (const dir of directories) {
      await loadPhotosFromDirectory(dir.path);
    }
  }

  function updatePhotoMetadata(id: string, metadata: { category?: string; tags?: string[] }) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...metadata } : p)));
    saveMetadata(id, metadata);
  }

  return (
    <PhotoContext.Provider
      value={{
        directories,
        photos,
        selectedDirectory,
        selectedPhoto,
        addDirectory,
        removeDirectory,
        setSelectedDirectory,
        setSelectedPhoto,
        refreshPhotos,
        getPhotoById,
        updatePhotoMetadata,
      }}
    >
      {children}
    </PhotoContext.Provider>
  );
}

export function usePhotos() {
  const ctx = useContext(PhotoContext);
  if (!ctx) throw new Error('usePhotos must be used within PhotoProvider');
  return ctx;
} 