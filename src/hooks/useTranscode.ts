import { useCallback, useEffect, useState } from 'react';
import type { PresetKey } from '../constants/exportPresets';

export interface ProgressPayload {
  percent: number;
  fps: number;
  eta: string;
}

// Single crop rectangle
export interface SingleCropRect {
  w: number;
  h: number;
  x: number;
  y: number;
  confidence: number;
}

// Scene-based crop with timing
export interface SceneCrop {
  start_time: number;
  end_time: number;
  crop: SingleCropRect;
}

// Multi-scene crop analysis result
export interface MultiSceneCrop {
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
export interface SingleSceneCrop {
  type: 'single';
  w: number;
  h: number;
  x: number;
  y: number;
  confidence: number;
}

// Union type for all crop analysis results
export type CropRect = SingleCropRect | MultiSceneCrop | SingleSceneCrop;

export function useTranscode() {
  const [progress, setProgress] = useState<ProgressPayload | null>(null);
  const [completedPath, setCompletedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Listen for progress updates
  useEffect(() => {
    window.electronAPI.onExportProgress((p: ProgressPayload) => {
      setProgress(p);
    });
  }, []);

  const start = useCallback(
    (inputPath: string, preset: PresetKey, outputDir?: string, crop?: CropRect | null) => {
      // Reset state
      setProgress({ percent: 0, fps: 0, eta: '00:00:00' });
      setCompletedPath(null);
      setError(null);

      // Kick off export with optional crop
      window.electronAPI.exportStart(inputPath, preset, outputDir, crop || undefined);

      // Completion handlers
      window.electronAPI.onceExportCompleted(({ outputPath }: { outputPath: string }) => {
        setCompletedPath(outputPath);
      });
      window.electronAPI.onceExportError(({ message }: { message: string }) => {
        setError(message);
      });
    },
    []
  );

  const reset = () => {
    setProgress(null);
    setCompletedPath(null);
    setError(null);
  };

  return { progress, completedPath, error, start, reset };
}
