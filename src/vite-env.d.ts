/// <reference types="vite/client" />

interface CropRect {
  w: number;
  h: number;
  x: number;
  y: number;
  confidence: number;
}

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
    outputDir?: string,
    crop?: CropRect
  ) => void;
  onExportProgress: (cb: (data: ExportProgress) => void) => void;
  onceExportCompleted: (cb: (data: { outputPath: string }) => void) => void;
  onceExportError: (cb: (data: { message: string }) => void) => void;

  /* Shell helper */
  shellOpen: (filePath: string) => void;

  analyzeCrop: (videoPath: string) => Promise<CropRect | null>;
}

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
