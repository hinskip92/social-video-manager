/**
 * IPC handlers for video export/transcode operations.
 * Uses fluent-ffmpeg to convert the input file according to social-media presets.
 */

const { ipcMain, shell } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { spawnSync } = require('child_process');

/**
 * Keep preset definitions close to the export logic to avoid import issues
 * in the Electron main (CommonJS) context. This mirrors src/constants/exportPresets.ts
 * – keep them in sync!
 */
const EXPORT_PRESETS = {
  instagramReel: {
    outExt: '.mp4',
    targetWidth: 1080,
    targetHeight: 1920,
    ffmpegArgs: [
      '-r', '30',
      '-c:v', 'libx264', '-profile:v', 'high', '-crf', '23',
      '-preset', 'veryfast',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
    ],
  },
  tiktok: {
    outExt: '.mp4',
    targetWidth: 1080,
    targetHeight: 1920,
    ffmpegArgs: [
      '-r', '24',
      '-c:v', 'libx264', '-profile:v', 'high', '-crf', '25',
      '-preset', 'veryfast',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
    ],
  },
  twitter: {
    outExt: '.mp4',
    targetWidth: 1280,
    targetHeight: 720,
    ffmpegArgs: [
      '-r', '30',
      '-c:v', 'libx264', '-profile:v', 'high', '-crf', '23',
      '-preset', 'veryfast',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
    ],
  },
};

/**
 * Register export-related IPC handlers.
 * Should be called from main.cjs during app bootstrap.
 */
function registerExportHandlers() {
  /**
   * Analyze best crop rectangle for vertical export.
   * Uses the smart_vertical_crop.py script with YOLO object detection.
   */
  ipcMain.handle('export:analyzeCrop', async (_, videoPath) => {
    try {
      // Use the smart Python script with analyze-only mode
      const { spawn } = require('child_process');
      const pythonPath = 'python'; // or 'python3' depending on your system
      const scriptPath = path.join(__dirname, '../../scripts/smart_vertical_crop.py');
      
      // Run the Python script in analyze-only mode
      const args = [
        scriptPath,
        '--single-video', videoPath,
        '--analyze-only',
        '--frames-per-scene', '3', // Faster analysis
        '--box-strategy', 'largest',
        '--confidence', '0.25'
      ];
      
      const pythonProcess = spawn(pythonPath, args, { 
        cwd: path.join(__dirname, '../..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      return new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            try {
              // Extract JSON from output (it should be the last line)
              const lines = stdout.trim().split('\n');
              let jsonLine = '';
              
              // Find the line that looks like JSON (starts with { and ends with })
              for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].trim();
                if (line.startsWith('{') && line.endsWith('}')) {
                  jsonLine = line;
                  break;
                }
              }
              
              if (!jsonLine) {
                throw new Error('No JSON output found in Python script response');
              }
              
              // Parse the JSON output from the Python script
              const result = JSON.parse(jsonLine);
              
              if (result.success) {
                console.log('Smart crop analysis completed successfully');
                console.log(`Analysis type: ${result.type}`);
                
                if (result.type === 'multi') {
                  console.log(`Found ${result.source.scene_count} scenes with different crops`);
                  // Return the full multi-scene analysis
                  resolve(result);
                } else {
                  // Single crop - return just the crop for backward compatibility
                  resolve(result.crop);
                }
              } else {
                console.error('Smart crop analysis failed:', result.error);
                reject(new Error(`Smart crop analysis failed: ${result.error}`));
              }
            } catch (parseError) {
              console.error('Failed to parse Python script output:', parseError);
              console.error('Raw output:', stdout);
              reject(new Error('Failed to parse crop analysis results'));
            }
          } else {
            console.error('Python script failed with code:', code);
            console.error('Error output:', stderr);
            reject(new Error(`Smart crop analysis failed: ${stderr}`));
          }
        });
        
        pythonProcess.on('error', (err) => {
          console.error('Failed to start Python script:', err);
          reject(new Error(`Failed to start smart crop analysis: ${err.message}`));
        });
      });
      
    } catch (err) {
      console.error('Smart crop analysis error:', err);
      return null;
    }
  });

  /**
   * Register export-related IPC handlers.
   * Should be called from main.cjs during app bootstrap.
   */
