# Mascot: a brand character with states

Use this when a brand needs a character for empty states, onboarding, success moments or social posts. Build it as an SVG rig of parts, so every state keeps one silhouette, then check and render it with `scripts/mascot.mjs`.

## Decide whether the brand needs one

A mascot earns its place when the product has repeated emotional moments: a first run, a wait, a success, a mistake. Duolingo's owl and Mailchimp's Freddie carry those moments ([Envato](https://elements.envato.com/learn/the-return-of-the-brand-mascot-and-how-to-create-your-own)). Skip it when the moments are formal or high-stakes, such as legal notices, medical results or a failed payment, when no product moment needs it, or when the contract's `imagery.avoid` rules one out.

## Take the concept from the brand

Derive the character from the mark or the subject so no competitor could reuse it; Mozilla's Kit borrows the Firefox logo ([Envato](https://elements.envato.com/learn/the-return-of-the-brand-mascot-and-how-to-create-your-own)). Propose two concepts, check each against `imagery.avoid`, pick one and write the reason in `concept`.

## Score the concept

Before you draw, score each concept from 1 to 10 on six criteria, as a critic would rather than as its author:

- `recognition`: people know it from its filled silhouette at 16 px with the logo hidden.
- `originality`: it would not fit any of ten competitors, and it is not a stock animal, robot or blob.
- `simplicity`: every detail survives at 48 px.
- `fit`: it comes from the mark, the product or its promise, and respects `imagery.avoid`.
- `range`: the face and arms carry every state without a new body.
- `appeal`: people would want to see it again.

A concept goes ahead at 42 of 60 or more, with `recognition` and `originality` at 8 or more. Write the winner in `conceptScore` with its `scores`, a `hook` (what people remember once colour, props and pose are gone) and `fiveWords` (the mascot in five words or fewer). If you can't write either line, the concept isn't ready. The script fails a score under the bar and warns when `conceptScore` is missing.

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
- `conceptScore`: the scores from the step above.

Each part is an SVG on the spec's `viewBox` with filled shapes only. Every fill is a six-digit hex from the contract tokens or `palette`. Parts may not contain scripts, images, live text, CSS or external links. `examples/deskhand/mascot/` in the Brand Studio repository is a complete rig.

## Render and review

```sh
node <this-skill>/scripts/mascot.mjs <project>/brand/mascot.json [--3d] [--out DIR]
```

The script writes `states/<id>.svg` and `.png`, `contact-sheet.png` and `report.json`. The sheet shows every state at 256, 48, 24 and 16 px on the light and dark surfaces, then in grayscale and blurred. Three checks print warnings, and the run still succeeds:

- **Silhouette:** a state whose outline overlaps the first state's by less than 0.85.
- **Distinct:** two states that differ in under 5% of their pixels at 48 px. People see one picture; change the pose or the prop.
- **Contrast:** a part with under 20% of its pixels at 3:1 against what is behind it, on either surface. 3:1 is the WCAG minimum for graphics; below it the part fades out.

`report.json` records each state's `silhouette`, its smallest `distinct` score against any other state, and its weakest part's `visible` share on each surface.

Open the contact sheet. Check the 16 px row, the expression at 48 px and where props meet hands. On the dark row, any part drawn in a colour close to the dark surface disappears; draw limbs and props as an outline around a lighter core so they read on both surfaces. In the grayscale row the shape must hold without colour, and in the blurred row the pose must still read. Fix a part file, rerun and look again.

`--3d` extrudes the parts into a soft clay figure with three.js and writes `3d/<id>.png`. The body slot takes the depth; the other slots sit on its face. It needs `three` installed where you run the script. Use these renders for marketing and social posts; the product UI uses the flat states.

## Motion

Rive imports SVG. Import each part into its own layer named after its slot, and make each state id an input of a state machine; Duolingo runs its characters this way. Without Rive, swap state SVGs with a 150 to 200 ms cross-fade, and swap instantly under reduced motion.

## Provenance

Record each state in `asset-bible.json` ([art-system.md](art-system.md)) with source type `code` and the script path. The parts are original drawings.
