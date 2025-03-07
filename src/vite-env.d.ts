/// <reference types="vite/client" />

interface ElectronAPI {
  openDirectory: () => Promise<string[]>;
  readDirectory: (path: string) => Promise<FileDetails[]>;
  getVideoThumbnail: (videoPath: string) => Promise<string>;
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
