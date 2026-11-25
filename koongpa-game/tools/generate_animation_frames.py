from __future__ import annotations

import math
from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = PROJECT_ROOT / "assets" / "processed"
OUTPUT_ROOT = PROJECT_ROOT / "assets" / "frames"

CHARACTERS = {
    "power": "power.png",
    "speed": "speed.png",
    "balance": "balance.png",
    "rival": "rival.png",
}

FRAME_COUNTS = {
    "idle": 5,
    "punch": 5,
    "kick": 5,
    "hit": 3,
    "jump": 2,
}


def transform_frame(image: Image.Image, category: str, index: int, count: int) -> Image.Image:
    base = image.convert("RGBA")
    phase = index / max(1, count - 1)
    wave = math.sin(phase * math.pi * 2)

    scale_x = 1.0
    scale_y = 1.0
    shift_x = 0.0
    shift_y = 0.0
    angle = 0.0

    if category == "idle":
        shift_y = 3 * wave
        scale_y = 1.0 + 0.006 * wave
    elif category == "punch":
        progress = 1.0 - abs(1.0 - phase * 2.0)
        shift_x = 16 * progress
        shift_y = -4 * progress
        angle = -3.5 * progress
    elif category == "kick":
        progress = 1.0 - abs(1.0 - phase * 2.0)
        shift_x = 12 * progress
        angle = 4.5 * progress
        scale_y = 1.0 - 0.035 * progress
    elif category == "hit":
        shift_x = -18 * (1.0 - phase)
        angle = -6 * (1.0 - phase)
        scale_x = 1.0 - 0.02 * (1.0 - phase)
    elif category == "jump":
        shift_y = -18 if index == 0 else 10
        scale_y = 1.08 if index == 0 else 0.94

    width = max(1, round(base.width * scale_x))
    height = max(1, round(base.height * scale_y))
    resized = base.resize((width, height), Image.Resampling.LANCZOS)
    transformed = resized.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)

    canvas = Image.new("RGBA", base.size, (0, 0, 0, 0))
    x = round((base.width - transformed.width) / 2 + shift_x)
    y = round((base.height - transformed.height) + shift_y)
    canvas.alpha_composite(transformed, (x, y))
    return canvas


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    for character, filename in CHARACTERS.items():
        source_path = ASSET_ROOT / filename
        if not source_path.exists():
            raise FileNotFoundError(source_path)
        source = Image.open(source_path)
        for category, count in FRAME_COUNTS.items():
            for index in range(1, count + 1):
                frame = transform_frame(source, category, index - 1, count)
                frame.save(
                    OUTPUT_ROOT / f"{character}_{category}_{index:02d}.png",
                    format="PNG",
                    optimize=True,
                )
    print(f"Generated 20 pose frames for each of {len(CHARACTERS)} characters in {OUTPUT_ROOT}")


if __name__ == "__main__":
    main()
