/// <reference types="vite/client" />

// Single crop rectangle
interface SingleCropRect {
  w: number;
  h: number;
  x: number;
  y: number;
  confidence: number;
}

// Scene-based crop with timing
interface SceneCrop {
  start_time: number;
  end_time: number;
  crop: SingleCropRect;
}

// Multi-scene crop analysis result
interface MultiSceneCrop {
  type: 'multi';
  scenes: SceneCrop[];
  overall_confidence: number;
  source: {
    width: number;
    height: number;
    duration: number;
    scene_count: number;
  };
}

// Single scene crop analysis result
interface SingleSceneCrop {
  type: 'single';
  w: number;
  h: number;
  x: number;
  y: number;
  confidence: number;
}

// Union type for all crop analysis results
type CropRect = SingleCropRect | MultiSceneCrop | SingleSceneCrop;

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
