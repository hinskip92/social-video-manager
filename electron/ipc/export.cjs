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
    ffmpegArgs: [
      '-vf', 'scale=1080:1920,setsar=1:1',
      '-r', '30',
      '-c:v', 'libx264', '-profile:v', 'high', '-crf', '23',
      '-preset', 'veryfast',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
    ],
  },
  tiktok: {
    outExt: '.mp4',
    ffmpegArgs: [
      '-vf', 'scale=1080:1920,setsar=1:1',
      '-r', '24',
      '-c:v', 'libx264', '-profile:v', 'high', '-crf', '25',
      '-preset', 'veryfast',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
    ],
  },
  twitter: {
    outExt: '.mp4',
    ffmpegArgs: [
      '-vf', 'scale=1280:720,setsar=1:1',
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
   * Runs FFmpeg cropdetect on first 5s and returns median crop values.
   */
  ipcMain.handle('export:analyzeCrop', async (_, videoPath) => {
    try {
      // Run cropdetect over the first 5 seconds using bundled ffmpeg
      const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
      const args = [
        '-ss', '0',
        '-i', videoPath,
        '-t', '5',
        '-vf', 'cropdetect=24:16:0',
        '-an',
        '-f', 'null',
        '-'
      ];
      const { stderr } = spawnSync(ffmpegPath, args, { encoding: 'utf8' });
      if (typeof stderr !== 'string') {
        throw new Error(`ffmpeg stderr was not a string. ${stderr}`);
      }
      // Extract crop=WxH:X:Y matches
      const matches = stderr.match(/crop=\\d+:\\d+:\\d+:\\d+/g) || [];
      if (matches.length === 0) return null;
      // Tally occurrences
      const tally = matches.reduce((acc, m) => { acc[m] = (acc[m] || 0) + 1; return acc; }, {});
      // Pick the most frequent
      const best = Object.entries(tally).sort((a,b) => b[1] - a[1])[0][0];
      const [, w, h, x, y] = best.match(/crop=(\\d+):(\\d+):(\\d+):(\\d+)/);
      const confidence = tally[best] / matches.length;
      return { w: Number(w), h: Number(h), x: Number(x), y: Number(y), confidence };
    } catch (err) {
      console.error('Crop analysis error:', err);
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
      if (crop && typeof crop === 'object') {
        command = command.videoFilters(`crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`);
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
