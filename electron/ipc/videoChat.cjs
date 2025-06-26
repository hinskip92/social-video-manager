const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

function setupVideoChatHandlers() {
  ipcMain.handle('video-chat', async (event, { videoPath, question }) => {
    return new Promise((resolve, reject) => {
      const pythonScriptPath = path.join(__dirname, '..', '..', 'scripts', 'video_chat.py');
      
      const venvPath = path.join(__dirname, '..', '..', 'venv');
      const pythonExecutable = process.platform === 'win32'
        ? path.join(venvPath, 'Scripts', 'python.exe')
        : path.join(venvPath, 'bin', 'python');

      const pyProc = spawn(pythonExecutable, [pythonScriptPath, videoPath, question]);

      let response = '';
      let error = '';

      pyProc.stdout.on('data', (data) => {
        response += data.toString();
      });

      pyProc.stderr.on('data', (data) => {
        error += data.toString();
        // Log stderr from python script in the main process console for debugging
        console.error(`[Python STDERR]: ${data}`);
      });

      pyProc.on('close', (code) => {
        if (code === 0) {
          resolve(response.trim());
        } else {
          console.error(`Python script exited with code ${code}`);
          console.error(`Python script error output: ${error}`);
          reject(new Error(`Python script failed: ${error.trim()}`));
        }
      });

      pyProc.on('error', (err) => {
        console.error('Failed to start Python script:', err);
        if (err.code === 'ENOENT') {
          reject(new Error(`Python executable not found at ${pythonExecutable}. Please ensure the virtual environment is set up correctly.`));
        } else {
          reject(err);
        }
      });
    });
  });
}

module.exports = { setupVideoChatHandlers }; 