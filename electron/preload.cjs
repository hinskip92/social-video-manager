const { contextBridge, ipcRenderer, shell } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  /* Directory & metadata */
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  readDirectory: (dirPath) => ipcRenderer.invoke('fs:readDirectory', dirPath),

  /* Thumbnails & editing */
  getVideoThumbnail: (videoPath) => ipcRenderer.invoke('video:getThumbnail', videoPath),
  editVideo: (inputPath, options) => ipcRenderer.invoke('video:edit', inputPath, options),

  /* Export / transcode */
  exportStart: (inputPath, preset, outputDir, crop) =>
    ipcRenderer.invoke('export:start', { inputPath, preset, outputDir, crop }),
  onExportProgress: (callback) =>
    ipcRenderer.on('export:progress', (_, data) => callback(data)),
  onceExportCompleted: (callback) =>
    ipcRenderer.once('export:completed', (_, data) => callback(data)),
  onceExportError: (callback) =>
    ipcRenderer.once('export:error', (_, data) => callback(data)),

  /* Shell helper */
  shellOpen: (filePath) => shell.openPath(filePath),

  /* Crop analysis */
  analyzeCrop: (videoPath) => ipcRenderer.invoke('export:analyzeCrop', videoPath),
});
