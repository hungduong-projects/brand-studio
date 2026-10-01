# Mascot: a brand character with states

Use this when a brand needs a character for empty states, onboarding, success moments or social posts. Build it as an SVG rig of parts, so every state keeps one silhouette, then check and render it with `scripts/mascot.mjs`.

## Decide whether the brand needs one

A mascot earns its place when the product has repeated emotional moments: a first run, a wait, a success, a mistake. Duolingo's owl and Mailchimp's Freddie carry those moments ([Envato](https://elements.envato.com/learn/the-return-of-the-brand-mascot-and-how-to-create-your-own)). Skip it when the moments are formal or high-stakes, such as legal notices, medical results or a failed payment, when no product moment needs it, or when the contract's `imagery.avoid` rules one out.

## Take the concept from the brand

Derive the character from the mark or the subject so no competitor could reuse it; Mozilla's Kit borrows the Firefox logo ([Envato](https://elements.envato.com/learn/the-return-of-the-brand-mascot-and-how-to-create-your-own)). Propose two concepts, check each against `imagery.avoid`, pick one and write the reason in `concept`.

## Silhouette first

Fill the character black at 16 px with the logo removed. If people still know it, the shape is ownable. Add detail inside the silhouette, not around it ([svgapp.ai](https://svgapp.ai/blog/mascot-design-trends-2026/)).

## Expression system

Draw 6 to 10 states, each named for the product moment it serves, such as `sent` or `missing-source`. Change eyes, brows, mouth, arms and a held prop; keep the body.

## Behaviour

- Show the mascot after an outcome or in an empty state. It never covers a task or blocks input. Asana's celebration appears only after a task is done, and people can switch it off.
- Keep it out of error messages that need facts. State the error; the mascot may follow with a next step.
- No guilt, pressure or streak threats in its lines. Run every line through [copy.md](copy.md).
- People can turn it off. With reduced motion, show one static state.

## Constants and variables

List what never changes (silhouette, proportions, eye shape, palette) and what may change (arm pose, props, expression). WordPress's Wapuu stays recognizable through community remixes because its core is fixed.

## Build the rig

Write `brand/mascot.json` next to a `parts/` folder:

- `slots`: part layers bottom to top. The first slot is the body.
- `parts`: for each slot, variant names mapped to SVG files.
- `states`: 6 to 10 entries of `id`, `moment` and the variant chosen per slot. Omit a slot to leave it empty.
- `constants`, `variables`, and `behaviour` with `appearsWhen`, `never` and `canTurnOff: true`.
- `brand`: path to the contract. `palette`: extra hex colours, each reported as a warning when it is not a token.

Each part is an SVG on the spec's `viewBox` with filled shapes only. Every fill is a six-digit hex from the contract tokens or `palette`. Parts may not contain scripts, images, live text, CSS or external links. `examples/deskhand/mascot/` in the Brand Studio repository is a complete rig.

## Render and review

```sh
node <this-skill>/scripts/mascot.mjs <project>/brand/mascot.json [--3d] [--out DIR]
```

The script writes `states/<id>.svg` and `.png`, `contact-sheet.png` (every state at 256, 48, 24 and 16 px on the light and dark surfaces) and `report.json`. Each state's silhouette score compares its outline with the first state's; a score under 0.85 prints a warning to look again, and the run still succeeds.

Open the contact sheet. Check the 16 px row, the expression at 48 px and where props meet hands. On the dark row, any part drawn in a colour close to the dark surface disappears; draw limbs and props as an outline around a lighter core so they read on both surfaces. Fix a part file, rerun and look again.

`--3d` extrudes the parts into a soft clay figure with three.js and writes `3d/<id>.png`. The body slot takes the depth; the other slots sit on its face. It needs `three` installed where you run the script. Use these renders for marketing and social posts; the product UI uses the flat states.

## Motion

Rive imports SVG. Import each part into its own layer named after its slot, and make each state id an input of a state machine; Duolingo runs its characters this way. Without Rive, swap state SVGs with a 150 to 200 ms cross-fade, and swap instantly under reduced motion.

## Provenance

Record each state in `asset-bible.json` ([art-system.md](art-system.md)) with source type `code` and the script path. The parts are original drawings.
