# Icons: UI glyphs and the app icon

Use this for product glyphs the existing icon set lacks, and for the app icon, favicon and store icons. `scripts/icons.mjs` checks the files and writes every export.

## Pick a style

Write `style` in the spec: `outline`, `solid` or `duotone`; outline is the default. Match the product's existing set first, since two styles in one interface read as two brands. Then choose from the contract's voice and surfaces:

- `outline`: strokes at one width. Suits dense product UI and calm or technical voices. Lucide and Heroicons' outline set draw this way.
- `solid`: shapes filled in the text colour, with details cut out by `fill-rule="evenodd"` and 2 px gaps. Suits bold, friendly or consumer voices, tab bars, and sizes where thin strokes blur. Heroicons' solid set draws this way.
- `duotone`: outline strokes over one or more tone shapes, each with `fill="currentColor"`, `fill-opacity="0.2"` and `stroke="none"`. Suits feature lists, onboarding and marketing pages for warm or editorial voices. Phosphor's duotone weight uses the same 20% tone.

`examples/icon-styles/` in the Brand Studio repository draws four glyphs in each style.

## UI glyphs

Start from the product's existing set; the Brand Studio docs site uses Lucide. Draw only the objects and actions specific to the brand, and give each glyph a `meaning`; a glyph without one is decoration.

The script checks the Lucide specification's hard rules ([Lucide](https://github.com/lucide-icons/lucide/blob/main/docs/contribute/icons/specification.md)):

- 24 × 24 canvas (`grid`), with the drawing, half the stroke included, at least 1 px from the edge.
- One stroke width across the set: `stroke` in the spec, matched to the product's existing icons (Lucide draws at 2).
- Outline and duotone strokes: round joins and caps, `fill="none"`, `stroke="currentColor"`. Solid shapes: `fill="currentColor"` and no stroke.
- No live text, images, CSS or scripts.

Review these on the sheet, because the script can't judge them:

- 2 px gaps between elements.
- Corner radius: 2 px on elements of 8 px or more, 1 px below.
- Visual weight close to Lucide's circle and square.
- Centred, with the detail of comparable Lucide icons.

Accessibility: hide decorative glyphs with `aria-hidden="true"`. An icon-only button carries its name on the button (`aria-label`), so its glyph stays hidden. A glyph that conveys meaning alone gets `role="img"` and a label.

Use the sprite as `<svg aria-hidden="true"><use href="/icons/sprite.svg#dh-ticket"/></svg>`, or inline a glyph from `glyphs/`.

## App icon

Build it from the contract's mark and signature device.

- Draw 1 to 4 layer SVGs on a 1024 canvas, bottom to top. These become Icon Composer's groups. Leave out the mask and the background; Icon Composer applies the mask and sets the background colour. Convert type to outlines; the script rejects `<text>` ([WWDC25 session 361](https://developer.apple.com/videos/play/wwdc2025/361/)).
- Android shows only the inner 66 of 108 dp on every mask. The script fails the icon when any pixel of the layers falls outside that circle ([Android](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)). That circle also satisfies the web's maskable safe zone of a 40% radius ([web.dev](https://web.dev/articles/maskable-icon)).
- A `monochrome` layer is optional. Without it, the script fills the layers in one colour for Android 13+ themed icons.
- `dark` is optional: a `background` and 1 to 4 `layers` drawn for dark mode. Redraw the colours; an inverted icon looks wrong. The SVG favicon switches to it when the browser is in dark mode.
- The script warns when a layer has under 20% of its pixels at 3:1, the WCAG minimum for graphics, against the background and the layers below it.

| Export | Use |
|---|---|
| `app/ios/<n>-<name>.svg` | Drag into a new Icon Composer file in order; set the background colour; check the Default, Dark, Mono and Tinted appearances. Needs Xcode 26. |
| `app/ios/icon-1024.png` | App Store and Expo `icon` |
| `app/android/foreground.png`, `monochrome.png` | Expo `android.adaptiveIcon.foregroundImage` and `monochromeImage`; set `backgroundColor` to the spec's background |
| `app/play-512.png` | Google Play listing |
| `app/pwa/*.png`, `app/manifest-icons.json` | Web app manifest `icons` |
| `app/web/favicon.svg`, `favicon-48.png`, `apple-touch-icon.png` | `<link rel="icon">`, Expo `web.favicon` and `<link rel="apple-touch-icon">` |
| `app/web/favicon.ico` | 16, 32 and 48 px in one file, served at `/favicon.ico` for browsers and tools that request it by default |

Opaque exports are RGB PNGs with no alpha channel, as the stores require.

## Run and review

```sh
node <this-skill>/scripts/icons.mjs <project>/brand/icons.json [--out DIR]
```

Open `glyph-sheet.png` (16, 24, 32 and 48 px on light and dark) and `app-sheet.png` (square, rounded and circle masks with both safe zones dashed, then 180 to 16 px on light, on dark with the dark drawing, and in grayscale). The script exits with an error after writing the files when a glyph crosses the 1 px margin or the icon leaves the Android safe zone, so you can see the problem. `examples/deskhand/icons/` in the Brand Studio repository is a complete set.
