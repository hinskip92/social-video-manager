# Plan for "Chat with Video" Feature

This plan outlines the steps to implement a "Chat with Video" feature using Google's Gemini 2.5 Pro for video understanding.

## Phase 1: Research and Documentation

1.  **Understand Gemini Video API:**
    *   Use Context7 to search for Python documentation for "Google Gemini 2.5 Pro Video Understanding".
    *   Identify how to authenticate, send video data (file vs. stream), and structure prompts for question-answering.

## Phase 2: Backend Implementation

1.  **Setup Environment:**
    *   Ensure Python is set up with necessary libraries for interacting with the Gemini API (e.g., `google-generativeai`). I'll add this to `requirements.txt`.
    *   Instruct the user to add their `GEMINI_API_KEY` to the `.env` file.

2.  **Create Video Chat Script:**
    *   Create a new Python script: `scripts/video_chat.py`.
    *   This script will:
        *   Load the Gemini API key from environment variables.
        *   Accept a video file path and a text prompt as command-line arguments.
        *   Use the Gemini Pro Vision model to process the video and the prompt.
        *   Print the model's generated text response to standard output.

3.  **Integrate with Electron Backend:**
    *   Create a new IPC handler file: `electron/ipc/videoChat.cjs`.
    *   In `electron/main.cjs`, register a new IPC handler for `'video-chat'`.
    *   This handler will:
        *   Receive the video file path and user question from the frontend.
        *   Use Node.js `child_process.spawn()` to execute the `scripts/video_chat.py` script.
        *   Pass the video path and question as arguments.
        *   Capture the script's stdout (the model's response).
        *   Return the response to the frontend.
        *   Handle any errors from the Python script.

## Phase 3: Frontend Implementation

1.  **"Chat with Video" Button:**
    *   Analyze the existing UI, particularly in `src/pages/VideoPlayer.tsx` and `src/pages/VideoEditor.tsx`, to determine the best location for a "Chat with Video" button.
    *   Add the button to the chosen component.

2.  **Chat Interface Component:**
    *   Create a new React component: `src/components/VideoChatModal.tsx`.
    *   This component will be a modal that overlays the current view.
    *   It will feature:
        *   A display area for the conversation history (user questions and AI responses).
        *   A text input field for the user to ask questions.
        *   A "Send" button.
    *   The modal will be controlled by a state variable (e.g., `isChatOpen`) in the parent component.

3.  **Connect UI to Backend:**
    *   The "Chat with Video" button's `onClick` handler will open the `VideoChatModal` and pass the current video's file path as a prop.
    *   Inside the `VideoChatModal`, when a user submits a question:
        *   A function will be called to send the message to the backend.
        *   This function will use `window.electron.ipcRenderer.invoke('video-chat', { videoPath, question })`.
        *   The component will display a loading indicator while waiting for the response.
        *   Once the response is received, it will be added to the conversation history, and the loading indicator will be hidden.
        *   Error handling will be implemented for failed API calls.

## Phase 4: Final Touches

1.  **API Key Instructions:**
    *   Update `README.md` with instructions on how to obtain a Gemini API key and add it to the `.env` file as `GEMINI_API_KEY`.
2.  **Dependencies:**
    *   Update `requirements.txt` with the `google-generativeai` package.
3.  **Testing:**
    *   Perform end-to-end testing of the feature with a sample video.
    *   Test loading states and error handling. 