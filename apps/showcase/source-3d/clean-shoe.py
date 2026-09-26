"""Clear the maker marks from the Khronos "Materials Variants Shoe", recolour it for Nuvelo, then build public/models/shoe.glb.

The model is CC BY 4.0 (Shopify, 2021). The licence covers copyright, not trademarks: its textures carry a logo on the
tongue label, embossed "FOAM" lettering on the sole and small print on the insole. Each is patched in the colour, normal
and occlusion-roughness-metal maps. The pink "Beach" colourway becomes the only material: the pink is lifted toward
Nuvelo's candy pink and the charcoal parts (laces, collar, tongue label) turn sky blue.
Run from apps/showcase:  python3 source-3d/clean-shoe.py
"""
import colorsys, io, json, struct, subprocess
from pathlib import Path
from PIL import Image, ImageFilter

SRC = Path('source-3d/shoe/MaterialsVariantsShoe.glb')
TMP = Path('source-3d/shoe/shoe-clean.glb')
BEACH, NORMAL, ORM = 3, 2, 0  # image indices in the source file

# Each mark: (box to cover, top-left of a clean patch of the same material), in 2048 px texture space.
MARKS = [
    ((1735, 745, 1812, 1008), (1735, 445)),  # "FOAM" embossed on the sole: patched from plain foam higher on the strip
    ((338, 628, 488, 750), (338, 500)),  # print on the insole: patched from plain insole above it
]
# The tongue label is one plain colour with a logo on it, too small to patch from; fill the logo with the label's own colour.
LABEL, LABEL_SAMPLE = (554, 610, 638, 720), (600, 585)


def patch(image: Image.Image) -> Image.Image:
    image.paste(image.getpixel(LABEL_SAMPLE), LABEL)
    for (left, top, right, bottom), (x, y) in MARKS:
        clean = image.crop((x, y, x + right - left, y + bottom - top))
        # A feathered edge so the patch leaves no seam.
        mask = Image.new('L', clean.size, 0)
        mask.paste(255, (6, 6, clean.width - 6, clean.height - 6))
        image.paste(clean, (left, top), mask.filter(ImageFilter.GaussianBlur(3)))
    return image


def recolour(image: Image.Image) -> Image.Image:
    sky = (0.56, 0.36)  # hue and saturation of Nuvelo's panel blue
    out = []
    for r, g, b in image.getdata():
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if v < 0.35:  # charcoal laces, collar and label: sky blue, keeping the weave as light and shade
            h, s, v = sky[0], sky[1], 0.7 + v * 0.8
        elif s > 0.08:  # dusty pink upper and bars: candy pink
            h, s, v = 0.93, min(1.0, s * 1.15), min(1.0, v * 1.3)
        out.append(tuple(round(c * 255) for c in colorsys.hsv_to_rgb(h, s, v)))
    image.putdata(out)
    return image


data = SRC.read_bytes()
json_length = struct.unpack('<I', data[12:16])[0]
gltf = json.loads(data[20:20 + json_length])
binary = data[20 + json_length + 8:]

views = [binary[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']] for v in gltf['bufferViews']]
for index, fix in ((BEACH, lambda im: recolour(patch(im))), (NORMAL, patch), (ORM, patch)):
    view = gltf['images'][index]['bufferView']
    image = fix(Image.open(io.BytesIO(views[view])).convert('RGB'))
    buffer = io.BytesIO()
    image.save(buffer, 'JPEG', quality=95)
    views[view] = buffer.getvalue()

# Keep only the Beach material and drop the variants.
primitive = gltf['meshes'][0]['primitives'][0]
primitive['material'] = 1
primitive.pop('extensions', None)
gltf.pop('extensions', None)
gltf.pop('extensionsUsed', None)

packed = b''
for view, chunk in zip(gltf['bufferViews'], views):
    packed += b'\0' * (-len(packed) % 4)
    view['byteOffset'], view['byteLength'] = len(packed), len(chunk)
    packed += chunk
packed += b'\0' * (-len(packed) % 4)
gltf['buffers'] = [{'byteLength': len(packed)}]
text = json.dumps(gltf).encode()
text += b' ' * (-len(text) % 4)
TMP.write_bytes(struct.pack('<III', 0x46546C67, 2, 28 + len(text) + len(packed)) + struct.pack('<II', len(text), 0x4E4F534A) + text
                + struct.pack('<II', len(packed), 0x004E4942) + packed)

subprocess.run(['npx', '-y', '@gltf-transform/cli@4', 'optimize', str(TMP.resolve()), str(Path('public/models/shoe.glb').resolve()),
                '--texture-compress', 'webp', '--texture-size', '2048', '--compress', 'meshopt'], check=True)
print('wrote public/models/shoe.glb')
