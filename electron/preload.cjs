const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  readDirectory: (path) => ipcRenderer.invoke('fs:readDirectory', path),
  getVideoThumbnail: (videoPath) => ipcRenderer.invoke('video:getThumbnail', videoPath),
  
  // New methods for Vertical Video Creator
  processVerticalVideo: (videoPath, outputFolder) => ipcRenderer.invoke('video:processVertical', videoPath, outputFolder),
  selectOutputFolder: () => ipcRenderer.invoke('dialog:selectOutputFolder'),
  openFile: (filePath) => ipcRenderer.invoke('file:open', filePath),
  getProcessingProgress: (jobId) => ipcRenderer.invoke('video:getProcessingProgress', jobId),
}); 