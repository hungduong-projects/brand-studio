#!/usr/bin/env python3
"""Write contrast-boosted previews of every texture in a folder, for a trademark review.

  texture-sheet.py <textures-dir> [--out DIR] [--size 1024]

Makes <name>.png per texture with auto-contrast, so faint lettering shows up. Engraved and
embossed marks often appear only in the normal or roughness map, never in the colour map,
so look at every file it writes. Needs Pillow.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageOps


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("textures")
    parser.add_argument("--out", default="texture-review")
    parser.add_argument("--size", type=int, default=1024)
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in Path(args.textures).rglob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    for path in files:
        image = Image.open(path).convert("RGB")
        image.thumbnail((args.size, args.size))
        ImageOps.autocontrast(image, cutoff=1).save(out / f"{path.stem}.png")
        print(f"{out / (path.stem + '.png')}")
    print(f"{len(files)} textures. Zoom into any lettering at full resolution before you decide it is generic.")


if __name__ == "__main__":
    main()
