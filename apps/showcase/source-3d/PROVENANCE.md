# 3D sources for the Halden camera page

Both assets come from Poly Haven and are released under CC0 1.0 (public domain dedication). No attribution is required; we credit the authors in the page footer anyway.

| File | Source | Author | Licence |
|---|---|---|---|
| `public/models/camera.glb` | [Camera 01](https://polyhaven.com/a/camera_01), 2k glTF | Rajil Jose Macatangay | CC0 1.0 |
| `public/models/studio.hdr` | [Studio Small 09](https://polyhaven.com/a/studio_small_09), 1k HDR | Sergej Majboroda | CC0 1.0 |

## Changes to the camera

CC0 waives copyright; it does not clear trademarks. The source textures reproduce markings from a real camera maker, so `clean-camera.py` removes them before building `camera.glb`:

- Maker name, lens name, filter size and serial number on the lens ring: filled with the surrounding metal.
- Town, maker, patent mark, model and serial number on the top plate: patched from bare paint on the same plate.
- A person's name written on the strap: patched from plain leather on the same strap.
- Red markings (the lens mount dot, the lever dots and the film reminder emblem): recoloured to brass.

Each edit applies to the colour, normal and roughness maps. The generic scales stay: distances, apertures, shutter speeds, film speeds and "close / open".

The raw download is kept out of Git. To rebuild, download the Camera 01 2k glTF into `source-3d/camera_01/` (the `.gltf`, `.bin` and `textures/`), then run from `apps/showcase`:

```sh
python3 source-3d/clean-camera.py
```

The script needs Pillow and writes `public/models/camera.glb` through `@gltf-transform/cli` (WebP textures at 2048 px, meshopt compression, parts kept separate). After a rebuild, look over each texture again for lettering or logos before you commit.

## Stills

The images in `public/images/halden/` (and the smaller copies in `apps/docs/public/images/halden/`) are renders of the cleaned model. With the dev server on port 5188, run from the repository root, then from `apps/showcase`:

```sh
node apps/showcase/source-3d/render-stills.mjs
python3 source-3d/stills-to-webp.py
```

The raw PNGs in `source-3d/stills/` stay out of Git.

Halden is a fictional brand. The page takes its section structure from Apple product pages but uses no Apple media, copy, fonts, icons or code.

## Videos

The demo videos in `apps/docs/public/videos/` are frame sequences of the cleaned model. With the dev server on port 5188, run from the repository root:

```sh
node apps/showcase/source-3d/render-video.mjs macro turn
sh apps/showcase/source-3d/frames-to-video.sh macro
sh apps/showcase/source-3d/frames-to-video.sh turn
```

The raw frames in `source-3d/stills/<name>/` stay out of Git. The second script needs `ffmpeg`.

# 3D source for the Nuvelo sneaker page

| File | Source | Author | Licence |
|---|---|---|---|
| `public/models/shoe.glb` | [Materials Variants Shoe](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/MaterialsVariantsShoe), Khronos glTF sample assets | Shopify, 2021 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

CC BY 4.0 requires credit, so the page footer names the model, Shopify, the licence and the changes.

## Changes to the shoe

`clean-shoe.py` makes these edits before building `shoe.glb`:

- Logo on the tongue label: filled with the label's own colour.
- "FOAM" lettering embossed on the sole, visible only in the normal map: patched from plain foam on the same strip.
- Small print on the insole: patched from plain insole.
- Only the pink "Beach" colourway is kept. Its pink is lifted toward Nuvelo's candy pink, and the charcoal laces, collar and tongue label turn sky blue.

Each patch applies to the colour, normal and occlusion-roughness-metal maps.

The raw download is kept out of Git. To rebuild, download `MaterialsVariantsShoe.glb` into `source-3d/shoe/`, then run from `apps/showcase`:

```sh
python3 source-3d/clean-shoe.py
```

The script needs Pillow and writes `public/models/shoe.glb` through `@gltf-transform/cli` (WebP textures at 2048 px, meshopt compression).
