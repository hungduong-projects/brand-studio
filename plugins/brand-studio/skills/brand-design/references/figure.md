# Explainer figures: a working object that shows how a system works

Use this for a visual that explains how a product, process or algorithm works: a docs page, an article, a landing section or a help page. You describe an object as a list of solid parts and the steps it moves through. `scripts/figure.mjs` checks the geometry and writes an interactive page and stills in the brand's tokens.

## Choose the object

- Draw one real object a reader can name: a desk, a press, a sorting line, a gauge. Plain slabs in a stack and boxes joined by arrows are a diagram, and a diagram does not need this script.
- Give each idea a part that moves or changes. A drawer opens when a source is read; a carriage stops at a gate when approval is needed.
- Plan 2 to 6 steps. Each step lights one part or group: the thing to watch.
- The accent follows the contract. Choose steps whose lit part is something the brand lets the accent mark. Deskhand allows it only on citations, their sources and the primary action, so its figure lights those three.
- Put no words in the drawing. Labels and numbers live in the step list beside it, and a `rules` detail stands for printed text.
- Every name and number in a readout comes from a source of record. Name that source in `truth`.

## Spec

| Field | Meaning |
|---|---|
| `id`, `fig`, `title` | Kebab-case id, the figure number shown on the card ("Fig. 1") and the title beside it |
| `alt`, `caption` | What the drawing shows, for screen readers, and the sentence under the figure |
| `truth` | Where the readouts' names and numbers come from |
| `brand` | Path to the contract, from the spec's folder |
| `camera.azimuth` | 30 to 60 degrees; 45 by default. The camera always looks down at 30 degrees |
| `parts` | The solids, in any order; the script works out which covers which |
| `steps` | 2 to 6 of `{ id, label, readout, lit, move, hide }` |
| `legend` | 1 to 4 of `{ tone, label }`; one has the tone `lit` and says what the accent marks |
| `poster` | The step drawn in `figure.svg` and `poster.png`; the last step by default |

## Parts

A part is `{ id, kind, at, tone }` with an optional `group`, `round` and `details`.

- `box`: `at` is its low corner and `size` is `[width, depth, height]`. `round` rounds the plan's corners.
- `cylinder`: `at` is the centre of its base, with `r` and `h`.
- Axes: x runs right and down the screen, y runs left and down, z runs up. A larger x, y or z is nearer the viewer, so tall parts go at small x and y, where they hide nothing.
- `tone`: `base` for the ground the object stands on, `structure` for the machine, `subject` for the things the story is about. A step's `lit` puts the accent on a part, whatever its tone.
- `group`: a name that steps use to move, light or hide several parts together.

Build the object the way it would be made. Rest every part on the ground (z = 0) or flush on a part that reaches it; parts may touch and may not overlap. Aim for 30 to 60 parts: feet, rails, stops, pulls and lips are what make a block read as a thing. The script warns below 20 and refuses fewer than 8.

| Detail | Goes on | Draws |
|---|---|---|
| `inset` | `top`, `left`, `right` | A closed outline inside the face: a panel, a label holder, a sheet's margin |
| `screws` | `top` | A dot near each corner |
| `slats` | `top` | `count` lines from edge to edge, along `x` or `y` |
| `seam` | the sides | A line round the visible sides at `at`, a share of the height |
| `slots` | `left`, `right` | `count` closed vents in a row |
| `rules` | `top`, `left`, `right` | `count` lines of unequal length that stand for text |

`left` is the face turned to the left of the screen (+y) and `right` the one turned to the right (+x). A cylinder takes a seam or a top inset.

## Steps

- `lit`: one part id or group.
- `move`: `{ "<part or group>": [x, y, z] }`, each an offset from the part's place in `parts`. A part a step leaves out is at rest in that step.
- `hide`: parts or groups that are absent in this step. They fade in when a later step shows them.

Parts travel in a straight line between two neighbouring steps. The script tests seven poses along each line, so a part that would pass through another on the way fails the check; add a step that lifts it clear.

## What the script checks

- Spec shape, unique ids, and that every `lit`, `move` and `hide` names a real part or group.
- No two visible parts share volume, at a step or on the way between two.
- Every visible part reaches the ground through the parts it touches; two parts that hold only each other float.
- A back-to-front order exists for every pose. Three long parts that each cover the next have none: split one.
- The lit part spans at least 24 px on a 390 px phone.
- In the browser at 390 and 1280 px, light and dark: no sideways scroll, no clipped text, buttons at least 44 px tall, no console errors, and each step drawn as the audit computed it.
- With motion on: a swipe settles on the next step, Play moves on, and a seek lands on its pose.

Review these on `sheet.png` and `phone.png`, because the script can't judge them:

- A reader names the object in three seconds without the labels.
- The lit part is the first thing the eye lands on in each step, and nothing else competes with it.
- The story reads from the drawing alone: cover the step list and say what changed.
- No tall part hides a part the story needs.
- The same figure holds up in dark mode.

## Exports

| Export | Use |
|---|---|
| `figure.html` | Standalone page. To place the figure in a site, copy the `<style>`, `<figure>` and `<script>` from its body. It follows the system theme; set `data-theme="light"` or `"dark"` on the `<figure>` to fix one |
| `figure.svg` | The poster step as a still with no CSS or script, for a README, slide or email |
| `figure.model.json` | The drawing as data. In a project that uses `@brand-studio/ui`, pass it to `ExplainerFigure`, which draws it in the page's own theme with the same steps, drag and Play |
| `poster.png` | The still on the card colour at 2x |
| `phone.png` | The page at 390 px |
| `sheet.png` | Every step in light and dark |
| `figure.mp4` | With `--video`: the page walking through every step, 1080 px wide and silent, for a social post, a slide or a README. Needs ffmpeg |

A reader moves through the figure four ways:

- The step list is a tab list: a tap, or the arrow keys, Home and End. Every label and readout is visible text.
- A sideways drag on the drawing scrubs between steps and settles on the nearest; an up or down drag still scrolls the page.
- Play walks to the last step, one step every 2.4 seconds, and stops there. Nothing moves until the reader asks.
- A host page can drive it, for example from scroll: `figure.dispatchEvent(new CustomEvent('figure:seek', { detail: 1.5 }))` draws the pose halfway between steps 2 and 3.

The drawing follows the selected step on a spring; with reduced motion it changes at once.

## Run and review

```sh
node <this-skill>/scripts/figure.mjs <project>/brand/figure.json [--out DIR] [--video]
```

The script exits with an error after writing the files when a geometry or page check fails, so you can see the problem. `examples/deskhand/figure/` in the Brand Studio repository is a complete figure.
