/// <reference types="vite/client" />

interface ElectronAPI {
  openDirectory: () => Promise<string[]>;
  readDirectory: (path: string) => Promise<FileDetails[]>;
  getVideoThumbnail: (videoPath: string) => Promise<string>;
  
  // New methods for Vertical Video Creator
  processVerticalVideo: (videoPath: string, outputFolder?: string) => Promise<{
    outputPaths: string[];
    metadata: any;
  }>;
  selectOutputFolder: () => Promise<string | null>;
  openFile: (filePath: string) => Promise<void>;
  getProcessingProgress: (jobId: string) => Promise<number>;
}

interface FileDetails {
  name: string;
  path: string;
  size?: number;
  createdAt: string;
  modifiedAt: string;
  isDirectory?: boolean;
}

interface Window {
  electronAPI: ElectronAPI;
}
