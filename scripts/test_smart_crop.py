#!/usr/bin/env python3
"""Test script for smart crop analysis."""

import sys
from pathlib import Path

# Add the scripts directory to path to import the main module
sys.path.append(str(Path(__file__).parent))

from smart_vertical_crop import analyze_crop_coordinates, parse_args


def test_smart_crop(video_path: str):
    """Test the smart crop analysis on a single video."""
    video = Path(video_path)
    
    if not video.exists():
        print(f"Error: Video file {video_path} does not exist")
        return False
    
    print(f"Testing smart crop analysis on: {video}")
    
    # Create args namespace with default values
    class Args:
        frames_per_scene = 3
        confidence = 0.25
        box_strategy = 'largest'
        padding = 0.05
    
    args = Args()
    
    try:
        result = analyze_crop_coordinates(video, args)
        print("Analysis result:")
        print(f"Success: {result.get('success', False)}")
        
        if result.get('success'):
            crop = result['crop']
            source = result['source']
            print(f"Source dimensions: {source['width']}x{source['height']}")
            print(f"Crop: {crop['w']}x{crop['h']} at ({crop['x']}, {crop['y']})")
            print(f"Confidence: {crop['confidence']:.2f}")
        else:
            print(f"Error: {result.get('error', 'Unknown error')}")
        
        return result.get('success', False)
        
    except Exception as e:
        print(f"Exception during analysis: {e}")
        return False


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python test_smart_crop.py <video_path>")
        sys.exit(1)
    
    video_path = sys.argv[1]
    success = test_smart_crop(video_path)
    sys.exit(0 if success else 1) 