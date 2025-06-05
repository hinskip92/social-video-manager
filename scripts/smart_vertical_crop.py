#!/usr/bin/env python3
"""Smart auto-crop landscape videos into vertical format.

This script detects scenes in input videos, samples frames from each scene
for subject detection using YOLOv8, calculates a static crop window per scene,
and outputs a concatenated vertical video.
"""

from __future__ import annotations

import argparse
import subprocess
from glob import glob
from pathlib import Path
from typing import List, Tuple

import cv2
import numpy as np
from tqdm import tqdm
from ultralytics import YOLO


DEFAULT_EXTENSIONS = {'.mp4', '.mov', '.mkv', '.avi'}

TEMP_SCENES_DIR = Path('temp_scenes')
TEMP_FRAMES_DIR = Path('temp_frames')
CROPPED_SCENES_DIR = Path('cropped_scenes')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Smart auto-crop landscape videos into vertical format.'
    )
    parser.add_argument('--input', type=Path, default=Path('input_videos'))
    parser.add_argument('--output', type=Path, default=Path('output_videos'))
    parser.add_argument('--frames-per-scene', type=int, default=5)
    parser.add_argument('--padding', type=float, default=0.05)
    parser.add_argument('--confidence', type=float, default=0.25)
    parser.add_argument(
        '--box-strategy',
        choices=['largest', 'centered'],
        default='largest',
        help='How to pick the best subject box per frame.'
    )
    parser.add_argument('--overwrite', action='store_true')
    parser.add_argument(
        '--scale',
        help='Optional final resolution WIDTHxHEIGHT, e.g. 1080x1920'
    )
    return parser.parse_args()


model = YOLO('yolov8n.pt')


def ensure_dirs(input_dir: Path, output_dir: Path) -> None:
    """Create required directories."""
    for d in [input_dir, TEMP_SCENES_DIR, TEMP_FRAMES_DIR, CROPPED_SCENES_DIR, output_dir]:
        d.mkdir(parents=True, exist_ok=True)


def run_scenedetect(video: Path) -> List[Path]:
    """Run PySceneDetect on the given video and return list of scene file paths."""
    subprocess.run([
        'scenedetect',
        '-i', str(video),
        '-o', str(TEMP_SCENES_DIR),
        'detect-content',
        'split-video'
    ], check=True)
    pattern = TEMP_SCENES_DIR / f"{video.stem}*Scene*mp4"
    return sorted(Path(p) for p in glob(str(pattern)))


def sample_frames(scene: Path, frames_per_scene: int) -> Tuple[int, int, List[np.ndarray]]:
    """Return width, height and a list of sampled frames from the scene."""
    cap = cv2.VideoCapture(str(scene))
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frames = []
    for i in range(frames_per_scene):
        idx = int((i + 1) * frame_count / (frames_per_scene + 1))
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if ret:
            frames.append(frame)
    cap.release()
    return width, height, frames


def _pick_box(boxes: np.ndarray, frame_center: float, strategy: str) -> np.ndarray | None:
    if boxes.size == 0:
        return None
    if strategy == 'largest':
        areas = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
        return boxes[int(np.argmax(areas))]
    centers = (boxes[:, 0] + boxes[:, 2]) / 2
    idx = int(np.argmin(np.abs(centers - frame_center)))
    return boxes[idx]


def detect_center(
    frames: List[np.ndarray],
    frame_width: int,
    conf: float,
    strategy: str,
) -> float:
    """Return the averaged x-center for detected subjects."""
    results = model.predict(frames, conf=conf, verbose=False)
    centers = []
    for res in results:
        boxes = res.boxes
        mask = (boxes.cls == 0)
        person_boxes = boxes.xyxy[mask].cpu().numpy()
        chosen = _pick_box(person_boxes, frame_width / 2, strategy)
        if chosen is not None:
            centers.append((chosen[0] + chosen[2]) / 2)
    if not centers:
        return frame_width / 2
    return float(np.mean(centers))


def calc_crop(width: int, height: int, center_x: float, padding: float) -> Tuple[int, int, int, int]:
    """Calculate crop parameters (w,h,x,y)."""
    crop_w = int(height * 9 / 16)
    crop_w = min(crop_w, width)
    pad_px = int(crop_w * padding)
    crop_w = crop_w - 2 * pad_px
    x = int(center_x - crop_w / 2)
    x = max(0, min(x, width - crop_w))
    return crop_w, height, x, 0


def crop_scene(scene: Path, crop_params: Tuple[int, int, int, int], scale: str | None) -> Path:
    """Crop the scene with ffmpeg and return the output path."""
    out_path = CROPPED_SCENES_DIR / scene.name
    crop_w, crop_h, x, y = crop_params
    filt = f"crop={crop_w}:{crop_h}:{x}:{y}"
    if scale:
        filt = f"{filt},scale={scale}"
    cmd = [
        'ffmpeg', '-y', '-i', str(scene),
        '-vf', filt,
        '-c:a', 'copy', str(out_path)
    ]
    subprocess.run(cmd, check=True)
    return out_path


def concat_scenes(scenes: List[Path], output: Path) -> None:
    """Concatenate cropped scenes into final video."""
    list_file = output.parent / 'filelist.txt'
    with open(list_file, 'w', encoding='utf-8') as f:
        for s in scenes:
            f.write(f"file '{s.resolve()}'\n")
    subprocess.run([
        'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
        '-i', str(list_file), '-c', 'copy', str(output)
    ], check=True)
    list_file.unlink()


def process_video(video: Path, args: argparse.Namespace) -> None:
    output_path = args.output / f"{video.stem}_vertical.mp4"
    if output_path.exists() and not args.overwrite:
        print(f"Skipping {video.name}, output exists")
        return

    print(f"Processing {video.name}")
    scenes = run_scenedetect(video)
    cropped_scenes: List[Path] = []
    for scene in tqdm(scenes, desc='Scenes', unit='scene'):
        width, height, frames = sample_frames(scene, args.frames_per_scene)
        center = detect_center(frames, width, args.confidence, args.box_strategy)
        crop_params = calc_crop(width, height, center, args.padding)
        cropped = crop_scene(scene, crop_params, args.scale)
        cropped_scenes.append(cropped)
    concat_scenes(cropped_scenes, output_path)
    print(f"Saved {output_path}")


def main() -> None:
    args = parse_args()
    ensure_dirs(args.input, args.output)
    videos = [v for v in args.input.glob('*') if v.suffix.lower() in DEFAULT_EXTENSIONS]
    for video in videos:
        process_video(video, args)


if __name__ == '__main__':
    main()
