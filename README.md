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

## 🚀 Future Roadmap

### Phase 1: Enhanced Video Management (Q1 2025)
- **Advanced Search & Filtering**
  - Full-text search in video metadata and transcriptions
  - Filter by duration, resolution, aspect ratio, codec
  - Smart filters for social media platform requirements
  - Saved search presets
  
- **Thumbnail & Preview System**
  - Automatic thumbnail generation with customizable intervals
  - Hover preview with timeline scrubbing
  - Thumbnail caching for performance
  - Custom thumbnail selection from video frames
  
- **Collection Management**
  - Create custom collections/playlists
  - Smart collections based on rules
  - Nested folder organization
  - Bulk metadata editing

### Phase 2: Social Media Integration (Q2 2025)
- **Platform-Specific Export**
  - One-click export optimized for Instagram Reels, TikTok, YouTube Shorts
  - Platform-specific compression and format settings
  - Automatic aspect ratio conversion with smart cropping
  - Batch export with queue management
  
- **Content Calendar Integration**
  - Built-in content calendar view
  - Schedule posts across multiple platforms
  - Integration with Buffer, Hootsuite, Later APIs
  - Draft management system
  
- **Analytics Dashboard**
  - Track video performance across platforms
  - Import analytics from social media APIs
  - Performance insights and recommendations
  - A/B testing support for different video versions

### Phase 3: AI-Powered Features (Q3 2025)
- **Smart Content Analysis**
  - Automatic scene detection and segmentation
  - Face detection and tracking for better cropping
  - Object recognition for auto-tagging
  - Speech-to-text transcription
  - Sentiment analysis for content categorization
  
- **AI-Assisted Editing**
  - Auto-generate highlights from longer videos
  - Smart transitions and effects suggestions
  - Background music recommendations
  - Automatic color grading presets
  - Content-aware video stabilization
  
- **Content Suggestions**
  - Trending audio/music integration
  - Hashtag recommendations based on content
  - Optimal posting time suggestions
  - Competitor analysis features

### Phase 4: Advanced Editing Suite (Q4 2025)
- **Professional Editing Tools**
  - Multi-track timeline editor
  - Advanced color correction and grading
  - Audio mixing and enhancement
  - Motion graphics and text overlays
  - Green screen/chroma key support
  - Speed ramping and time remapping
  
- **Effects & Transitions Library**
  - Extensive preset library
  - Custom effect creation
  - Community effect marketplace
  - Real-time preview rendering
  
- **Template System**
  - Pre-built social media templates
  - Custom template creation
  - Brand kit integration
  - Dynamic template variables

### Phase 5: Collaboration & Cloud Features (Q1 2026)
- **Team Collaboration**
  - Multi-user workspace support
  - Role-based permissions
  - Real-time collaboration on projects
  - Comment and annotation system
  - Version control for video projects
  
- **Cloud Integration**
  - Optional cloud backup and sync
  - Cross-device project access
  - Cloud rendering for heavy tasks
  - Integration with cloud storage providers
  - Progressive web app (PWA) version
  
- **Review & Approval Workflow**
  - Client review portals
  - Approval workflows
  - Watermarked preview sharing
  - Time-coded feedback system

### Phase 6: Mobile & Ecosystem Expansion (Q2 2026)
- **Mobile Companion Apps**
  - iOS and Android apps for quick edits
  - Remote control for desktop app
  - Mobile capture with instant sync
  - On-the-go content creation
  
- **Plugin Ecosystem**
  - Plugin API for third-party developers
  - Official plugin marketplace
  - Integration with popular tools (Adobe, DaVinci, etc.)
  - Custom workflow automation
  
- **Hardware Integration**
  - External monitor support for preview
  - Control surface/jog wheel support
  - Capture card integration
  - Professional audio interface support

### Long-term Vision (2026+)
- **Machine Learning Pipeline**
  - Custom ML model training for specific use cases
  - Automated content moderation
  - Brand safety checks
  - Personalized editing suggestions
  
- **Enterprise Features**
  - SSO and enterprise authentication
  - Advanced audit logging
  - Compliance tools (GDPR, CCPA)
  - SLA support options
  - White-label solutions
  
- **Content Monetization**
  - Direct platform monetization integration
  - Sponsorship management tools
  - Revenue analytics and reporting
  - Rights management system

### Technical Roadmap
- **Performance Optimization**
  - GPU acceleration for video processing
  - WebAssembly for compute-intensive tasks
  - Lazy loading and virtualization
  - Background processing queue
  
- **Architecture Evolution**
  - Microservices architecture for scalability
  - GraphQL API for flexible data fetching
  - Event-driven architecture
  - Real-time sync with WebRTC
  
- **Cross-Platform Enhancement**
  - Native macOS features (Metal acceleration)
  - Linux optimization
  - ARM processor support
  - Progressive enhancement strategy

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
