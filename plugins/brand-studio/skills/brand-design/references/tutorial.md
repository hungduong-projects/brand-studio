# Tutorial films

A tutorial film teaches one task in a live product: the viewer watches the real screens, follows a numbered list of steps and can repeat the task straight away. A series of tutorials shares one film template, so each new film costs one steps file instead of new code.

Use it for in-product help, onboarding and internal training. A launch clip or homepage intro belongs in [product-film.md](product-film.md).

## Plan the series

1. List the tasks by role: who opens the product, and what each person must finish there.
2. Give each task one film. Split a task that needs more than about twelve steps; at three seconds a step, that keeps a film under a minute.
3. Name each film by the task, as a verb phrase: "Submit an expense claim", not "Claims overview".
4. Record the list in `brand/storyboard.md` with the role, the steps and the result the viewer sees at the end.

## Use demo data only

A tutorial reaches everyone who can open the page. Capture it from a local or staging copy of the product, with a demo user and seeded demo records. Never capture real customer, staff, salary or payment data, and never blur real data instead of seeding demo data. A missed blur publishes the record. Make the seed re-runnable, so each capture starts from the same records.

Sign the demo user in with a setup module. Its default export receives the Playwright browser context and the product's origin:

```js
// tutorials/setup.mjs
export default async (context, base) => {
  await context.addInitScript(session => localStorage.setItem('app-session', session), process.env.DEMO_SESSION);
};
```

Flows that call a third party (accounting, payment, email) must not run against a live account during capture. Point them at a sandbox, or stop the film at the step before the external call and show the confirmation the product displays.

## Write the steps

One JSON file per film, in the product's repository so it changes with the UI:

```json
{
  "app": "Claims",
  "title": "Submit an expense claim",
  "url": "claims.example.com",
  "locale": "en-SG",
  "steps": [
    { "goto": "/", "caption": "Open Claims" },
    { "click": "#new-claim", "caption": "Click New claim" },
    { "fill": "#amount", "text": "45.60", "caption": "Enter the amount", "note": "Use the amount on the receipt, in its own currency." },
    { "upload": "input[type=file]", "files": ["tutorials/demo/receipt.jpg"], "aim": "#dropzone", "caption": "Attach the receipt" },
    { "click": "#submit", "caption": "Click Submit", "waitFor": ".claim-row" },
    { "view": ".claim-row .status", "caption": "Your claim shows Pending" }
  ]
}
```

- One action per step. Start with `goto` and navigate by clicks after it, as the viewer would.
- Captions are commands of two to six words that name the label on screen exactly.
- `note` adds one sentence of context to the written guide; the film shows only the caption.
- A `fill` types its text key by key. A date, month or time input takes the ISO value instead (`2026-10` for October 2026) and gets it in one step, since a browser's date picker drops keys typed across the capture's pauses.
- Set `locale` to the audience's locale. Text the product formats with `Intl` or `toLocaleDateString` follows it (`en-SG` shows 16/10/2026); without it, headless Chromium formats as `en-US` (10/16/2026). On macOS a native date input ignores it and shows the capture machine's short date format from System Settings.
- End on a `view` of the result, so the viewer knows what success looks like.
- Prefer stable selectors (`id`, `data-*`, labels). A capture fails on a missing selector, which also flags a tutorial the UI has outgrown.

## Capture, film and render

```sh
node <this-skill>/scripts/tutorial-capture.mjs --steps tutorials/submit-claim.json --base http://localhost:5173 --setup tutorials/setup.mjs
node <this-skill>/scripts/film-render.mjs --tutorial tutorials/captures/submit-claim --theme tutorials/theme.json --stills 3,6,9
node <this-skill>/scripts/film-render.mjs --tutorial tutorials/captures/submit-claim --theme tutorials/theme.json --out public/tutorials --blur 1
```

The capture writes one screen per step at 2x, the target's box and typing frames, then `manifest.json`. Run it from a folder that has `playwright-core`; upload paths resolve from that folder. The render needs no film file: `--tutorial` mounts the shared template with the theme, one file per product:

```json
{
  "colors": { "ink": "#14213d", "onInk": "#ffffff", "surface": "#ffffff", "accent": "#8ecae6", "muted": "#5c677d", "stage": "#f3f5f8" },
  "font": "Inter, Arial, sans-serif",
  "fonts": [{ "family": "Inter", "weight": 600, "file": "@fontsource/inter/files/inter-latin-600-normal.woff2" }],
  "logo": "./logo-white.png",
  "outro": "Watch it again any time from the Watch how button where this task starts."
}
```

Take the colours from the brand contract's semantic roles. A `logo` or font `file` that starts with `.` is relative to the theme file; any other font file resolves as a package in the render folder. The logo sits on the ink cards, so use the light version.

The template opens on a title card, then shows the product in a browser window beside a rail of numbered steps. The current step is large, finished steps get a check mark, and a progress bar fills. The camera zooms to each target, less for a wide one so the whole target stays in view. A ring marks the target before the click and the screen crossfades to the result. It closes on a card with the outro line. Screens change in steps, so `--blur 1` is enough and renders four times faster.

Review the stills before the full render: the ring and cursor sit on the target, every control the film clicks does something in the product (read its handler; a button with no handler films fine and fails the viewer), no screen shows real data, every caption matches its screen, and any record the viewer must check matches its document (a claim and its receipt show the same merchant, date and total).

## Publish with a written guide

- Put each film behind a Watch how button beside the action it teaches: the button that starts the task, on the page where the task starts. Show the button only to roles that can take that action. A central help page sends the viewer away from the task and back again; a button beside the action is found at the moment of need.
- Open the film in a dialog with its written steps beside it. The written steps are the same captions and notes, numbered, so the video is never the only way to learn the task.
- Name the button in the outro line, so the viewer knows where to find the film again. Change the outro and re-render every film when the films move.
- Use `controls`, `preload="metadata"` and the poster frame. Do not autoplay a tutorial: the viewer starts it when ready.
- The render also writes `<name>.vtt`, one cue per step with its caption and note. Add it as `<track kind="captions" srcLang="en" label="English">` without `default`: the film already shows the captions, and the track gives screen readers the text and satisfies `jsx-a11y/media-has-caption`.
- Keep each file near 1.5 MB per 10 seconds; raise `--crf` before cutting resolution.
- When the UI changes, rerun the capture with the same steps file and re-render. Fix a failed selector in the steps file, not by hand-editing screens.
