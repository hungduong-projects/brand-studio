# Take-apart model format

A model is a classic script that runs after `assets/kit.js`. It uses the kit's helpers as globals and ends with one call to `model({ ... })`. `assets/phone.js` is the worked example.

## Model

```js
const W = 112, L = 230, R = 18; // sizes you reuse
model({
  fig: 'Fig. 1',                  // shown above the title
  tour: [{ dive: ['board', 'processor'], light: ['die'] }],  // optional film path, see "Film"
  end: ['Brand', 'One line about it.', 'example.com'],       // optional end card for the film
  defs: '<clipPath id="clip">...</clipPath>',                // optional SVG definitions the drawings share
  figures: {
    phone: { ... },               // the first figure is the top one
    board: { ... },               // every other figure is opened by a part
  },
});
```

## Figure

| Field | Meaning |
|---|---|
| `crumb` | Short name in the breadcrumb ("Logic board") |
| `heading` | Title while this figure is open ("Inside the logic board") |
| `caption` | One sentence under the drawing, under 120 characters |
| `alt` | What the drawing shows when taken apart, for screen readers |
| `gap` | `[wide, narrow]`: the space between layers when apart, on a wide screen and on a phone, in drawing units |
| `layers` | 2 to 7 layers, **bottom first**; 4 to 7 in the first figure, so taking it apart shows the whole build |
| `steps` | In place of `layers` and `gap`: a process of 2 to 7 steps, **first step first**; 4 to 7 in the first figure. See "Steps" |

## Layer

| Field | Meaning |
|---|---|
| `key` | Unique id within the figure; used by `?focus=`, the tour and the film's beat ids |
| `title` | 30 characters or fewer |
| `readout` | What this layer does, about two lines (under 110 characters) |
| `zA` | Height of the layer's base while the thing is whole, so layers stack without gaps |
| `parts` | Optional, up to 6: `{ name, at: [x, y, z], open, id }`. `at` places a numbered pin; `open` names the figure a click zooms into, and then `id` must match a `hit()` in `draw` |
| `draw` | A function that returns the layer's SVG, drawn from height 0 in its own space |

## Steps

A figure with `steps` is a process. Each step is a small scene of its own, drawn from height 0 like a layer, that stands at its place on the floor instead of stacking. The page numbers the steps in order, draws an arrow along the floor from each one's footprint to the next, and glides the view to the lit step. A step has the layer's fields except `zA`, plus:

| Field | Meaning |
|---|---|
| `at` | `[x, y]`: where the step's drawing stands on the floor. Leave about 30 units between footprints so the arrow shows; the build warns when two overlap |

A step's part opens a figure the way a layer's part does. Lay the steps along x, along y or in a zigzag: the page draws far steps first. Words drawn above a step reach up the screen and can cover the step behind it. For steps with words, place the steps in screen rows and columns instead: screen offset `(X, Y)` is floor point `x = X / (2 * C) + Y`, `y = Y - X / (2 * C)`. Two columns suit a portrait film.

## Space and drawing order

x runs right and down the screen, y runs left and down, z runs up; one unit is one screen unit before the page scales the figure to fit. Draw far things first: later markup paints over earlier markup. `byDepth(points)` sorts `[x, y]` points far to near, and `grid(n, from, step)` gives an n by n grid in that order.

## Kit

| Helper | Draws |
|---|---|
| `slab(x, y, w, h, r, z0, height, o)` | A box with rounded corners in plan |
| `cyl(cx, cy, r, z0, height, o)` | A cylinder |
| `ringed([x, y, w, h, r], holes, height, o)` | A plate with holes cut out (holes are more path data, even-odd) |
| `solid({ d, bounds, tan, z0, h, top, side, evenodd })` | Any footprint path extruded; the others call it |
| `flat(z, inner, cls = 'det')` | Marks lying flat at height z; `det` strokes fine detail, `''` for none |
| `face(faceX(w) or faceY(d), inner)` | Marks on a side face: a port, a button outline |
| `outline(x, y, w, h, r)` | A dashed footprint, for a layer of loose parts |
| `holes([[x, y, r], ...])`, `rings(cx, cy, [r, ...])` | Circles for `flat` |
| `hit(open, id, name, inner, spot)` | Wraps the markup a click on part `id` zooms through into figure `open` |
| `spot(x, y, size, z)` | A square patch for `hit` when the zoom should grow from part of the drawing |
| `rr`, `circ`, `rrTan`, `cTan`, `frontArc`, `P`, `plane`, `f` | Path, projection and rounding helpers for custom shapes |

Words for a worked example go in as `<text>` facing the viewer, placed with `P(x, y, z)`. Text inside `face()` comes out mirrored or upside down. Give each `<text>` an inline style with the page's variables, so that both themes and every brand work: `fill: var(--bs-ink)`, `var(--bs-muted)` or `var(--bs-accent)`, and `font: 600 8px var(--font)`, or `var(--mono)` for numbers. A card behind words uses `fill: var(--bs-elevated); stroke: var(--edge)`. The build cannot measure text, so call `grow(x0, y0, x1, y1, z0, z1)` over the floor area and heights the words cover; otherwise the view crops them.

`o` takes `{ top, side }` tones. Top tones: `plain` (default), `glass`, `metal`, `panel`, `chip`, `lens`, `flash`, `film`, `foil`, `graphite`, `magnet`, `oxide`, `polar`, `ir`, `red`, `green`, `blue`, `copper`, `brown` (coffee, wood, soil), `water` (see-through). Side tones: `chip`, `dark`, `glass`, `copper`, `brown`, `water`. Shared fills, used as `fill="url(#name)"`: `pores`, `tft`, `rgb`, `mesh`, `hatch`, `sensor`, `pads`, `fins`, `wires`, `bus`. A tone you need and do not find goes in the viewer's CSS for both themes, not as a raw colour in a model.

## Film

`index.html?film` plays a tour for `post-video`: take the thing apart, light the top layers one by one, dive down each `tour` stop's part ids, light its `light` layers, come home, put it together and show the end card. Without `tour`, it dives through the first part that opens, three levels at most.

A process at the top walks its steps in order instead, and takes each `tour` stop when it reaches the step that holds the stop's first part, then carries on to the next step; `together` shows the whole process again.

Each step is a beat with an id: `intro`, `<figure>#<layer>`, `into:<figure>`, `home`, `together`, `end`. A beat shown again gets `~2`, `~3`. `take-apart.mjs model.js --beats` prints them in order with the text each shows; a voice-over script uses these ids. When the page has `window.filmVoice`, each beat lasts at least as long as its line.

## URL states, for stills

`?theme=dark`, `?apart`, `?focus=<layer key>`, `?open=<figure path>` such as `?open=board/processor`. They combine.
