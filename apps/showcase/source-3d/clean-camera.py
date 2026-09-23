"""Remove third-party brand markings from Poly Haven's Camera 01 textures, then build public/models/camera.glb.

The model is CC0, but its textures reproduce a real maker's engravings (name, lens name, town, serial).
CC0 covers copyright, not trademarks, so every line of lettering (and the strap's stamps and a name written on it) is filled with the surrounding metal
in the colour, normal and roughness maps. Run from apps/showcase:  python3 source-3d/clean-camera.py
"""
import shutil, subprocess
from pathlib import Path
from PIL import Image

SRC = Path('source-3d/camera_01')
OUT = Path('source-3d/camera_01_clean')

# Boxes around each line of lettering, in 2048px texture space: (left, top, right, bottom).
# The lens ring is filled row by row; the body plate is patched from a clean stretch of the same plate.
LENS = [(30, 425, 1190, 462)]  # maker, lens name, filter size, serial
LENS_FLAT = [(0, 212, 145, 266), (1510, 212, 1632, 266)]  # country of origin and serial, engraved only in the normal map
PLATE = [
    (1509, 1166, 1741, 1202),  # town and country
    (1512, 1199, 1740, 1238),  # maker
    (1594, 1256, 1661, 1284),  # patent mark
    (1273, 1313, 1457, 1344),  # model and serial
]
CLEAN_PLATE = (1480, 1322)  # top-left of a mark-free area of black paint on the same plate
# Strap marks, each patched from plain leather further along the same band: (box, x of the clean patch).
STRAP = [
    ((1268, 1682, 1418, 1740), 1100),  # an owner's name written on the strap
    ((826, 252, 978, 300), 660),  # maker stamp, embossed
    ((462, 372, 622, 420), 640),  # maker stamp, embossed
]
MAPS = ['diff', 'nor_gl', 'arm']
BRASS = (216, 180, 106)  # red markings on the source sit too close to a real maker's red dot


def fill(image: Image.Image, box, grain=True):
    """Fill each row of the box with that row's median just outside the box, plus the grain from the rows above."""
    left, top, right, bottom = box
    pixels = image.load()
    width = right - left
    for y in range(top, bottom):
        edge = [pixels[x, y] for x in list(range(max(0, left - 12), left)) + list(range(right, min(image.width, right + 12)))]
        median = tuple(sorted(c[i] for c in edge)[len(edge) // 2] for i in range(3))
        # Borrow texture from a band just above the box so the fill keeps the paint's grain.
        source_y = max(0, top - (bottom - top) - 4 + (y - top))
        row = [pixels[left + x, source_y] for x in range(width)]
        mean = tuple(sum(c[i] for c in row) / width for i in range(3))
        for x in range(width):
            pixels[left + x, y] = tuple(int(max(0, min(255, median[i] + (row[x][i] - mean[i] if grain else 0)))) for i in range(3))


def unred(image: Image.Image):
    """Turn every red marking (mount dot, lever dots, dial emblem) brass, keeping its shading."""
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b = pixels[x, y]
            if r > 90 and r > 1.8 * max(g, b):
                pixels[x, y] = tuple(int(c * r / 255) for c in BRASS)


if OUT.exists():
    shutil.rmtree(OUT)
shutil.copytree(SRC, OUT)
for kind in MAPS:
    path = OUT / 'textures' / f'Camera_01_lens_body_{kind}_2k.jpg'
    image = Image.open(path).convert('RGB')
    for box in LENS:
        fill(image, box)
    for box in LENS_FLAT:
        fill(image, box, grain=False)
    if kind == 'diff':
        unred(image)
    image.save(path, quality=95)

    path = OUT / 'textures' / f'Camera_01_body_{kind}_2k.jpg'
    image = Image.open(path).convert('RGB')
    for left, top, right, bottom in PLATE:
        patch = image.crop((CLEAN_PLATE[0], CLEAN_PLATE[1], CLEAN_PLATE[0] + right - left, CLEAN_PLATE[1] + bottom - top))
        image.paste(patch, (left, top))
    if kind == 'diff':
        unred(image)
    image.save(path, quality=95)

    path = OUT / 'textures' / f'Camera_01_strap_{kind}_2k.jpg'
    image = Image.open(path).convert('RGB')
    for (left, top, right, bottom), clean_x in STRAP:
        image.paste(image.crop((clean_x, top, clean_x + right - left, bottom)), (left, top))
    image.save(path, quality=95)

subprocess.run(['npx', '-y', '@gltf-transform/cli@4', 'optimize', str((OUT / 'Camera_01_2k.gltf').resolve()), str(Path('public/models/camera.glb').resolve()),
                '--texture-compress', 'webp', '--texture-size', '2048', '--compress', 'meshopt', '--join', 'false', '--flatten', 'false'], check=True)
print('wrote public/models/camera.glb')
