import { useState, useEffect } from 'react';
import { useDirectories } from '../contexts/DirectoryContext';
import { ArrowPathIcon, PlayIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface VerticalVideoJob {
  id: string;
  sourceVideoPath: string;
  sourceVideoName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputPaths?: string[];
  error?: string;
  startTime?: Date;
  endTime?: Date;
  metadata?: any;
}

const VerticalVideoCreator = () => {
  const { videos, selectedDirectory } = useDirectories();
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [jobs, setJobs] = useState<VerticalVideoJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputFolder, setOutputFolder] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [apiKeyMode, setApiKeyMode] = useState<'provided' | 'missing' | 'checking'>('checking');

  // Load jobs from local storage on component mount
  useEffect(() => {
    const savedJobs = localStorage.getItem('verticalVideoJobs');
    if (savedJobs) {
      try {
        setJobs(JSON.parse(savedJobs));
      } catch (error) {
        console.error('Error parsing saved jobs:', error);
      }
    }
  }, []);

  // Save jobs to local storage when they change
  useEffect(() => {
    localStorage.setItem('verticalVideoJobs', JSON.stringify(jobs));
  }, [jobs]);
  
  // We'll just assume demo mode for now in the UI
  // The actual check will be done in the main process
  useEffect(() => {
    // Default to showing info about the .env file requirement
    // The backend will handle the actual check when processing
    setApiKeyMode('missing');
  }, []);

  // Function to check if a video is already in the jobs list
  const isVideoInJobs = (videoPath: string) => {
    return jobs.some(job => job.sourceVideoPath === videoPath);
  };

  // Function to handle starting a new video processing job
  const handleProcessVideo = async () => {
    if (!selectedVideo) return;
    
    // Reset any previous error
    setErrorDetails(null);
    
    // Generate a unique ID for the job
    const jobId = `job_${Date.now()}`;
    const videoObj = videos.find(v => v.path === selectedVideo);
    
    if (!videoObj) return;
    
    // Create a new job
    const newJob: VerticalVideoJob = {
      id: jobId,
      sourceVideoPath: videoObj.path,
      sourceVideoName: videoObj.name,
      status: 'pending',
      progress: 0,
      startTime: new Date()
    };
    
    // Add the job to the list
    setJobs(prevJobs => [...prevJobs, newJob]);
    
    // Set processing state
    setIsProcessing(true);
    
    try {
      // Call the Electron API to start processing
      const result = await window.electronAPI.processVerticalVideo(videoObj.path, outputFolder || undefined);
      
      // Update the job with the result
      setJobs(prevJobs => prevJobs.map(job => {
        if (job.id === jobId) {
          return {
            ...job,
            status: 'completed',
            progress: 100,
            endTime: new Date(),
            outputPaths: result.outputPaths,
            metadata: result.metadata
          };
        }
        return job;
      }));
    } catch (error) {
      console.error('Error processing video:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if this is a dependency-related error
      const isDependencyError = errorMessage.includes('No module named') || 
                               errorMessage.includes('Failed to install Python dependencies');
      
      if (isDependencyError) {
        setErrorDetails(errorMessage);
      }
      
      // Update the job with the error
      setJobs(prevJobs => prevJobs.map(job => {
        if (job.id === jobId) {
          return {
            ...job,
            status: 'failed',
            error: errorMessage,
            endTime: new Date()
          };
        }
        return job;
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to select an output folder
  const handleSelectOutputFolder = async () => {
    try {
      const result = await window.electronAPI.selectOutputFolder();
      if (result) {
        setOutputFolder(result);
      }
    } catch (error) {
      console.error('Error selecting output folder:', error);
    }
  };

  // Function to handle viewing a completed video
  const handleViewVideo = (path: string) => {
    if (path) {
      window.electronAPI.openFile(path);
    }
  };

  // Function to remove a job from the list
  const handleRemoveJob = (jobId: string) => {
    setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
  };

  // Function to format duration in minutes and seconds
  const formatDuration = (start?: Date, end?: Date) => {
    if (!start || !end) return '--';
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="py-6">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
        Vertical Video Creator
      </h2>
      
      <div className="mb-6 p-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg">
        <div className="flex">
          <InformationCircleIcon className="w-5 h-5 text-blue-500 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
              Create Vertical Social Media Videos from Longer Content
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-200">
              This tool uses AI to analyze your videos, find the most engaging parts, and convert them into vertical (9:16) format for social media.
              {apiKeyMode === 'missing' && (
                <span className="block mt-1">
                  <strong>Running in demo mode:</strong> Without an OpenAI API key, the tool will create generic clips without AI analysis.
                </span>
              )}
            </p>
            {apiKeyMode === 'missing' && (
              <div className="mt-2 text-xs text-blue-700 dark:text-blue-200">
                <p>To use full AI capabilities, create a <code>.env</code> file in the app's directory with:</p>
                <code className="block bg-blue-100 dark:bg-blue-900/40 p-1 mt-1 rounded">
                  OPENAI_API_KEY=your_api_key_here
                </code>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {errorDetails && (
        <div className="mb-6 p-4 border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Python Dependency Error</h3>
              <div className="text-sm text-yellow-700 dark:text-yellow-200 mb-3">
                There was an issue with the required Python dependencies. This feature requires Python and the following packages:
                <ul className="list-disc ml-5 mt-1">
                  <li>moviepy (for video processing)</li>
                  <li>openai (for AI analysis)</li>
                  <li>python-dotenv (for loading environment variables)</li>
                  <li>numpy (for array operations)</li>
                  <li>pillow (for image processing)</li>
                </ul>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/40 p-3 rounded text-sm font-mono text-yellow-800 dark:text-yellow-200 whitespace-pre-wrap overflow-auto max-h-48">
                {errorDetails}
              </div>
              <div className="mt-3 text-sm text-yellow-700 dark:text-yellow-200">
                <p>You can install these dependencies manually by opening Command Prompt or Terminal and running:</p>
                <code className="block bg-yellow-100 dark:bg-yellow-900/40 p-2 mt-1 rounded">
                  pip install --user moviepy openai python-dotenv numpy pillow
                </code>
                <p className="mt-2">After installing the dependencies, restart the application and try again.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left panel: Video selection */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            Select Source Video
          </h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select a video to process
            </label>
            <select
              className="w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
              value={selectedVideo || ''}
              onChange={(e) => setSelectedVideo(e.target.value)}
              disabled={isProcessing}
            >
              <option value="">-- Select a video --</option>
              {videos
                .filter(video => !isVideoInJobs(video.path))
                .map(video => (
                  <option key={video.id} value={video.path}>
                    {video.name}
                  </option>
                ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Output Folder (Optional)
            </label>
            <div className="flex items-center">
              <input
                type="text"
                className="flex-1 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-l-md dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                value={outputFolder || ''}
                readOnly
                placeholder="Default: [video folder]/Viral_Clips"
              />
              <button
                className="px-3 py-2 text-sm text-white bg-blue-600 rounded-r-md hover:bg-blue-700 focus:outline-none"
                onClick={handleSelectOutputFolder}
                disabled={isProcessing}
              >
                Browse
              </button>
            </div>
          </div>
          
          <button
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={handleProcessVideo}
            disabled={!selectedVideo || isProcessing}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </span>
            ) : (
              'Process Video'
            )}
          </button>
          
          {apiKeyMode === 'missing' && (
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              <p>Note: Running in demo mode without AI analysis.</p>
              <p>For full features, set up an OpenAI API key.</p>
            </div>
          )}
        </div>
        
        {/* Right panel: Job status and results */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow md:col-span-2">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
            Processing Jobs
          </h3>
          
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No processing jobs yet. Select a video to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map(job => (
                <div 
                  key={job.id} 
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">
                      {job.sourceVideoName}
                    </h4>
                    <div className="flex space-x-2">
                      {job.status === 'completed' && job.outputPaths && job.outputPaths.length > 0 && (
                        <button
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          onClick={() => job.outputPaths && handleViewVideo(job.outputPaths[0])}
                          title="View first output video"
                        >
                          <PlayIcon className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        onClick={() => handleRemoveJob(job.id)}
                        title="Remove job"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <span>Status: {job.status}</span>
                      <span>Duration: {formatDuration(job.startTime, job.endTime)}</span>
                    </div>
                    
                    {job.status === 'processing' && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                  
                  {job.status === 'completed' && job.outputPaths && job.outputPaths.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Output Files:
                      </h5>
                      <ul className="text-sm text-gray-600 dark:text-gray-400">
                        {job.outputPaths.map((path, index) => (
                          <li key={index} className="truncate">
                            <button
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              onClick={() => handleViewVideo(path)}
                            >
                              {path.split(/[\\/]/).pop()}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {job.status === 'failed' && job.error && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      Error: {job.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerticalVideoCreator; 