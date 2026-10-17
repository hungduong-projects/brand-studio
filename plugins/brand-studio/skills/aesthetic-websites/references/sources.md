# Asset sources and licences

Use this when you need 3D models, materials, lighting, video, sound, fonts, icons, animation files or images for a page. Licences below were read from each source's own licence page on 2026-10-17. Licences change: re-read the page, and the licence on the individual item, before you ship.

## Rules

1. Default to assets with no conditions: CC0, public domain, or media you rendered, recorded or generated yourself. Anything with conditions needs the user's agreement first.
2. "Free, no attribution" still has conditions. Most free libraries bar reselling the files unchanged, implying that people or brands endorse you, using the asset as a trademark, or building a competing library.
3. A brand or product site is commercial. Never use a non-commercial (NC) licence on one.
4. CC BY and similar licences need a visible credit. List them on a credits page ([components.md](components.md), Credits).
5. A copyright licence does not clear trademarks or people. Run the trademark review in the brand-design skill's [showcase.md](../../brand-design/references/showcase.md), section 3, and get releases for identifiable people where the source does not supply them.
6. Record every asset in `PROVENANCE.md`: source URL, author, licence, date downloaded and every change you made.

## 3D models

| Source | Good for | Licence and limits |
|---|---|---|
| Poly Haven | Realistic props and objects with PBR textures | CC0 |
| Kenney | Stylised game-style kits | CC0; do not use the Kenney logo |
| Quaternius | Low-poly characters, nature and props | Quaternius Asset License 1.0: commercial use, no attribution, no reselling the assets |
| Khronos glTF Sample Assets | Test models for loaders, materials and extensions | Per model (CC0, CC BY 4.0 and others); read the `README.md` in each model's folder |
| Sketchfab | Widest range, including scans | Per model. Store models use Standard or Editorial licences, and Editorial bars commercial and promotional use. Creative Commons downloads were not checked here; read each model's licence |
| NASA | Spacecraft, planets, mission media | NASA media guidelines: credit NASA, imply no endorsement, keep NASA insignia and logos out, get permission for identifiable people, no NFTs |

The brand-design skill's `fetch-polyhaven.py` searches and downloads Poly Haven models and HDRIs.

## Materials, textures and lighting

| Source | Good for | Licence and limits |
|---|---|---|
| Poly Haven | HDR environments, PBR textures | CC0 |
| ambientCG | PBR materials, decals, HDRIs | CC0 |

## Video

| Source | Licence and limits |
|---|---|
| Pexels | Free, no attribution. No selling unaltered copies, no implied endorsement by people or brands shown, no redistribution on stock or wallpaper sites, no use in a trademark |
| Pixabay | Pixabay Content License: free, no attribution. No selling the content standalone, no commercial use of content showing recognisable trademarks on goods, no misleading or illegal use |
| Coverr | Free for commercial use, no attribution. No reselling or bundling into website builders or themes, no competing service, no AI training. Coverr does not hand out model or property releases |
| Mixkit | A separate licence per item type (stock video free, stock video restricted, music, sound effects); read the one attached to each download. The user terms bar selling items without altering them and offering them to others as stock |
| NASA | As for 3D above |

For scroll-scrubbed video, re-encode with dense keyframes ([effects.md](effects.md), section 7).

## Music and sound effects

| Source | Licence and limits |
|---|---|
| Freesound | Per sound: CC0, CC BY or CC BY-NC. Filter search by licence; CC BY needs a credit; skip CC BY-NC on commercial sites |
| Pixabay | Music and sound effects fall under the same Pixabay Content License as video |
| Mixkit | Separate music and sound-effect licences; read the one attached to each download |

Send short loops as OGG with an M4A copy for Safari.

## Fonts

| Source | Licence and limits |
|---|---|
| Google Fonts | Most families SIL Open Font License 1.1, some Apache 2.0, the Ubuntu family the Ubuntu Font License. Read the family's licence file before you self-host |
| Fontshare | Open-source families use the OFL. Closed-source families use the ITF Free Font License 2.0: free for commercial use, but no modifying, subsetting or format conversion without written consent (so no custom WOFF2 subset or MSDF atlas), and no handing the files to agencies, contractors or printers; each must download its own copy |

## Icons

| Source | Licence and limits |
|---|---|
| Phosphor | MIT |
| Lucide | ISC; icons derived from Feather are MIT. Keep both notices |

## Animation files

| Source | Licence and limits |
|---|---|
| LottieFiles (free animations) | Lottie Simple License: commercial use allowed, attribution encouraged but optional. Edited files stay under the same licence; no compiling files to build a competing service |
| Rive Marketplace | CC BY 4.0 (Rive's marketplace docs): commercial use allowed with a visible credit to the author |

## Images and art

| Source | Licence and limits |
|---|---|
| Unsplash | Commercial use, attribution optional. No selling images without significant change, no compiling images into a competing service |
| Pexels, Pixabay | As for video above |
| The Met | Use works flagged `isPublicDomain` in the collection API. The dataset is CC0; check `rightsAndReproduction` on anything else |
| Art Institute of Chicago | Use works tagged public domain (`is_public_domain`). Build image URLs from the API's `config.iiif_url`; 843 px wide is the most cached size |

The brand-design skill's `fetch-open-art.py` searches, downloads and crops public-domain works from both museums.

## Asset preparation

- Models: glTF-Transform or gltfpack for meshopt or Draco compression and WebP or KTX2 textures. Keep moving parts as separate meshes.
- GPU textures: KTX-Software's `toktx` for KTX2 (Basis).
- Text in 3D: msdfgen or msdf-bmfont to build MSDF atlases from an OFL font.
- Video and audio: ffmpeg. Export a poster frame for every clip.

## Not verified

These sources could not be read on 2026-10-17 (blocked, error or no licence text). Do not rely on them without reading their licence yourself: Smithsonian Open Access, Poly Pizza, Velvetyne, Shadertoy's site terms and Codrops' licensing page.
