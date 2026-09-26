# Public examples

Standalone proofs of Brand Studio behavior. They are not part of the UI or plugin packages.

An example belongs here only when it:

- demonstrates a named architectural or creative principle;
- contains only original, licensed or clearly attributable assets;
- records required provenance next to the example;
- has readable first paint and an accessible static or reduced-motion fallback where relevant;
- can be run or opened without private tools, credentials or local reference libraries; and
- is intentionally supported as a public learning artifact.

## Motion

`motion/` contains approved standalone motion studies. These files are dependency-free reference implementations. Reuse their structure and accessibility behavior, not their exact art direction or copy.

## Intro film

`intro-film/` draws the docs homepage film as a function of time from live `@brand-studio/ui` components. `render.mjs` steps it frame by frame in headless Chromium and encodes an MP4 and poster with ffmpeg. Pass `--stills 2,10,23` to write review frames instead.

`film-kit/` holds the pieces the film is built from: easing curves, keyframes, a camera that zooms to follow the action, app, browser and terminal windows, a cursor with click ripples and captions. Each one draws from time alone, so any frame renders the same way twice.

## Deskhand art

`deskhand/art/` is an art family drawn in code from the Deskhand brand tokens: one master, four versioned derivatives and an `asset-bible.json` that records rules, provenance and uses. Open `index.html` to see the set in a social card, an email and a landing section. Run `node examples/deskhand/art/render.mjs` to redraw missing files.
