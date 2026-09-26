# Product films

A product film shows the product doing its job, the way a screen recording would: someone asks, the product works in steps the viewer can follow, and real output appears. Draw it in code with the film kit, render it frame by frame and review stills before the full render.

Use it for a homepage intro, a launch clip or a feature walkthrough of 10 to 45 seconds. A campaign's still formats belong in [campaign.md](campaign.md); a single hero loop of a 3D product belongs in [showcase.md](showcase.md).

## Storyboard first

Write `brand/storyboard.md` before any code. One row per beat: time range, what the viewer sees, the one caption, and the proof it rests on.

A story that works for tools and agents runs input to output:

1. **Ask.** A person types a real request into a chat or field. The cursor clicks the field, the text types, the cursor clicks send.
2. **Set up.** The install or configuration the product needs, shown in a terminal with its real commands and results.
3. **Work.** The product's steps in order: a task list, tool calls, a file being written, an approval the person gives.
4. **Proof.** Real output. Capture the product's own pages or screens; never mock a result the product did not make.
5. **Lockup.** Mark, name, one line from the contract, the address.

Give each beat one caption of five to eight words. Solve crowding with time: when a frame needs two captions, it needs two beats.

## Build with the kit

`scripts/film/kit.tsx` and `kit.css` draw a 1152x648 world. Start from `assets/film-starter.tsx`, copy it into the project as `film/film.tsx` and point its kit import at this skill.

- Every value is a function of the time `t`. Use `ease`, `keys` and `rise` with the kit's bezier curves. CSS transitions, timers and effects that run on their own break frame stepping; the renderer parks CSS animations at `t`, nothing else.
- `Camera` eases between shots `{ at, x, y, zoom }`. Zoom to 1.4 to 1.5 on the element that is changing, hold while it changes, pull back before the next beat. Check that the zoomed frame keeps the whole target in view, including a button at the far edge.
- `AppWindow`, `BrowserWindow` and `Terminal` carry the product. Style them with the brand's semantic tokens, and give the chrome of other tools a plain neutral palette, so the brand shows only where the brand lives.
- `Cursor` stops name a CSS `target`. `aim` measures where that element sits at the stop's moment, so a click lands on the real button after layout, zoom or copy changes. An `offset` alone moves from the stop before, for moves after a click removes its target. `hover` gives the target a hover ring for the last 0.2 s before the click.
- `Caption` sits on a white pill in the lower third, so it reads over dark and busy frames.
- An agent reply reads like a real chat: a thinking line that settles to "Thought for 1s", text that streams word by word, a short numbered plan, then tool calls with running and done states. Use the product's real components for these where they exist.
- Page captures scroll while the film plays. Pick each capture with `Math.floor((t - start) * fps + 1e-4)`: rounding lets motion-blur sub-frames of one video frame show two captures, and the blend ghosts every line of text.

## Render and review

```sh
node <this-skill>/scripts/film-render.mjs --film film/film.tsx --name intro --stills 1,4,9,15
node <this-skill>/scripts/film-render.mjs --film film/film.tsx --name intro --site https://example.com --out public/videos
```

Run it from the project, which supplies react, react-dom, esbuild and playwright-core. The renderer captures at 2x and scales to 1920x1080 with ffmpeg, because a fractional device scale leaves seams under rounded boxes. `--blur 4` renders four sub-frames per frame and averages them for motion blur. `--site` captures each page listed in `window.film.pages`.

Review loop:

1. Render stills at every beat and at each click, and view them as one contact sheet.
2. Check each still: the cursor tip sits on its target, nothing clips at the frame or window edge, captions read, text is not ghosted and the camera frames the change.
3. Fix, re-render those stills, then render the full MP4.
4. Pull frames from the MP4 itself at the clicks and during page scrolls; motion blur can fail only in the encoded file.

## Ship checks

- `ffprobe` reports 1920x1080, the planned fps and the planned duration.
- Keep the file near 1.5 MB per 10 seconds. Raise `--crf` before cutting resolution; scrolling page captures cost the most bits.
- Embed it muted, looping and `playsInline`, with `preload="metadata"` and the poster frame. Autoplay only when `prefers-reduced-motion` is `no-preference`, give it a labelled pause control, and describe the story in a caption tied with `aria-describedby`.
- Check the embed at 390 and 1440 wide and with reduced motion, then again on the live host.
- Record fonts, captured pages and any images in the provenance file next to the video.
