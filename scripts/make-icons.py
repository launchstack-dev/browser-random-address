#!/usr/bin/env python3
"""Draws the extension icons (a white map pin on a blue rounded square).

Dev-only: needs Pillow. The PNGs it writes to icons/ are committed, so nobody
installing or packaging the extension has to run this.
"""
from pathlib import Path
from PIL import Image, ImageDraw

SIZES = [16, 32, 48, 128]
BLUE = (26, 86, 219, 255)
WHITE = (255, 255, 255, 255)
CANVAS = 1024  # draw large, then downscale for smooth edges


def draw_master():
    img = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((64, 64, CANVAS - 64, CANVAS - 64), radius=200, fill=BLUE)
    cx, cy, r, tip_y = 512, 440, 240, 840
    # Tangent points of the pin tip: cos(phi) = r / distance(center, tip).
    d.polygon([(cx - 192, cy + 144), (cx + 192, cy + 144), (cx, tip_y)], fill=WHITE)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=WHITE)
    d.ellipse((cx - 96, cy - 96, cx + 96, cy + 96), fill=BLUE)
    return img


def main():
    out = Path(__file__).resolve().parent.parent / 'icons'
    out.mkdir(exist_ok=True)
    master = draw_master()
    for size in SIZES:
        master.resize((size, size), Image.LANCZOS).save(out / f'icon-{size}.png')
        print(f'icons/icon-{size}.png')


if __name__ == '__main__':
    main()
