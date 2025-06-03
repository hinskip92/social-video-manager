/// <reference types="vite/client" />

interface ElectronAPI {
  openDirectory: () => Promise<string[]>;
  readDirectory: (path: string) => Promise<FileDetails[]>;
  getVideoThumbnail: (videoPath: string) => Promise<string>;
  editVideo: (inputPath: string, options: EditOptions) => Promise<string>;
}

interface EditOptions {
  startTime?: number;
  duration?: number;
  crop?: { width: number; height: number; x: number; y: number };
}

interface FileDetails {
  name: string;
  path: string;
  size?: number;
  createdAt: Date;
  modifiedAt: Date;
  isDirectory: boolean;
}

interface Window {
  electronAPI: ElectronAPI;
}