ipcMain.handle('export:start', (event, { inputPath, preset, outputDir, crop }) => {
    const presetConf = EXPORT_PRESETS[preset];
    if (!presetConf) {
      throw new Error(`Unknown export preset: ${preset}`);
    }

    const outDirectory = outputDir || path.dirname(inputPath);
    const outName = `${path.parse(inputPath).name}_${preset}${presetConf.outExt}`;
    const outputPath = path.join(outDirectory, outName);

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);
      
      // Build the video filter chain properly
      let videoFilters = [];
      
      // Check if we have multi-scene crop data
      if (crop && crop.type === 'multi' && crop.scenes) {
        // Multi-scene cropping using timeline editing
        console.log(`Applying ${crop.scenes.length} different crops across scenes`);
        
        // For complex multi-scene processing, we'll use a simpler approach
        // that's more compatible with fluent-ffmpeg
        
        // Calculate an average/weighted crop position for now
        // This is a fallback approach that's more reliable
        let totalWeight = 0;
        let weightedX = 0;
        let weightedY = 0;
        let weightedW = 0;
        let weightedH = 0;
        
        for (const scene of crop.scenes) {
          const duration = scene.end_time - scene.start_time;
          weightedX += scene.crop.x * duration;
          weightedY += scene.crop.y * duration;
          weightedW += scene.crop.w * duration;
          weightedH += scene.crop.h * duration;
          totalWeight += duration;
        }
        
        // Calculate weighted average crop
        const avgCrop = {
          x: Math.round(weightedX / totalWeight),
          y: Math.round(weightedY / totalWeight),
          w: Math.round(weightedW / totalWeight),
          h: Math.round(weightedH / totalWeight)
        };
        
        console.log(`Using weighted average crop: ${avgCrop.w}x${avgCrop.h}+${avgCrop.x}+${avgCrop.y}`);
        
        // Apply the averaged crop (for now)
        videoFilters.push(`crop=${avgCrop.w}:${avgCrop.h}:${avgCrop.x}:${avgCrop.y}`);
        
        // Add scaling if needed
        if (presetConf.targetWidth && presetConf.targetHeight) {
          const cropAspectRatio = avgCrop.w / avgCrop.h;
          const targetAspectRatio = presetConf.targetWidth / presetConf.targetHeight;
          
          if (Math.abs(cropAspectRatio - targetAspectRatio) > 0.01) {
            videoFilters.push(`scale=${presetConf.targetWidth}:${presetConf.targetHeight}:force_original_aspect_ratio=decrease`);
            videoFilters.push(`pad=${presetConf.targetWidth}:${presetConf.targetHeight}:(ow-iw)/2:(oh-ih)/2:black`);
          } else {
            videoFilters.push(`scale=${presetConf.targetWidth}:${presetConf.targetHeight}`);
          }
          videoFilters.push('setsar=1:1');
        }
        
      } else if (crop && typeof crop === 'object' && crop.w) {
        // Single crop (backward compatibility)
        videoFilters.push(`crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`);
        
        // After cropping, only scale if the cropped dimensions don't match target exactly
        if (presetConf.targetWidth && presetConf.targetHeight) {
          const cropAspectRatio = crop.w / crop.h;
          const targetAspectRatio = presetConf.targetWidth / presetConf.targetHeight;
          
          if (Math.abs(cropAspectRatio - targetAspectRatio) > 0.01) {
            videoFilters.push(`scale=${presetConf.targetWidth}:${presetConf.targetHeight}:force_original_aspect_ratio=decrease`);
            videoFilters.push(`pad=${presetConf.targetWidth}:${presetConf.targetHeight}:(ow-iw)/2:(oh-ih)/2:black`);
          } else {
            videoFilters.push(`scale=${presetConf.targetWidth}:${presetConf.targetHeight}`);
          }
          videoFilters.push('setsar=1:1');
        }
      } else {
        // No crop specified - use simple scaling for backward compatibility
        if (presetConf.targetWidth && presetConf.targetHeight) {
          videoFilters.push(`scale=${presetConf.targetWidth}:${presetConf.targetHeight}`);
          videoFilters.push('setsar=1:1');
        }
      }
      
      // Apply the video filter chain if we have any filters
      if (videoFilters.length > 0) {
        command = command.videoFilters(videoFilters.join(','));
      }
      
      command
        .outputOptions(presetConf.ffmpegArgs)
        .on('progress', (progress) => {
          event.sender.send('export:progress', {
            percent: progress.percent || 0,
            fps: progress.currentFps || 0,
            eta: progress.timemark,
          });
        })
        .on('error', (err) => {
          event.sender.send('export:error', { message: err.message });
          reject(err);
        })
        .on('end', () => {
          event.sender.send('export:completed', { outputPath });
          resolve(outputPath);
        })
        .save(outputPath);
    });
  });

  /**
   * Shell helper: open a file in default app.
   * Renderer can also access shell via preload, but this provides a single API surface.
   */
  ipcMain.handle('export:openExternal', (_, filePath) => {
    shell.openPath(filePath);
  });
}

module.exports = { registerExportHandlers };
