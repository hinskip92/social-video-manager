import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDirectories } from '../contexts/DirectoryContext';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const VideoEditor = () => {
  const { id } = useParams<{ id: string }>();
  const { getVideoById } = useDirectories();
  const navigate = useNavigate();
  const video = id ? getVideoById(id) : undefined;

  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [cropWidth, setCropWidth] = useState('');
  const [cropHeight, setCropHeight] = useState('');
  const [cropX, setCropX] = useState('');
  const [cropY, setCropY] = useState('');
  const [status, setStatus] = useState('');

  if (!video) {
    return (
      <div className="p-6">
        <p className="text-red-600 mb-4">Video not found</p>
        <button onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Back to Library
        </button>
      </div>
    );
  }

  const handleEdit = async () => {
    setStatus('Processing...');
    try {
      const options: EditOptions = {};
      if (startTime) options.startTime = parseFloat(startTime);
      if (duration) options.duration = parseFloat(duration);
      if (cropWidth && cropHeight) {
        options.crop = {
          width: parseInt(cropWidth, 10),
          height: parseInt(cropHeight, 10),
          x: parseInt(cropX || '0', 10),
          y: parseInt(cropY || '0', 10),
        };
      }

      const output = await window.electronAPI.editVideo(video.path, options);
      setStatus(`Saved to ${output}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`Error: ${msg}`);
    }
  };

  return (
    <div className="py-6 space-y-6">
      <div>
        <button onClick={() => navigate(`/video/${video.id}`)}
          className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeftIcon className="w-5 h-5 mr-1" />
          Back to Video
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        Edit {video.name}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time (sec)</label>
          <input type="number" className="mt-1 p-2 w-full border rounded-md dark:bg-gray-700 dark:text-gray-300"
            value={startTime} onChange={e => setStartTime(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duration (sec)</label>
          <input type="number" className="mt-1 p-2 w-full border rounded-md dark:bg-gray-700 dark:text-gray-300"
            value={duration} onChange={e => setDuration(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Crop Width</label>
          <input type="number" className="mt-1 p-2 w-full border rounded-md dark:bg-gray-700 dark:text-gray-300"
            value={cropWidth} onChange={e => setCropWidth(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Crop Height</label>
          <input type="number" className="mt-1 p-2 w-full border rounded-md dark:bg-gray-700 dark:text-gray-300"
            value={cropHeight} onChange={e => setCropHeight(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Crop X</label>
          <input type="number" className="mt-1 p-2 w-full border rounded-md dark:bg-gray-700 dark:text-gray-300"
            value={cropX} onChange={e => setCropX(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Crop Y</label>
          <input type="number" className="mt-1 p-2 w-full border rounded-md dark:bg-gray-700 dark:text-gray-300"
            value={cropY} onChange={e => setCropY(e.target.value)} />
        </div>
      </div>

      <button onClick={handleEdit}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Save Edited Video
      </button>

      {status && (
        <p className="text-sm text-gray-600 dark:text-gray-300">{status}</p>
      )}
    </div>
  );
};

export default VideoEditor;
