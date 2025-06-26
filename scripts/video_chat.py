import os
import sys
from google import genai
from dotenv import load_dotenv
import time
import json
import hashlib


# Cache file to store uploaded video references
CACHE_FILE = os.path.join(os.path.dirname(__file__), ".video_cache.json")


def get_file_hash(file_path):
    """Generate a hash for the video file to use as a cache key."""
    hasher = hashlib.md5()
    with open(file_path, 'rb') as f:
        # Read in chunks to handle large files
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def load_cache():
    """Load the cache of uploaded files."""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}


def save_cache(cache):
    """Save the cache of uploaded files."""
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache, f, indent=2)


def main():
    """
    This script takes a video file and a question, uploads the video to the
    Gemini API (or reuses a previously uploaded file), generates content based 
    on the video and question, and prints the response.
    """
    load_dotenv()

    # Check for API key
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in environment variables.", file=sys.stderr)
        sys.exit(1)

    # Create the Gemini client
    client = genai.Client(api_key=api_key)

    # Check for command line arguments
    if len(sys.argv) != 3:
        print(f"Usage: python {sys.argv[0]} <video_path> \"<question>\"", file=sys.stderr)
        sys.exit(1)

    video_path = sys.argv[1]
    question = sys.argv[2]

    if not os.path.exists(video_path):
        print(f"Error: Video file not found at {video_path}", file=sys.stderr)
        sys.exit(1)

    # Load cache
    cache = load_cache()
    
    # Get file hash
    file_hash = get_file_hash(video_path)
    cache_key = f"{file_hash}_{os.path.basename(video_path)}"
    
    video_file = None
    try:
        # Check if file is already uploaded
        if cache_key in cache:
            file_name = cache[cache_key]
            print(f"Using cached file: {file_name}", file=sys.stderr)
            try:
                # Try to get the file to verify it still exists using client API
                files_list = client.files.list()
                video_file = None
                for file_obj in files_list:
                    if file_obj.name == file_name:
                        video_file = file_obj
                        break
                
                if video_file and video_file.state.name == "ACTIVE":
                    print("Cached file is active and ready to use.", file=sys.stderr)
                else:
                    if video_file:
                        print(f"Cached file state: {video_file.state.name}", file=sys.stderr)
                    # If not active or not found, we'll re-upload below
                    video_file = None
            except Exception as e:
                print(f"Cached file not found or expired, will re-upload: {e}", file=sys.stderr)
                video_file = None
                # Remove from cache
                del cache[cache_key]
                save_cache(cache)
        
        # Upload if not cached or cache miss
        if video_file is None:
            print(f"Uploading file: {video_path}...", file=sys.stderr)
            video_file = client.files.upload(file=video_path)
            print(f"Completed upload: {video_file.name}", file=sys.stderr)
            
            # Save to cache
            cache[cache_key] = video_file.name
            save_cache(cache)

            # Wait for the file to be processed
            print("Processing video...", file=sys.stderr)
            while video_file.state.name == "PROCESSING":
                time.sleep(10)
                # Refresh the file status by finding it in the files list
                files_list = client.files.list()
                for file_obj in files_list:
                    if file_obj.name == video_file.name:
                        video_file = file_obj
                        break
                print(".", end="", file=sys.stderr, flush=True)
            print("\nVideo processing complete.", file=sys.stderr)

            if video_file.state.name == "FAILED":
                raise ValueError(f"Video processing failed: {video_file.state}")

        # Generate content using the client API.
        # Using Gemini 2.0 Flash as it's optimized for video understanding.
        # As per docs, for optimal results, place the text prompt after the video part.
        print("Generating response...", file=sys.stderr)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[video_file, question]
        )

        # Print the response to stdout
        print(response.text)

    except Exception as e:
        print(f"An error occurred: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main() 