"""Crop each rendered still to the camera with even margins and write WebP copies to public/images/halden/.

Run from apps/showcase after render-stills.mjs:  python3 source-3d/stills-to-webp.py
The lens close-up keeps their frame; the rest are cropped to the product, then set on a clear canvas.
"""
from pathlib import Path
from PIL import Image

SRC = Path('source-3d/stills')
OUT = Path('public/images/halden')
KEEP_FRAME = {'lens'}
# name: (width, height, share of the width the product fills)
SIZES = {'wide': (2400, 1350, 0.62), 'square': (1200, 1200, 0.8)}

OUT.mkdir(parents=True, exist_ok=True)
for path in sorted(SRC.glob('*.png')):
    image = Image.open(path).convert('RGBA')
    if path.stem in KEEP_FRAME:
        image.resize((2400, 1350), Image.LANCZOS).save(OUT / f'{path.stem}.webp', quality=86, method=6)
        print(OUT / f'{path.stem}.webp')
        continue
    product = image.crop(image.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
    for kind, (width, height, share) in SIZES.items():
        scale = min(width * share / product.width, height * 0.78 / product.height)
        fitted = product.resize((round(product.width * scale), round(product.height * scale)), Image.LANCZOS)
        canvas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        canvas.alpha_composite(fitted, ((width - fitted.width) // 2, (height - fitted.height) // 2))
        name = path.stem if kind == 'wide' else f'{path.stem}-square'
        canvas.save(OUT / f'{name}.webp', quality=86, method=6)
        print(OUT / f'{name}.webp')
