/**
 * Pre-defined export/transcode settings for popular social-media platforms.
 *
 * Each preset provides FFmpeg arguments that follow the input (`-i {input}`)
 * and produce a ready-to-upload MP4.
 *
 * If you need to tweak quality/bitrate later, change the `ffmpegArgs` array.
 */

export type PresetKey = 'instagramReel' | 'tiktok' | 'twitter';

export interface ExportPreset {
  /** UX label shown to the user */
  label: string;
  /** Short human-friendly description */
  description: string;
  /** Desired output extension (include leading dot!) */
  outExt: string;
  /** Raw FFmpeg arguments appended after the input file */
  ffmpegArgs: string[];
}

/**
 * Map of presets keyed by an internal enum-like string.
 */
export const EXPORT_PRESETS: Record<PresetKey, ExportPreset> = {
  instagramReel: {
    label: 'Instagram Reels',
    description: '1080×1920 vertical, 30 fps, ≤60 s',
    outExt: '.mp4',
    ffmpegArgs: [
      '-vf', 'scale=1080:1920,setsar=1:1',
      '-r', '30',
      '-c:v', 'libx264', '-profile:v', 'high', '-crf', '23',
      '-preset', 'veryfast',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart'
    ]
  },

  tiktok: {
    label: 'TikTok',
    description: '1080×1920 vertical, 24 fps, ≤60 s',
    outExt: '.mp4',
    ffmpegArgs: [
      '-vf', 'scale=1080:1920,setsar=1:1',
      '-r', '24',
      '-c:v', 'libx264', '-profile:v', 'high', '-crf', '25',
      '-preset', 'veryfast',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart'
    ]
  },

  twitter: {
    label: 'Twitter',
    description: '1280×720 landscape, 30 fps',
    outExt: '.mp4',
    ffmpegArgs: [
      '-vf', 'scale=1280:720,setsar=1:1',
      '-r', '30',
      '-c:v', 'libx264', '-profile:v', 'high', '-crf', '23',
      '-preset', 'veryfast',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart'
    ]
  }
};
