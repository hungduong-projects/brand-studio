# Halden camera videos

Rendered in this repository from the same cleaned CC0 model as the stills in `../images/halden/` (Camera 01 by Rajil Jose Macatangay, Studio Small 09 by Sergej Majboroda, both Poly Haven, CC0). Halden is a fictional brand.

- `halden-macro.mp4`: a slow, looping close pass over the lens and leather.
- `halden-turn.mp4` and `halden-turn.jpg`: one full turn, then the parts drift apart. Every frame is a keyframe, for scroll-driven playback.

Rebuild steps: `apps/showcase/source-3d/PROVENANCE.md`.

# Brand Studio intro film

- `brand-studio-intro.mp4` and `brand-studio-intro.jpg`: a 40-second silent film drawn in code from `@brand-studio/ui` components, with screen captures of this site's own example pages (Halden, Deskhand and Editions, all fictional brands). Those pages carry their own provenance: `apps/showcase/source-3d/PROVENANCE.md` and `apps/showcase/source-art/PROVENANCE.md`. Fonts: Geist and Geist Mono (SIL OFL 1.1), bundled from Fontsource.

Rebuild: `node examples/intro-film/render.mjs` (needs ffmpeg and a Playwright Chromium).
