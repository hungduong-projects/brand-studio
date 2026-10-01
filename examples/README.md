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

`intro-film/` is the docs homepage film, drawn as a function of time from live `@brand-studio/ui` components with the brand-design skill's film kit (`plugins/brand-studio/skills/brand-design/scripts/film/`). Render it with:

```sh
node plugins/brand-studio/skills/brand-design/scripts/film-render.mjs --film examples/intro-film/film.tsx --name brand-studio-intro --site https://brandstudio.js.org --out apps/docs/public/videos
```

Add `--stills 2,10,23` to write review frames instead.

## Deskhand art

`deskhand/art/` is an art family drawn in code from the Deskhand brand tokens: one master, four versioned derivatives and an `asset-bible.json` that records rules, provenance and uses. Open `index.html` to see the set in a social card, an email and a landing section. Run `node examples/deskhand/art/render.mjs` to redraw missing files.

## Deskhand mascot

`deskhand/mascot/` is a character rig built from the Deskhand mark: the card is the body and the logo's bar is the mouth. It has eight states, each tied to a moment in the support console. Render it with:

```sh
node plugins/brand-studio/skills/brand-design/scripts/mascot.mjs examples/deskhand/mascot/mascot.json --3d
```

## Deskhand icons

`deskhand/icons/` holds eight product glyphs on Lucide's grid at Deskhand's 1.8 px stroke, plus the app icon as layers. The mobile app's icon files are exported from it. Run:

```sh
node plugins/brand-studio/skills/brand-design/scripts/icons.mjs examples/deskhand/icons/icons.json
```
