const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const url = require('url');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

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

  // Basic video editing (trim and crop)
  ipcMain.handle('video:edit', async (_, inputPath, options) => {
    try {
      const { startTime, duration, crop } = options || {};
      const parsed = path.parse(inputPath);
      const outputPath = path.join(parsed.dir, `${parsed.name}_edited${parsed.ext}`);

      return await new Promise((resolve, reject) => {
        let command = ffmpeg(inputPath).output(outputPath);

        if (typeof startTime !== 'undefined') {
          command = command.setStartTime(startTime);
        }

        if (typeof duration !== 'undefined') {
          command = command.setDuration(duration);
        }

        if (crop) {
          const { width, height, x, y } = crop;
          command = command.videoFilters(`crop=${width}:${height}:${x}:${y}`);
        }

        command
          .on('error', err => {
            console.error('Video edit error:', err);
            reject(err);
          })
          .on('end', () => resolve(outputPath))
          .run();
      });
    } catch (error) {
      console.error('Error editing video:', error);
      throw error;
    }
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