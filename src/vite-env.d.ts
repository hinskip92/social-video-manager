/// <reference types="vite/client" />

interface ElectronAPI {
  /* Existing */
  openDirectory: () => Promise<string[]>;
  readDirectory: (path: string) => Promise<FileDetails[]>;
  getVideoThumbnail: (videoPath: string) => Promise<string>;
  editVideo: (inputPath: string, options: EditOptions) => Promise<string>;

  /* Export / transcode */
  exportStart: (
    inputPath: string,
    preset: 'instagramReel' | 'tiktok' | 'twitter',
    outputDir?: string
  onExportProgress: (cb: (data: ExportProgress) => void) => void;
  onceExportCompleted: (cb: (data: { outputPath: string }) => void) => void;
  onceExportError: (cb: (data: { message: string }) => void) => void;

  /* Shell helper */
  shellOpen: (filePath: string) => void;
  analyzeCrop: (    videoPath: string
 =mise<
    
  

interface ExportProgress {
  percent: number;
  fps: number;
  eta: string;
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
}
