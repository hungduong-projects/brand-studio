---
name: take-apart
description: Build an exploded view that takes a thing apart layer by layer, or a process that walks through its steps one by one, where a click on a part zooms into that part's own layers or steps, as one interactive page in a brand's colours that can also play as a film. Use when someone asks how something is built or made, what is inside a product, device, machine, building, plant or body part, how a process, pipeline or system works step by step (how an AI model is trained, how a parcel gets delivered), wants an exploded diagram, teardown, cutaway, layer stack, process diagram or a visual they can click into and zoom in and out of, or says "take it apart", "show the layers", "step by step" or "how is a phone built".
---

# Take apart

Make a thing understandable by pulling its layers apart, one idea per layer, and letting the reader click into any part to see its own layers. Make a process understandable the same way, one step at a time: its steps stand side by side, joined by arrows, and the view glides from one to the next. The result is one self-contained `index.html`: light and dark, keyboard and touch, reduced motion, and a `?film` tour that `post-video` records.

`assets/phone.js` is a finished example, four levels deep: phone, logic board, processor, silicon die, plus the camera, battery, coil and screen. Read it before you write a model; copy its shape, not its drawings.

## Workflow

1. **Plan the stack on paper first.** For the top figure, list 4 to 7 layers from the bottom up, so taking it apart shows how the whole thing is built (a figure a part opens needs 2 or more), each with a title of 30 characters or fewer and a readout of about two lines (under 110 characters). Mark the parts worth opening and list the layers of each one. Four levels is plenty; each level should answer the question the one above raises ("what's in the chip?"). For a process, list its 4 to 7 steps in order instead, as `steps` in place of `layers`, and open a step into its own layers or steps where the viewer would ask "what happens in there?".
2. **Check every readout against a source.** Readouts teach, so each fact must hold for the thing in general. Where products differ, say so ("some phones add a ring of magnets"). Leave out model-specific numbers unless the user gave the model and a source.
3. **Write the model** as a `.js` file that ends with `model({ ... })`, using the kit's drawing helpers. `references/model.md` holds the format, the kit and the drawing rules.
4. **Build and check it**: `node scripts/take-apart.mjs model.js --brand brand/brand.json --out DIR`. It runs the model in Node, with no browser, and prints one JSON line. Fix every entry in `fails`; read `warnings` as judgement calls. `--brand` takes a brand contract with `tokens.light` and `tokens.dark`; without one the page stays neutral.
5. **Look at it in every state.** With the check-visual skill, run `check-visual.mjs DIR/index.html`; the page lists each figure and each lit layer for it, and adds its own checks (pins cut off, hidden labels, parts that open with nothing to click). Read the one sheet it writes rather than taking screenshots by hand.
6. **Film it** when the user wants a video: `node scripts/take-apart.mjs model.js --beats` lists the film's beats and what each one shows, then the post-video skill records `DIR/index.html?film` and can narrate it beat by beat.

## Why it is built this way

- One idea per layer keeps the reader's attention on the lit layer, the way a good diagram signals what matters. More than 7 layers crowd the labels, and more than 6 pins crowd a layer, so the build warns.
- The drawing carries no words. Titles, readouts and part names live in the list beside it, where they stay readable on a phone and can be translated.
- The kit draws in one fixed isometric view from simple solids. Models stay short, every figure matches the others, and the build can check bounds and pins without a browser.
- Depth comes from `open`: a part with `open: 'board'` and a matching `hit('board', id, ...)` in its layer's drawing zooms into figure `board`. The build fails when a part opens a figure that does not exist or has nothing to click, and when a figure cannot be reached.
- The page reads its colours from the brand's tokens and its material tones from CSS, so one model renders in any brand.

## Taste

- Draw the real silhouette and the few details that make a part recognisable: a camera bump, a port, a coil's rings. Skip screws and texture noise.
- Use the material tones the viewer defines (`glass`, `metal`, `chip`, `lens` and the rest in `references/model.md`) instead of raw colours, so dark mode and brands keep working.
- Put the accent only on what is lit. Do not draw logos or trademarks of real products.
- A reference image is for technique only. If a viewer would name the reference, redraw it.
