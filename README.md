# Social Video Manager

A local, interactive social media video asset manager built with React and Electron. This application allows you to manage multiple directories containing video files, view metadata, and play videos directly within the app.

This project is under active development and many planned features are still a work in progress.

## Project Status

### ✅ Implemented Features

- **Core Functionality**
  - ✅ Add/remove directories through a user-friendly sidebar
  - ✅ Video library display with metadata (filename, size, dates)
  - ✅ In-app video playback with ReactPlayer
  - ✅ Grid view with video cards
  - ✅ Dark/light mode support
  - ✅ Search functionality for videos
  - ✅ Sort videos by name or date
  - ✅ Video categorization and tagging system
  - ✅ Open videos in system default player (fallback option)
  - ✅ Responsive layout that works on various screen sizes

- **Technical Implementation**
  - ✅ React with TypeScript for type safety
  - ✅ Electron integration for desktop application
  - ✅ IPC communication between Electron main and renderer processes
  - ✅ Tailwind CSS for styling
  - ✅ Context API for state management
  - ✅ URL-safe video ID generation for routing
  - ✅ Basic automated testing setup with Vitest

- **Fixed Issues**
  - ✅ URL-safe routing to handle video navigation
  - ✅ Fixed video playback issues with proper file path handling
  - ✅ Graceful error handling for missing files/permissions
  - ✅ Dark mode toggle with persistent settings
  - ✅ Adaptive layout for desktop use

### 🚧 Pending Tasks

- **Features**
  - 🚧 Enable video thumbnails generation (backend ffmpeg support added)
  - 🚧 Multiple video selection for batch operations
  - ✅ Video editing capabilities (trim, crop, etc.)
  - ✅ Intelligent crop detection for social-media export
  - 🚧 Export/share functionality for social media platforms
  - 🚧 Recent files list
  - 🚧 Favorites/bookmarks for frequently used videos

- **Technical Improvements**
  - 🚧 Expand test coverage with Vitest
  - 🚧 Offline capability improvements
  - 🚧 Performance optimization for large video libraries
  - 🚧 Better error handling with user-friendly messages
  - 🚧 Proper logging system
  - 🚧 Application settings storage
  - 🚧 Cross-platform packaging and distribution (electron-builder configured)

## Setup and Installation

### Prerequisites
- Node.js (v16+)
- npm (v8+)

### Installation Steps

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/social-video-manager.git
   cd social-video-manager
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Development:
   ```
   npm run dev     # Start Vite development server
   npm run electron # Start Electron app
   ```

   Or run both concurrently (if you're not using Windows PowerShell):
   ```
   npm run electron:dev
   ```

4. Build for production:
   ```
   npm run electron:build
   ```

## Usage Guide

### Adding Directories
1. Click the folder icon in the sidebar
2. Navigate to a directory containing video files
3. Select the directory and click "Open"

### Viewing Videos
- Videos will appear in the main view area
- Use the search box to filter videos by name
- Click column headers to sort by name or date

### Playing Videos
- Click on a video card to open the video player
- Use the standard video controls for playback
- If in-app playback fails, use the "Open in Default Player" button

### Managing Directories
- Go to settings to manage directories
- Remove directories you no longer need with the trash icon

## Troubleshooting

### Video Playback Issues
- Ensure you have the necessary codecs installed for your video formats
- Try opening the video in your system's default player
- Check file permissions to ensure the app can read the video files

### Application Crashes
- Check the console for error messages
- Verify you have the latest version of the application
- Ensure your system meets the minimum requirements

## Technical Details

### Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS
- **Video Playback**: ReactPlayer
- **Desktop Integration**: Electron
- **Build Tools**: Vite, Electron Builder

### Architecture
The application uses a layered architecture:
- **UI Layer**: React components and Tailwind CSS
- **State Management**: React Context API
- **File System Access**: Electron's IPC for communication with Node.js
- **Video Handling**: ReactPlayer for playback, with fallback to system default

## Python Utilities

### Smart Auto-Crop Script

This repository includes a standalone Python script located at
`scripts/smart_vertical_crop.py` that converts 16:9 landscape videos into
9:16 vertical clips. It uses **PySceneDetect** to split each input video into
scenes and **YOLOv8** to detect people so the crop can follow the primary
subject.

Below is a quick tutorial for running the script.

### Tutorial

1. **Install the dependencies** and make sure `ffmpeg` is available on your
   system path:

   ```bash
   pip install -r requirements.txt
   ```

2. **Prepare the directories.** Create the following folders next to the
   repository (or specify them with CLI options):

   ```text
   input_videos/    # put your 16:9 source videos here
   output_videos/   # final vertical videos will be written here
   temp_scenes/     # scenes detected by PySceneDetect
   temp_frames/     # frames extracted for YOLO analysis
   cropped_scenes/  # cropped scene files before concatenation
   ```

3. **Add your footage** to `input_videos/`. Any `.mp4`, `.mov`, `.mkv`, or `.avi`
   file will be processed.

4. **Run the script**. The example below uses the defaults but you can add any
   of the optional flags:

   ```bash
   python scripts/smart_vertical_crop.py \
       --frames-per-scene 5 \
       --box-strategy largest
   ```

   Use `--help` to see all available options, including how to pick the best
   subject box strategy, scale the final output, or overwrite existing files.

5. **Review the results.** Cropped vertical scenes are concatenated into a
   single output video saved in `output_videos/` with `_vertical` appended to the
   original filename.

## License
MIT
