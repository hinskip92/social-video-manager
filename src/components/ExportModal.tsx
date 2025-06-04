import { useState } from 'react';
import { EXPORT_PRESETS, PresetKey } from '../constants/exportPresets';
import { useTranscode } from '../hooks/useTranscode';
import type { CropRect } from '../hooks/useTranscode';

/**
 * Modal for selecting a social-media export preset and monitoring progress.
 */
interface ExportModalProps {
  videoPath: string;
  onClose: () => void;
}

export default function ExportModal({ videoPath, onClose }: ExportModalProps) {
  const [preset, setPreset] = useState<PresetKey>('instagramReel');
  const { progress, completedPath, error, start, reset } = useTranscode();
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const beginExport = () => {
    reset();
    start(videoPath, preset, undefined, crop || undefined);
  };

  const analyzeCrop = async () => {
    setAnalyzing(true);
    try {
      const result = await window.electronAPI.analyzeCrop(videoPath);
      if (result) setCrop(result);
    } finally {
      setAnalyzing(false);
    }
  };

  const openFile = () => {
    if (completedPath) {
      window.electronAPI.shellOpen(completedPath);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-100">
          Export for Social Media
        </h2>

        {/* Preset selector */}
        <ul className="mb-4 space-y-2">
          {Object.entries(EXPORT_PRESETS).map(([key, cfg]) => (
            <li key={key} className="flex items-start gap-3">
              <input
                type="radio"
                checked={preset === key}
                onChange={() => setPreset(key as PresetKey)}
              />
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-100">
                  {cfg.label}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {cfg.description}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Progress / actions */}
        {progress ? (
          <>
            <div className="h-3 w-full overflow-hidden rounded bg-gray-200">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${progress.percent.toFixed(1)}%` }}
              />
            </div>
            <p className="mt-2 text-sm">
              {progress.percent.toFixed(1)}% • {progress.fps.toFixed(0)} fps • ETA{' '}
              {progress.eta}
            </p>
          </>
        ) : (
          <div className="space-y-2">
            <button
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              onClick={beginExport}
            >
              Start Export
            </button>
            <button
              className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
              onClick={analyzeCrop}
              disabled={analyzing}
            >
              {analyzing ? 'Analyzing...' : 'Smart Crop'}
            </button>
            {crop && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Crop {crop.w}×{crop.h}+{crop.x}+{crop.y} ({(crop.confidence * 100).toFixed(0)}%)
              </p>
            )}
          </div>
        )}

        {/* Completion buttons */}
        {completedPath && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={openFile}
              className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700"
            >
              Open File
            </button>
            <button
              onClick={() =>
                completedPath &&
                window.electronAPI.shellOpen(
                  completedPath.substring(0, completedPath.lastIndexOf(require('path').sep))
                )
              }
              className="rounded bg-gray-600 px-3 py-1.5 text-white hover:bg-gray-700"
            >
              Show in Folder
            </button>
            <button
              onClick={onClose}
              className="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
            >
              Close
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-500 dark:text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}
