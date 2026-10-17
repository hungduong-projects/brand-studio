# Component breakdown

An award-level page is a small set of parts, each with one job. Break the page into these parts before you build, and write a component sheet: one row per part with its job, its states, the effect it uses ([effects.md](effects.md)), its assets ([sources.md](sources.md)) and its budget. Parts the concept does not need stay out.

| Part | Job | States to design |
|---|---|---|
| Loader | Covers decoding and makes the wait feel like the brand | Progress, done, failed |
| Gate | One choice that unlocks sound and starts the experience | Idle, hover, pressed, sound on or off |
| Stage | The pinned canvas that carries the signature experience | Loading, live, paused, fallback |
| Scroll system | Turns scroll into poses, timeline positions or section changes | Rest, moving, reduced motion |
| Sections | The story, in readable HTML over or beside the stage | Entering, active, leaving |
| Navigation | Where am I, and a way to jump | Closed, open, current chapter |
| Cursor and hover | Rewards attention without hiding the pointer | Default, over target, pressed, touch |
| Text treatment | Headlines that move with the concept | Hidden, revealing, settled |
| Media | Video, image sequences, Lottie or Rive | Poster, playing, paused |
| Transitions | Moves between sections, scenes or routes | Before, during, after |
| Sound | Ambience and interface sounds | Muted, playing, crossfading |
| Grade | One last pass that unifies the palette | One state; tuned per scene |
| Fallbacks | The same story without WebGL, motion or sound | No WebGL, reduced motion, save-data |
| Credits | Asset credits and the brand's own footer | One state |

## Loader

- Draw it in the brand's language: a line that fills, an icon that draws itself, an object that assembles. A spinner says "template".
- Drive progress from real loading (three.js `LoadingManager`, fetch progress), smoothed so it never runs backward. Give it a minimum display time so a fast load does not flash.
- Mark the page `aria-busy` while it shows, and show a plain message with a retry if loading fails.

## Gate

- One button with a verb (Enter, Begin, Start) and a short line about sound. A second, quieter choice enters without sound.
- The click resumes the `AudioContext`, starts the intro move and moves focus to the first section.
- Keep the gate keyboard-reachable on first paint, and let the reader skip straight to the content below it.

## Stage

- A fixed canvas behind the DOM. Clamp the device pixel ratio (2 on desktop, 1.5 on phones is a sane start) and resize with the window.
- Pause rendering when the tab is hidden or the stage is off screen (`visibilitychange`, `IntersectionObserver`).
- Fade the canvas in once the first frame renders; the HTML stays readable before that.

## Scroll system

- Lenis for smooth scroll, then ScrollTrigger or your own mapping from scroll progress to a pose or timeline position.
- Damp toward the target each frame (`current += (target - current) * (1 - exp(-k * dt))`) so a fast flick stays smooth.
- Native scrolling must keep working: anchors, keyboard, find-in-page and screen readers.

## Sections

- Real HTML text, not text baked into the canvas or video, so it stays selectable, translatable and indexable.
- Check contrast against the frame behind it at every pose, not just the first; add a scrim where the scene gets bright.
- Each section states its message without the effect. Under reduced motion it still reads complete.

## Navigation

- A small fixed bar or an overlay menu with chapter names, plus a progress indicator tied to scroll.
- The menu traps focus while open, closes on Escape and returns focus to its button.

## Cursor and hover

- Custom cursors and magnetic buttons only on `(hover: hover) and (pointer: fine)`. Touch gets tap feedback instead.
- Hover effects in the scene need a DOM equivalent for keyboard focus.

## Text treatment

- Split reveals, scramble, variable-font axes or MSDF text in the scene ([effects.md](effects.md), section 6). One treatment for headlines, applied the same way everywhere.
- Load fonts before splitting, and keep the unsplit text available to assistive technology.

## Media

- Video: a poster frame, `muted playsinline` for autoplay, and a pause control for anything longer than five seconds.
- Scroll-scrubbed video or image sequences follow [effects.md](effects.md), section 7.
- Lottie for vector loops exported from After Effects; Rive when the animation needs states and inputs (hover, progress, toggles).

## Transitions

- One transition family per page, taken from the concept ([effects.md](effects.md), section 5).
- Keep each under a second, and never block input while it runs.

## Sound

- Nothing plays before the gate's click. A mute control is visible on every screen and remembers its state.
- Layers: one ambience per zone, short interface sounds, positional sounds for objects. Crossfade between zones.

## Grade

- One full-screen pass with a LUT or curve, tone mapping, grain and a vignette, tuned for the brand's palette ([effects.md](effects.md), section 3).

## Fallbacks

- No WebGL: a still or video of the scene with the same sections and copy.
- Reduced motion: cuts instead of camera travel, no parallax, no autoplaying loops; content complete.
- Low power or `Save-Data`: the phone variant with fewer passes and smaller textures.

## Credits

- List every asset whose licence asks for credit, with author, source and licence, in a credits page or the footer. Keep the full record in `PROVENANCE.md`.
