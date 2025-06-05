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
 * Process multi-scene video with individual crops per scene
 */
async function processMultiSceneVideo(inputPath, crop, presetConf, outputPath, event) {
  const { spawn } = require('child_process');
  const fs = require('fs');
  
  try {
    // Try a more direct approach using ffmpeg to split scenes based on timestamps
    console.log(`Processing ${crop.scenes.length} scenes using timestamp-based splitting...`);
    event.sender.send('export:progress', { 
      percent: 5, 
      fps: 0, 
      eta: `Preparing to process ${crop.scenes.length} scenes...` 
    });
    
    // Step 1: Create temp directories
    const tempDir = path.join(__dirname, '../../temp_scenes');
    const processedDir = path.join(__dirname, '../../temp_processed');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }
    
    const processedScenes = [];
    
    // Step 2: Process each scene directly using timestamps (no PySceneDetect splitting needed)
    console.log('Processing scenes directly using timestamps...');
    
    for (let i = 0; i < crop.scenes.length; i++) {
      const scene = crop.scenes[i];
      const progress = 10 + (i / crop.scenes.length) * 75; // 10-85% for scene processing
      const sceneStartTime = scene.start_time.toFixed(3);
      const sceneEndTime = scene.end_time.toFixed(3);
      const sceneDuration = (scene.end_time - scene.start_time).toFixed(3);
      
      console.log(`Processing scene ${i + 1}/${crop.scenes.length}: ${sceneStartTime}s-${sceneEndTime}s (${sceneDuration}s)`);
      
      event.sender.send('export:progress', { 
        percent: progress, 
        fps: 0, 
        eta: `Scene ${i + 1}/${crop.scenes.length} (${sceneStartTime}s-${sceneEndTime}s)` 
      });
      
      const processedFile = path.join(processedDir, `scene_${i + 1}_processed.mp4`);
      
      // Build video filters for this scene
      let sceneFilters = [];
      sceneFilters.push(`crop=${scene.crop.w}:${scene.crop.h}:${scene.crop.x}:${scene.crop.y}`);
      
      // Add scaling
      if (presetConf.targetWidth && presetConf.targetHeight) {
        const cropAspectRatio = scene.crop.w / scene.crop.h;
        const targetAspectRatio = presetConf.targetWidth / presetConf.targetHeight;
        
        if (Math.abs(cropAspectRatio - targetAspectRatio) > 0.01) {
          sceneFilters.push(`scale=${presetConf.targetWidth}:${presetConf.targetHeight}:force_original_aspect_ratio=decrease`);
          sceneFilters.push(`pad=${presetConf.targetWidth}:${presetConf.targetHeight}:(ow-iw)/2:(oh-ih)/2:black`);
        } else {
          sceneFilters.push(`scale=${presetConf.targetWidth}:${presetConf.targetHeight}`);
        }
        sceneFilters.push('setsar=1:1');
      }
      
      // Process this scene directly from the original video using timestamps
      console.log(`Applying crop ${scene.crop.w}x${scene.crop.h}+${scene.crop.x}+${scene.crop.y} to scene ${i + 1}`);
      
      await new Promise((resolve, reject) => {
        const command = ffmpeg(inputPath)
          .seekInput(scene.start_time)
          .duration(scene.end_time - scene.start_time)
          .videoFilters(sceneFilters.join(','))
          .outputOptions(presetConf.ffmpegArgs)
          .on('progress', (sceneProgress) => {
            // Update progress within this scene
            const scenePercent = (sceneProgress.percent || 0) / 100;
            const overallProgress = progress + (scenePercent * (75 / crop.scenes.length));
            event.sender.send('export:progress', { 
              percent: overallProgress, 
              fps: sceneProgress.currentFps || 0, 
              eta: `Scene ${i + 1}/${crop.scenes.length}: ${(sceneProgress.percent || 0).toFixed(1)}%` 
            });
          })
          .on('error', (err) => {
            console.error(`Error processing scene ${i + 1}:`, err);
            reject(err);
          })
          .on('end', () => {
            console.log(`Completed scene ${i + 1}/${crop.scenes.length}`);
            resolve();
          })
          .save(processedFile);
      });
      
      processedScenes.push(processedFile);
    }
    
    // Step 3: Concatenate all processed scenes
    console.log(`Concatenating ${processedScenes.length} processed scenes...`);
    event.sender.send('export:progress', { 
      percent: 90, 
      fps: 0, 
      eta: `Combining ${processedScenes.length} scenes into final video...` 
    });
    
    const listFile = path.join(processedDir, 'filelist.txt');
    const listContent = processedScenes.map(f => `file '${f.replace(/'/g, "\\'")}'`).join('\n');
    fs.writeFileSync(listFile, listContent);
    
    console.log(`Final concatenation: ${processedScenes.length} scenes -> ${outputPath}`);
    
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(listFile)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy'])
        .on('progress', (progress) => {
          const percent = 90 + (progress.percent || 0) * 0.1; // 90-100%
          event.sender.send('export:progress', {
            percent,
            fps: progress.currentFps || 0,
            eta: `Final assembly: ${(progress.percent || 0).toFixed(1)}%`,
          });
        })
        .on('error', reject)
        .on('end', () => {
          console.log('Multi-scene processing completed successfully!');
          resolve();
        })
        .save(outputPath);
    });
    
    // Cleanup
    try {
      fs.unlinkSync(listFile);
      processedScenes.forEach(f => {
        try { fs.unlinkSync(f); } catch (e) {}
      });
    } catch (e) {
      console.warn('Cleanup warning:', e.message);
    }
    
    event.sender.send('export:completed', { outputPath });
    return outputPath;
    
  } catch (error) {
    console.error('Multi-scene processing error:', error);
    event.sender.send('export:error', { message: error.message });
    throw error;
  }
}

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
        // True per-scene cropping using scene-by-scene processing
        console.log(`Processing ${crop.scenes.length} scenes individually with different crops`);
        
        // Use the scene-by-scene processing approach
        return processMultiSceneVideo(inputPath, crop, presetConf, outputPath, event);
        
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
