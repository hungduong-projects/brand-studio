---
name: check-visual
description: Check a web page, diagram, chart or interactive visual in every state it can be in, at desktop and phone widths, light and dark, and get one verdict line plus one contact sheet instead of a pile of screenshots. Use before calling a visual done, after building or changing a page, landing section, figure or animation, when labels overlap or text is cut off, when something looks broken on a phone or in dark mode, or when the user asks to test, QA, screenshot or verify how a page looks.
---

# Check visual

`scripts/check-visual.mjs` loads a page at each width and theme, walks every state the page lists, and fails on the faults a person would spot by eye. It prints one JSON line and writes one `sheet.png`, so a review costs one short read and one image, not a dozen screenshots.

```sh
node scripts/check-visual.mjs page.html [--widths 1440,390] [--themes light,dark] [--out DIR] [--motion]
```

It accepts a file, a `file:` URL or an `http(s)` URL. It needs `playwright-core` in the project and a Chromium: Playwright's own, or Chrome, Brave or Edge already installed. States are drawn with reduced motion so each one is settled; `--motion` turns animation back on.

## What fails

- Console errors and uncaught exceptions.
- A page that scrolls sideways.
- Text drawn over other text.
- `[data-visual="label"]` elements that overlap each other, or leave their `[data-visual="frame"]` or the screen.
- Text cut off by a box that hides its overflow.
- Text below WCAG 2.2 AA contrast against the solid colour behind it: 4.5:1, or 3:1 for large text. Text over an image or gradient is skipped, so look at those on the sheet.
- Buttons and links under 24 by 24 px with no room around them (WCAG 2.2 target size, level AA).
- Every message the page's own `window.visual.check()` returns.

Warnings: buttons under 44 px tall at phone widths, and text under the smallest size Apple's guidelines allow (11 px on iOS, 10 px on macOS).

## Make a visual checkable

A page with no hooks is checked as it loads. To check every state, define:

```js
window.visual = {
  states: () => ['closed', { id: 'open', sheet: true }],  // `sheet: true` puts the state on the contact sheet
  go: async id => { /* draw state id, then wait for it to settle */ },
  check: () => [],  // problems only this visual knows about, as sentences
};
```

Mark labels with `data-visual="label"` and the area they must stay inside with `data-visual="frame"`. `check()` is where a visual tests its own rules: a pin cut off at the edge, a label hidden while its layer is shown, a link with no target. A take-apart page already defines all three.

## Read the result

`{ states, fails, warnings, sheet, report, first }`. `first` lists up to 12 fails with where they happen, such as `label "Battery" overlaps "Board" by 6px (phone#inside @ 390 dark +3)`. Fix the cause in the visual, not the check. Then open `sheet.png`: it shows the states marked `sheet` at the first width and theme, and the first state at every other width and theme. Look for what no rule catches: weak hierarchy, a crowded corner, a colour that fights the brand. `report.json` holds every fail and warning with up to five places each.

Run it again after every fix; a fix for one width often breaks another.
