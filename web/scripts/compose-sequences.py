"""Lay out actual camera captures without changing the rendered scene pixels.

Usage: python3 scripts/compose-sequences.py CAPTURE_DIRECTORY [FONT_TTF]
Requires Pillow. All frames are rendered at 1600 x 1200; columns share their
original framing, and rows in the dual-view sheet share simulation timestamps.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(sys.argv[1])
states = json.loads((root / "states.json").read_text())
font_path = sys.argv[2] if len(sys.argv) > 2 else "DejaVuSans.ttf"
font = ImageFont.truetype(font_path, 76)
small = ImageFont.truetype(font_path, 52)
title_font = ImageFont.truetype(font_path, 100)
W, H, GAP, LEFT, TOP, LABEL = 1600, 1200, 16, 160, 180, 170

for task, title in [("usb", "USB-C insertion"), ("charger", "Charger-to-power-strip insertion")]:
    samples = sorted((s for s in states if s["task"] == task), key=lambda s: s["index"])
    start = samples[0]["snapshot"]["time"]
    for layout, indices, views in [
        ("4x1", [0, 1, 4, 6], ["global"]),
        ("7x1", list(range(7)), ["global"]),
        ("7x2", list(range(7)), ["global", "wrist"]),
    ]:
        width = LEFT + len(indices) * (W + GAP)
        height = TOP + len(views) * (H + LABEL + GAP) + 100
        sheet = Image.new("RGB", (width, height), "white")
        draw = ImageDraw.Draw(sheet)
        draw.text((LEFT, 24), f"CarryQ  |  {title}", fill="#23302c", font=title_font)
        for row, view in enumerate(views):
            y = TOP + row * (H + LABEL + GAP)
            row_label = Image.new("RGBA", (400, 105), (255, 255, 255, 0))
            ImageDraw.Draw(row_label).text((0, 0), "GLOBAL" if view == "global" else "WRIST", fill="#334b46", font=font)
            row_label = row_label.rotate(90, expand=True)
            sheet.paste(row_label, (25, y + H // 2 - 200), row_label)
            for column, index in enumerate(indices):
                x = LEFT + column * (W + GAP)
                frame = Image.open(root / "frames" / f"{task}-{index + 1}-{view}.png").convert("RGB")
                assert frame.size == (W, H)
                sheet.paste(frame, (x, y))
                draw.text((x + 10, y + H + 8), f"{column + 1:02d}  {samples[index]['label']}", fill="#26342f", font=font)
                elapsed = samples[index]["snapshot"]["time"] - start
                draw.text((x + 10, y + H + 100), f"t = {elapsed:.2f} s", fill="#63716b", font=small)
        draw.text((LEFT, height - 80), "Scripted MuJoCo illustration  ·  Time relative to the first shown frame", fill="#63716b", font=small)
        sheet.save(root / f"{task}-{layout}.png", dpi=(300, 300))
        # Lossless PNG is the primary output; a compact contact sheet is for inspection.
        preview = sheet.copy()
        preview.thumbnail((2400, 900))
        preview.save(root / f"{task}-{layout}-preview.jpg", quality=94)
        print(f"{task}-{layout}.png: {width} x {height}")
