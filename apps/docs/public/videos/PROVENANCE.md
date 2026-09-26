# Halden camera videos

Rendered in this repository from the same cleaned CC0 model as the stills in `../images/halden/` (Camera 01 by Rajil Jose Macatangay, Studio Small 09 by Sergej Majboroda, both Poly Haven, CC0). Halden is a fictional brand.

- `halden-macro.mp4`: a slow, looping close pass over the lens and leather.
- `halden-turn.mp4` and `halden-turn.jpg`: one full turn, then the parts drift apart. Every frame is a keyframe, for scroll-driven playback.

Rebuild steps: `apps/showcase/source-3d/PROVENANCE.md`.

# Brand Studio intro film

- `brand-studio-intro.mp4` and `brand-studio-intro.jpg`: a 24-second silent film drawn in code from `@brand-studio/ui` components and the Hollis, Deskhand and Still demo contracts, all fictional brands. Fonts: Geist and Geist Mono (SIL OFL 1.1), Manrope (SIL OFL 1.1), bundled from Fontsource. No third-party images or footage.

Rebuild: `node examples/intro-film/render.mjs` (needs ffmpeg and a Playwright Chromium).
