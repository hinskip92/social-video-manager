const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const url = require('url');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { exec, spawn } = require('child_process');
const os = require('os');

// Set the ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Keep track of generated thumbnails
const thumbnailCache = new Map();
const thumbnailDir = path.join(app.getPath('userData'), 'thumbnails');

// Create thumbnail directory if it doesn't exist
if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir, { recursive: true });
}

// Keep a global reference of the window object to prevent it from being garbage collected
let mainWindow;

// Setup IPC handlers - this needs to happen before creating window
function setupIpcHandlers() {
  // Handle opening a directory dialog
  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (canceled) {
      return [];
    }
    return filePaths;
  });

  // Handle reading directory contents
  ipcMain.handle('fs:readDirectory', async (_, directoryPath) => {
    try {
      const files = await readdir(directoryPath);
      const fileDetails = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(directoryPath, file);
          const fileStat = await stat(filePath);
          
          // Only include video files (.mp4, .mov, etc)
          const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
          const ext = path.extname(file).toLowerCase();
          
          if (fileStat.isFile() && videoExtensions.includes(ext)) {
            return {
              name: file,
              path: filePath,
              size: fileStat.size,
              createdAt: fileStat.birthtime,
              modifiedAt: fileStat.mtime,
              isDirectory: false,
            };
          } else if (fileStat.isDirectory()) {
            return {
              name: file,
              path: filePath,
              createdAt: fileStat.birthtime,
              modifiedAt: fileStat.mtime,
              isDirectory: true,
            };
          }
          return null;
        })
      );
      
      // Filter out null entries (non-video files)
      return fileDetails.filter(Boolean);
    } catch (error) {
      console.error('Error reading directory:', error);
      throw error;
    }
  });

  // Generate thumbnail for a video file
  ipcMain.handle('video:getThumbnail', async (_, videoPath) => {
    try {
      console.log('Generating thumbnail for:', videoPath);
      
      // Check if we already have this thumbnail in cache
      if (thumbnailCache.has(videoPath)) {
        return thumbnailCache.get(videoPath);
      }

      // Create a unique filename for the thumbnail
      const thumbFilename = `${Buffer.from(videoPath).toString('base64').replace(/[\/\+=]/g, '_')}.jpg`;
      const thumbnailPath = path.join(thumbnailDir, thumbFilename);
      
      // Check if thumbnail already exists on disk
      if (fs.existsSync(thumbnailPath)) {
        const dataUrl = `data:image/jpeg;base64,${fs.readFileSync(thumbnailPath).toString('base64')}`;
        thumbnailCache.set(videoPath, dataUrl);
        return dataUrl;
      }

      // Generate a new thumbnail
      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .on('error', (err) => {
            console.error('Thumbnail generation error:', err);
            reject('Error generating thumbnail');
          })
          .on('end', () => {
            try {
              // Read the file and convert to data URL
              const dataUrl = `data:image/jpeg;base64,${fs.readFileSync(thumbnailPath).toString('base64')}`;
              thumbnailCache.set(videoPath, dataUrl);
              resolve(dataUrl);
            } catch (error) {
              console.error('Error reading thumbnail:', error);
              reject('Error reading thumbnail');
            }
          })
          .screenshots({
            count: 1,
            folder: thumbnailDir,
            filename: thumbFilename,
            size: '320x?',
            timemarks: ['10%'] // Take thumbnail at 10% of the video duration
          });
      });
    } catch (error) {
      console.error('Error in getThumbnail:', error);
      return null;
    }
  });

  // Handle vertical video processing
  ipcMain.handle('video:processVertical', async (_, videoPath, customOutputFolder) => {
    try {
      // Create a temporary directory for the Python script
      const tempDir = path.join(app.getPath('temp'), 'vertical-video-creator');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Determine the output folder
      const outputFolder = customOutputFolder || path.join(path.dirname(videoPath), 'Viral_Clips');
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }

      // Check for the .env file in various locations and log where we're looking
      const appDir = path.dirname(app.getPath('exe'));
      const userDataDir = app.getPath('userData');
      console.log("Looking for .env file in the following locations:");
      console.log(`1. Current directory: ${process.cwd()}`);
      console.log(`2. App directory: ${appDir}`);
      console.log(`3. User data directory: ${userDataDir}`);
      
      const possibleEnvLocations = [
        path.join(process.cwd(), '.env'),
        path.join(appDir, '.env'),
        path.join(userDataDir, '.env'),
        // Also check the electron directory specifically
        path.join(process.cwd(), 'electron', '.env')
      ];

      let envFileFound = false;
      for (const envPath of possibleEnvLocations) {
        if (fs.existsSync(envPath)) {
          fs.copyFileSync(envPath, path.join(tempDir, '.env'));
          console.log(`Found and copied .env file from: ${envPath}`);
          envFileFound = true;
          
          // Read the file to check if it has the correct format (but don't log the full key)
          try {
            const envContent = fs.readFileSync(envPath, 'utf8');
            if (envContent.includes('OPENAI_API_KEY=')) {
              console.log("The .env file contains an OPENAI_API_KEY entry");
              // Just print the first 10 characters of the key to confirm it's there
              const keyMatch = envContent.match(/OPENAI_API_KEY=([^\r\n]+)/);
              if (keyMatch && keyMatch[1]) {
                const keyPrefix = keyMatch[1].substring(0, 10) + '...';
                console.log(`API key found starting with: ${keyPrefix}`);
              } else {
                console.log("API key format might be incorrect");
              }
            } else {
              console.log("WARNING: The .env file does not contain an OPENAI_API_KEY entry");
            }
          } catch (readError) {
            console.error("Error reading .env file:", readError);
          }
          
          break;
        } else {
          console.log(`No .env file found at: ${envPath}`);
        }
      }

      if (!envFileFound) {
        console.log('No .env file found in any of the searched locations.');
        console.log('The script will run in demo mode without API analysis.');
        console.log('To use full features, create a .env file with OPENAI_API_KEY=your_key_here');
      }

      // Write the Python script to a temporary file
      const pythonScriptPath = path.join(tempDir, 'vertical_video_creator.py');
      fs.writeFileSync(pythonScriptPath, getUpdatedPythonScript());

      // Create a requirements.txt file for pip to use
      const requirementsPath = path.join(tempDir, 'requirements.txt');
      fs.writeFileSync(requirementsPath, 'moviepy==1.0.3\nopenai==1.12.0\npython-dotenv==1.0.0\nnumpy==1.24.3\npillow==10.0.0\n');

      // Check if Python is installed
      const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
      const checkPython = spawn(pythonCommand, ['--version']);
      
      return new Promise((resolve, reject) => {
        checkPython.on('error', (err) => {
          reject(new Error(`Python is not installed or not in PATH. Please install Python from https://www.python.org/downloads/ and ensure it's added to your PATH.\n\nError details: ${err.message}`));
        });

        // Once Python check passes, proceed with dependency installation and script execution
        checkPython.on('close', (pythonCode) => {
          if (pythonCode !== 0) {
            reject(new Error("Python is not installed or not in PATH. Please install Python from https://www.python.org/downloads/ and ensure it's added to your PATH."));
            return;
          }

          console.log("Python is installed. Installing dependencies...");
          
          // Install dependencies from requirements.txt with pip
          // Use --user flag to avoid permission issues and target the user's site-packages
          const pipCommand = process.platform === 'win32' ? 'pip' : 'pip3';
          const installDeps = spawn(pipCommand, [
            'install', 
            '--user', 
            '-r', 
            requirementsPath
          ]);
          
          let installOutput = '';
          let installError = '';
          
          installDeps.stdout.on('data', (data) => {
            installOutput += data.toString();
            console.log(`Pip stdout: ${data}`);
          });
          
          installDeps.stderr.on('data', (data) => {
            installError += data.toString();
            console.error(`Pip stderr: ${data}`);
          });
          
          installDeps.on('close', (installCode) => {
            if (installCode !== 0) {
              const errorMsg = `Failed to install Python dependencies. Please manually install them by opening a terminal/command prompt and running:\n\n${pipCommand} install moviepy openai python-dotenv numpy pillow\n\nError details:\n${installError}`;
              console.error(errorMsg);
              
              // Try to run the script anyway in case the dependencies are already installed
              console.log("Attempting to run the script despite installation issues...");
            } else {
              console.log("Dependencies installed successfully.");
            }
            
            // Create a .env file with the OpenAI API key if provided
            const apiKey = process.env.OPENAI_API_KEY;
            if (apiKey && !envFileFound) {
              console.log("Found OPENAI_API_KEY in environment variables");
              const keyPrefix = apiKey.substring(0, 10) + '...';
              console.log(`Using API key from environment variable starting with: ${keyPrefix}`);
              fs.writeFileSync(path.join(tempDir, '.env'), `OPENAI_API_KEY=${apiKey}\n`);
              console.log("Created .env file with OPENAI_API_KEY from environment variable.");
            } else if (!envFileFound) {
              console.log("No OPENAI_API_KEY found in environment variables");
            }
            
            // Run the Python script
            runPythonScript(pythonCommand, pythonScriptPath, videoPath, outputFolder, resolve, reject);
          });
        });
      });
    } catch (error) {
      console.error('Error in video:processVertical:', error);
      throw error;
    }
  });

  // Helper function to run the Python script
  function runPythonScript(pythonCommand, scriptPath, videoPath, outputFolder, resolve, reject) {
    const process = spawn(pythonCommand, [scriptPath, videoPath, outputFolder]);
    
    let stdoutData = '';
    let stderrData = '';
    
    process.stdout.on('data', (data) => {
      stdoutData += data.toString();
      console.log(`Python stdout: ${data}`);
    });
    
    process.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.error(`Python stderr: ${data}`);
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        // Try to read the metadata file
        try {
          // Get base filename of the video being processed
          const baseFilename = path.basename(videoPath, path.extname(videoPath));
          const metadataPath = path.join(outputFolder, `${baseFilename}_viral_clips_metadata.json`);
          
          if (!fs.existsSync(metadataPath)) {
            throw new Error('Metadata file not found. The process might have completed in demo mode or had other issues.');
          }
          
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          
          // Find all the created video files
          const files = fs.readdirSync(outputFolder)
            .filter(file => file.startsWith(`${baseFilename}_clip_`) && (file.endsWith('.mp4') || file.endsWith('.mov')))
            .map(file => path.join(outputFolder, file));
          
          if (files.length === 0) {
            console.warn('No video clips were found in the output directory, but the script completed successfully.');
          }
          
          resolve({
            outputPaths: files,
            metadata: metadata
          });
        } catch (err) {
          console.error('Error parsing metadata:', err);
          
          // If the script completed successfully but we couldn't read the metadata,
          // we'll still return a success result with any videos we found
          const files = fs.readdirSync(outputFolder)
            .filter(file => file.startsWith(`${baseFilename}_clip_`) && (file.endsWith('.mp4') || file.endsWith('.mov')))
            .map(file => path.join(outputFolder, file));
          
          if (files.length > 0) {
            resolve({
              outputPaths: files,
              metadata: { warning: 'Metadata file could not be read, but videos were created successfully.' }
            });
          } else {
            reject(new Error(`Process completed but no output videos or metadata were found: ${err.message}`));
          }
        }
      } else {
        reject(new Error(`Python process exited with code ${code}:\n${stderrData}`));
      }
    });
  }

  // Handle opening a file
  ipcMain.handle('file:open', async (_, filePath) => {
    try {
      // Open the file with the default application
      if (process.platform === 'win32') {
        exec(`start "" "${filePath}"`);
      } else if (process.platform === 'darwin') {
        exec(`open "${filePath}"`);
      } else {
        exec(`xdg-open "${filePath}"`);
      }
    } catch (error) {
      console.error('Error opening file:', error);
      throw error;
    }
  });

  // Handle selecting an output folder
  ipcMain.handle('dialog:selectOutputFolder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Output Folder for Vertical Videos',
    });
    if (canceled) {
      return null;
    }
    return filePaths[0];
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false // Allow loading local resources
    },
  });

  // Load the Vite dev server in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173/');
    // Open DevTools
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register a custom protocol to serve local files
app.whenReady().then(() => {
  // Register the file protocol for secure local file access
  protocol.registerFileProtocol('local-file', (request, callback) => {
    const filePath = url.fileURLToPath(
      'file://' + request.url.slice('local-file://'.length)
    );
    callback({ path: filePath });
  });

  // Set up IPC handlers
  setupIpcHandlers();
  
  // Create the application window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Function to return the updated Python script as a string
function getUpdatedPythonScript() {
  return `
import os
import logging
import json
import time
import numpy as np
from typing import List, Dict, Any
from moviepy import VideoFileClip
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Check if we're in demo mode (without API key)
DEMO_MODE = os.environ.get('OPENAI_API_KEY') is None
if DEMO_MODE:
    logging.warning("Running in DEMO mode without OpenAI API key. Will use mock data.")

# Initialize OpenAI client using environment variable directly
try:
    client = OpenAI()  # OpenAI will automatically use OPENAI_API_KEY from environment
except Exception as e:
    if DEMO_MODE:
        logging.warning(f"OpenAI client initialization failed, but running in demo mode: {e}")
    else:
        raise

def split_audio(input_file: str, segment_length: int = 15 * 60) -> List[str]:
    """
    Split a long audio file into segments of the specified length (in seconds).
    OpenAI's Whisper API has a limit of 25MB which is roughly 25 minutes of audio.
    We'll use segments of 15 minutes to be safe.
    
    Args:
        input_file: Path to the video file to extract audio from
        segment_length: Length of each segment in seconds (default: 15 minutes)
        
    Returns:
        List of paths to the temporary audio segments
    """
    logging.info(f"Splitting audio from video: {input_file} into segments")
    
    try:
        with VideoFileClip(input_file) as video:
            # Get the duration of the video
            duration = video.duration
            logging.info(f"Video duration: {duration} seconds")
            
            # If the video is shorter than segment_length, no need to split
            if duration <= segment_length:
                temp_audio_file = "temp_audio_full.mp3"
                video.audio.write_audiofile(temp_audio_file)
                return [temp_audio_file]
            
            # Create segments
            temp_files = []
            num_segments = int(np.ceil(duration / segment_length))
            logging.info(f"Splitting into {num_segments} segments")
            
            for i in range(num_segments):
                start_time = i * segment_length
                end_time = min((i + 1) * segment_length, duration)
                
                # Extract the segment
                segment = video.subclipped(start_time, end_time)
                temp_file = f"temp_audio_segment_{i}.mp3"
                segment.audio.write_audiofile(temp_file)
                temp_files.append(temp_file)
                
            return temp_files
            
    except Exception as e:
        logging.error(f"Error splitting audio: {str(e)}")
        return []

def merge_transcript_segments(transcript_segments: List[Dict[str, Any]], segment_lengths: List[float]) -> Dict[str, Any]:
    """
    Merge multiple transcript segments into a single transcript, adjusting timestamps.
    
    Args:
        transcript_segments: List of transcript dictionaries from the API
        segment_lengths: List of durations for each segment to adjust timestamps
        
    Returns:
        A merged transcript dictionary
    """
    if not transcript_segments:
        return {}
    
    if len(transcript_segments) == 1:
        return transcript_segments[0]
    
    # Initialize the merged transcript with basic structure from the first segment
    merged = {
        "task": transcript_segments[0].get("task", "transcribe"),
        "language": transcript_segments[0].get("language", "english"),
        "duration": sum(segment_lengths),
        "text": "",
        "segments": []
    }
    
    # Keep track of the current offset for adjusting timestamps
    current_offset = 0
    segment_id = 0
    
    # Process each transcript segment
    for i, transcript in enumerate(transcript_segments):
        # Adjust segment text
        merged["text"] += transcript.get("text", "") + " "
        
        # Adjust segments with correct timestamps
        for segment in transcript.get("segments", []):
            new_segment = segment.copy()
            new_segment["id"] = segment_id
            new_segment["start"] += current_offset
            new_segment["end"] += current_offset
            
            # Adjust word timestamps if they exist
            if "words" in new_segment:
                for word in new_segment["words"]:
                    word["start"] += current_offset
                    word["end"] += current_offset
            
            merged["segments"].append(new_segment)
            segment_id += 1
        
        # Update the offset for the next segment
        current_offset += segment_lengths[i]
    
    logging.info(f"Merged {len(transcript_segments)} transcript segments successfully")
    return merged

def transcribe_video(input_file: str) -> Dict[str, Any]:
    logging.info(f"Transcribing video: {input_file}")
    
    # Use mock data if in demo mode
    if DEMO_MODE:
        logging.info("Using mock transcription data (DEMO mode)")
        # Mock transcript data
        mock_transcript = {
            "task": "transcribe",
            "language": "english",
            "duration": 120.5,
            "text": "Welcome to the Wild Kratts! Today we're exploring the amazing Amazon rainforest. Did you know that the poison dart frog has enough toxin to take down ten grown men? Amazing! And look at that, a sloth moves so slowly that algae grows on its fur, creating a mini ecosystem.",
            "segments": [
                {
                    "id": 0,
                    "start": 0.0,
                    "end": 5.0,
                    "text": "Welcome to the Wild Kratts!",
                    "words": [{"word": "Welcome", "start": 0.0, "end": 1.2},
                             {"word": "to", "start": 1.3, "end": 1.5},
                             {"word": "the", "start": 1.6, "end": 1.8},
                             {"word": "Wild", "start": 1.9, "end": 2.5},
                             {"word": "Kratts!", "start": 2.6, "end": 5.0}]
                },
                {
                    "id": 1,
                    "start": 5.5,
                    "end": 15.0,
                    "text": "Today we're exploring the amazing Amazon rainforest.",
                    "words": [{"word": "Today", "start": 5.5, "end": 6.0},
                              {"word": "we're", "start": 6.1, "end": 6.5},
                              {"word": "exploring", "start": 6.6, "end": 7.5},
                              {"word": "the", "start": 7.6, "end": 7.8},
                              {"word": "amazing", "start": 7.9, "end": 9.0},
                              {"word": "Amazon", "start": 9.1, "end": 10.5},
                              {"word": "rainforest.", "start": 10.6, "end": 15.0}]
                },
                {
                    "id": 2,
                    "start": 16.0,
                    "end": 25.0,
                    "text": "Did you know that the poison dart frog has enough toxin to take down ten grown men?",
                    "words": [{"word": "Did", "start": 16.0, "end": 16.5},
                             {"word": "you", "start": 16.6, "end": 16.8},
                             {"word": "know", "start": 16.9, "end": 17.2},
                             {"word": "that", "start": 17.3, "end": 17.5},
                             {"word": "the", "start": 17.6, "end": 17.8},
                             {"word": "poison", "start": 17.9, "end": 18.5},
                             {"word": "dart", "start": 18.6, "end": 19.0},
                             {"word": "frog", "start": 19.1, "end": 19.5},
                             {"word": "has", "start": 19.6, "end": 20.0},
                             {"word": "enough", "start": 20.1, "end": 20.5},
                             {"word": "toxin", "start": 20.6, "end": 21.0},
                             {"word": "to", "start": 21.1, "end": 21.2},
                             {"word": "take", "start": 21.3, "end": 21.8},
                             {"word": "down", "start": 21.9, "end": 22.5},
                             {"word": "ten", "start": 22.6, "end": 23.0},
                             {"word": "grown", "start": 23.1, "end": 24.0},
                             {"word": "men?", "start": 24.1, "end": 25.0}]
                }
            ]
        }
        return mock_transcript
        
    try:
        # Split the video into manageable audio chunks
        audio_segments = split_audio(input_file)
        if not audio_segments:
            logging.error("Failed to split audio from video")
            return None
        
        # Get the duration of each segment for timestamp adjustment
        segment_durations = []
        with VideoFileClip(input_file) as video:
            total_duration = video.duration
            segment_length = 15 * 60  # 15 minutes in seconds
            
            for i in range(len(audio_segments)):
                start_time = i * segment_length
                end_time = min((i + 1) * segment_length, total_duration)
                segment_durations.append(end_time - start_time)
        
        # Process each audio segment
        transcript_segments = []
        for i, audio_file in enumerate(audio_segments):
            logging.info(f"Transcribing audio segment {i+1}/{len(audio_segments)}")
            
            try:
                # Open the audio file and send it to the OpenAI API
                with open(audio_file, "rb") as file:
                    transcript = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=file,
                        response_format="verbose_json",
                        timestamp_granularities=["segment", "word"]
                    )
                
                transcript_segments.append(transcript.model_dump())
                logging.info(f"Successfully transcribed segment {i+1}")
            except Exception as e:
                logging.error(f"Error transcribing segment {i+1}: {str(e)}")
                # Continue with other segments even if one fails
            finally:
                # Clean up the temporary audio file
                try:
                    os.remove(audio_file)
                    logging.info(f"Removed temporary audio file: {audio_file}")
                except Exception as e:
                    logging.error(f"Error removing temporary file {audio_file}: {str(e)}")
        
        # Merge the transcript segments and adjust timestamps
        if transcript_segments:
            merged_transcript = merge_transcript_segments(transcript_segments, segment_durations)
            logging.info(f"Transcription completed for: {input_file}")
            return merged_transcript
        else:
            logging.error("No transcript segments were successfully generated")
            return None
            
    except Exception as e:
        logging.error(f"Error transcribing video {input_file}: {str(e)}")
        return None

def analyze_transcript(transcription: Dict[str, Any]) -> List[Dict[str, Any]]:
    logging.info("Analyzing transcript with AI")
    
    # Use mock data if in demo mode
    if DEMO_MODE:
        logging.info("Using mock analysis data (DEMO mode)")
        # Mock analysis response
        mock_clips = [
            {
                "timecodes": [16.0, 25.0],
                "description": "This segment features the fascinating poison dart frog, showcasing its surprising toxicity. The Kratt brothers' enthusiastic explanation and animated visuals make this fact engaging for viewers of all ages. The vibrant colors of the frog combined with the amazing fact about its poison potency creates a perfect mix of visual appeal and educational value.",
                "entertainment_score": 9,
                "educational_score": 10,
                "clarity_score": 9,
                "shareability_score": 10,
                "length_score": 10,
                "analysis": {
                    "animal_facts": [
                        "Poison dart frogs contain enough toxin to take down ten adult humans",
                        "These frogs are among the most toxic animals on Earth",
                        "Their bright colors warn predators of their toxicity"
                    ],
                    "context_and_setup": "The clip begins with Chris asking a provocative question that immediately hooks the viewer's interest, creating curiosity about what makes this tiny frog so special.",
                    "emotional_engagement": "Martin's exaggerated reaction of surprise and disbelief creates an emotional response that helps viewers understand the significance of this fact. The brothers' enthusiasm is contagious.",
                    "follow_up": "After revealing the main fact, they explain how these frogs use this defense mechanism in the wild, providing important ecological context.",
                    "educational_entertainment_balance": "This clip perfectly balances the shocking fact about the frog's toxicity with the brothers' entertaining reactions, making the educational content highly engaging."
                },
                "text_hook": "This tiny frog could take down 10 grown men! 🐸☠️"
            }
        ]
        return mock_clips
    
    # Access segments from the transcription dictionary
    segments = transcription.get("segments", [])

    # Prepare the transcript text with timestamps
    transcript_text = ""
    for segment in segments:
        start_time = segment.get("start", 0)
        end_time = segment.get("end", 0)
        text = segment.get("text", "")
        transcript_text += f"[{start_time:.2f} - {end_time:.2f}] {text}"

    # Define the JSON template separately to avoid f-string issues
    json_template = '''
    {
        "clips": [
            {
                "timecodes": [start_time, end_time],
                "description": "Detailed explanation of viral potential",
                "entertainment_score": 0-10,
                "educational_score": 0-10,
                "clarity_score": 0-10,
                "shareability_score": 0-10,
                "length_score": 0-10,
                "analysis": {
                    "animal_facts": ["Fact1", "Fact2"],
                    "context_and_setup": "Description of how the setup creates a smooth lead-in to the fact",
                    "emotional_engagement": "Description of emotional reactions, excitement, or narrative",
                    "follow_up": "Description of the additional information or reactions after the fact",
                    "educational_entertainment_balance": "Description of how the clip balances education and fun"
                },
                "text_hook": "Suggested text hook for the start of the video"
            }
        ]
    }
    '''

    prompt = f"""
        You are a social media expert and viral content creator specializing in educational content about animals. Your task is to analyze the following transcript from a Wild Kratts episode, focusing on finding 3-5 segments that would make entertaining, educational, and shareable social media clips about animals. Each segment should be 30-90 seconds long, prioritizing this segment length over the number of segments.

        ### Step 1: Carefully read and understand the entire transcript.

        ### Step 2: Identify potential viral segments based on the following criteria:
        a) **Entertainment value** (Is the content engaging, fun, and dynamic? Does it include any exciting visuals or actions, especially between the Kratt Brothers and animals?)  
        b) **Educational value** (Does the segment teach something interesting, surprising, or insightful about animals?)  
        c) **Clarity of dialogue** (Is the message about animals clear and easy to understand?)  
        d) **Shareability** (Would this segment encourage viewers to share or engage on social media, based on emotional or surprising moments?)
        e) **Length** (Is the segment between 30-90 seconds long? Prioritize segments that fit this range while maintaining high engagement.)

        ### Step 3: For each potential segment, ensure there is sufficient **context, setup, and emotional engagement**:
        - **Setup**: Does the segment include a clear beginning that builds curiosity or sets the stage for an engaging fact or story?
        - **Emotional Engagement**: Does the segment include emotional reactions, excitement, or surprise that could resonate with viewers? Does it build a narrative or suspense before delivering the fact?
        - **Fact Delivery**: Highlight the key animal fact, ensuring that it is delivered within a dynamic or engaging context.
        - **Follow-Up**: Does the segment have a natural resolution or reaction after the fact, creating a sense of completion for the viewer?

        ### Step 4: Based on your analysis, select the top 1-3 segments that have the highest potential to educate, entertain, and go viral.

        ### Step 5: For each selected segment, provide:
        1. Start and end timecodes (use the exact timecodes from the transcript).
        2. A detailed description of why this segment would make an excellent viral clip, including:
        - The animal(s) featured and their key behaviors or facts discussed.
        - Why this segment would captivate and emotionally engage viewers, especially children.
        - How it aligns with current social media trends related to animal content (e.g., surprising animal facts, emotional storytelling, dynamic visuals).
        3. A suggested **text hook** to overlay at the start of the video that grabs attention (e.g., "Did you know this about [animal]?" or "Meet one of the fastest animals in the world!").
        4. A score out of 10 for each of the five criteria mentioned in Step 2.
        5. A summary of how the clip mixes education with entertainment and its overall emotional impact.

        ### Length Score Calculation:
        Calculate the length_score as follows:
        - If the segment is between 30-90 seconds: score = 10
        - If the segment is 20-30 or 90-100 seconds: score = 8
        - If the segment is 10-20 or 100-110 seconds: score = 6
        - If the segment is 0-10 or 110-120 seconds: score = 4
        - If the segment is longer than 120 seconds: score = 2

        ### Transcript:
        {transcript_text}

        ### Respond in the following JSON format:
        {json_template}

        ### Important Note:
        Ensure that the duration between start_time and end_time is at least 30 seconds. If any segment is less than 30 seconds, discard it and select another segment that meets the minimum duration requirement.
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4.5-preview",  # Using GPT-4 for better analysis, fallback to gpt-4o or gpt-4
            messages=[
                {"role": "system", "content": "You are a world-class social media expert and viral content creator."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            response_format={ "type": "json_object" }  
        )
        
        if response.choices and len(response.choices) > 0:
            content = response.choices[0].message.content
            try:
                viral_clips = json.loads(content)
                if 'clips' in viral_clips:
                    logging.info("Transcript analysis completed")
                    return viral_clips['clips']
                else:
                    logging.error("Error analyzing transcript: 'clips' key not found in response JSON")
            except json.JSONDecodeError as e:
                logging.error(f"Error parsing JSON response: {str(e)}")
        else:
            logging.error("Error analyzing transcript: Unexpected API response format")

    except Exception as e:
        logging.error(f"Error analyzing transcript: {str(e)}")
        # Try with a different model if gpt-4.5-preview fails
        try:
            logging.info("Retrying with gpt-4o model...")
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a world-class social media expert and viral content creator."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                response_format={ "type": "json_object" }
            )
            
            if response.choices and len(response.choices) > 0:
                content = response.choices[0].message.content
                viral_clips = json.loads(content)
                if 'clips' in viral_clips:
                    logging.info("Transcript analysis completed with fallback model")
                    return viral_clips['clips']
            
        except Exception as fallback_error:
            logging.error(f"Error with fallback model: {str(fallback_error)}")

    return []  # Return an empty list if there's any error

def create_vertical_clips(input_file: str, viral_clips: List[Dict[str, Any]], output_folder: str) -> None:
    logging.info(f"Creating vertical clips from: {input_file}")
    
    # Get base filename without extension to use in output filenames
    base_filename = os.path.splitext(os.path.basename(input_file))[0]
    
    # Use mock processing in demo mode
    if DEMO_MODE:
        logging.info("Using mock clip creation (DEMO mode)")
        
        # Just copy the input file to simulate creating clips
        try:
            # Make sure the output folder exists
            os.makedirs(output_folder, exist_ok=True)
            
            for i, clip_info in enumerate(viral_clips, 1):
                # Get the file extension from the input file
                file_extension = os.path.splitext(input_file)[1]
                # Create clip filenames including source video name
                clip_output = os.path.join(output_folder, f"{base_filename}_clip_{i}{file_extension}")
                
                # In demo mode, we just copy the original video as a placeholder
                # In a real scenario, we would create vertical clips with the proper timecodes
                import shutil
                shutil.copy(input_file, clip_output)
                logging.info(f"Demo vertical clip {i} created: {clip_output}")
            
            return
        except Exception as e:
            logging.error(f"Error in demo clip creation: {str(e)}")
            return
    
    # Real processing for non-demo mode
    try:
        # Import Resize effect for MoviePy 2.1.1
        from moviepy.video.fx.Resize import Resize
        from moviepy.video.fx.Crop import Crop
        
        # Get the original video
        video = VideoFileClip(input_file)
        
        # Process each viral clip
        for i, clip_data in enumerate(viral_clips):
            # Extract timecodes from the array instead of looking for start_time and end_time keys
            timecodes = clip_data.get("timecodes", [0, 0])
            start_time = timecodes[0] if len(timecodes) > 0 else 0
            end_time = timecodes[1] if len(timecodes) > 1 else 0
            
            # Skip if end time is not valid
            if end_time <= start_time:
                logging.warning(f"Skipping clip {i} because end_time ({end_time}) <= start_time ({start_time})")
                continue
                
            logging.info(f"Creating vertical clip {i} from {start_time} to {end_time}")
            
            # Extract the segment
            segment = video.subclipped(start_time, end_time)
            
            # Resize to vertical format (9:16 aspect ratio)
            # First resize to appropriate height using the new Resize effect
            vertical_segment = segment.with_effects([Resize(height=1920)])
            # Then center crop to 9:16 ratio
            vertical_segment = vertical_segment.with_effects([Crop(x_center=vertical_segment.w/2, width=1080)])

            # Save individual vertical clips with source video name included
            clip_output = os.path.join(output_folder, f"{base_filename}_clip_{i}{os.path.splitext(input_file)[1]}")
            vertical_segment.write_videofile(clip_output, codec='libx264')
            logging.info(f"Vertical clip {i} created: {clip_output}")
        
        # Close the video file to release resources
        video.close()

        logging.info(f"All vertical clips created for: {input_file}")
    except Exception as e:
        logging.error(f"Error creating vertical clips for {input_file}: {str(e)}")
        logging.error(f"Exception details: {type(e).__name__}: {str(e)}")

        # No fallback to copying - we want to fix the resize issue

def save_metadata(viral_clips: List[Dict[str, Any]], output_folder: str, input_file: str) -> None:
    # Get base filename without extension to use in metadata filename
    base_filename = os.path.splitext(os.path.basename(input_file))[0]
    metadata_file = os.path.join(output_folder, f"{base_filename}_viral_clips_metadata.json")
    with open(metadata_file, 'w') as f:
        json.dump(viral_clips, f, indent=2)
    logging.info(f"Metadata saved in {metadata_file}")

def process_video(input_file: str, output_folder: str) -> None:
    logging.info(f"Processing video: {input_file}")
    
    # Step 1: Transcribe the video
    transcription = transcribe_video(input_file)
    if not transcription:
        return
    
    # Step 2: Analyze the transcript and get viral clip suggestions
    viral_clips = analyze_transcript(transcription)
    if not viral_clips:
        return
    
    # Step 3: Create vertical clips based on the analysis
    create_vertical_clips(input_file, viral_clips, output_folder)
    
    # Save metadata
    save_metadata(viral_clips, output_folder, input_file)

def process_folder(input_folder: str, output_folder: str = None) -> None:
    logging.info(f"Starting to process folder: {input_folder}")
    
    # If it's a file, process it directly
    if os.path.isfile(input_folder):
        if output_folder is None:
            # Create output folder next to the input file
            parent_dir = os.path.dirname(input_folder)
            output_folder = os.path.join(parent_dir, "Viral_Clips")
        os.makedirs(output_folder, exist_ok=True)
        logging.info(f"Created output directory: {output_folder}")
        process_video(input_folder, output_folder)
        logging.info(f"Finished processing file: {input_folder}")
        return
    
    # If it's a folder, process all videos in it
    if output_folder is None:
        output_folder = os.path.join(input_folder, "Viral_Clips")
    
    os.makedirs(output_folder, exist_ok=True)
    logging.info(f"Created output directory: {output_folder}")
    
    files = os.listdir(input_folder)
    logging.info(f"Files in folder: {files}")
    for filename in files:
        if filename.lower().endswith(('.mov', '.mp4')):
            input_file = os.path.join(input_folder, filename)
            process_video(input_file, output_folder)
            logging.info(f"Finished processing {filename}")
        else:
            logging.info(f"Skipping file: {filename} (not a .mov or .mp4 file)")
    logging.info(f"Finished processing folder: {input_folder}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python viral.py <input_path> [output_folder]")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_folder = sys.argv[2] if len(sys.argv) > 2 else None
    
    logging.info(f"Starting script with input path: {input_path}")
    logging.info(f"Output folder: {output_folder}")
    
    if os.path.exists(input_path):
        logging.info(f"Input path exists: {input_path}")
        process_folder(input_path, output_folder)
    else:
        logging.error(f"Input path does not exist: {input_path}")
    
    logging.info("Script execution completed")
  `;
} 