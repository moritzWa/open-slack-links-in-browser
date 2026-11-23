#!/usr/bin/env python3
"""Render the SVG artwork to Chrome's icon sizes. Requires ImageMagick."""
from pathlib import Path
import subprocess

icons = Path(__file__).resolve().parent.parent / "icons"
for size in (16, 32, 48, 128):
    subprocess.run([
        "magick", "-background", "none", "-density", "768", str(icons / "icon.svg"),
        "-resize", f"{size}x{size}", "-strip", str(icons / f"icon-{size}.png"),
    ], check=True)
