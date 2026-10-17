# Brand Studio plugin

Brand Studio skills for Claude Code, Codex, Gemini CLI and other agents that read Agent Skills:

- `brand-design` produces a brand contract, visual storyboard, consistent-image direction, implementation guidance and a verification record.
- `take-apart` builds an exploded view that comes apart layer by layer, with parts you click to zoom into, as one interactive page in a brand's colours.
- `check-visual` checks a page or visual in every state, at desktop and phone widths, light and dark, and returns one verdict line and one contact sheet.
- `post-video` records a page as a video sized for Facebook, Instagram, Reels, Stories or YouTube, with an optional Fish Audio voice-over and a captions file.

## Contents

- `.codex-plugin/plugin.json`: supported Codex compatibility manifest.
- `.claude-plugin/plugin.json`: Claude manifest.
- `skills/brand-design/SKILL.md`: one portable workflow with conditional references.
- `skills/brand-design/scripts/brand-check.mjs`: Node.js contract and contrast checker; optional CSS export.
- `skills/brand-design/scripts/film-render.mjs` and `scripts/film/`: product-film kit and MP4 renderer; `assets/film-starter.tsx` is a starter film.
- `skills/brand-design/scripts/tutorial-capture.mjs` and `scripts/film/tutorial.tsx`: capture a how-to tutorial from the running product and film it with the shared tutorial template.
- `skills/brand-design/scripts/mascot.mjs` and `scripts/mascot-3d.mjs`: mascot rig checker, state renderer and optional soft-3D renders.
- `skills/brand-design/scripts/icons.mjs`: UI glyph checker, sprite and app icon exports for iOS, Android, Google Play, PWA and web.
- `skills/brand-design/scripts/figure.mjs` and `scripts/figure-3d.mjs`: explainer figure checker and exporter, with optional 3D renders; draws an isometric object from a parts list and writes an interactive page, stills, a model for the `ExplainerFigure` component and an optional MP4 in the brand's tokens.
- `skills/brand-design/scripts/aesthetics.mjs`: audit of mascots, glyphs and app icons for corner curvature, stroke and radius consistency, weight, detail and symmetry.
- `skills/brand-design/assets/still.brand.json`: fictional coffee example.
- `skills/take-apart/scripts/take-apart.mjs`: checks a model and builds it into one page; `assets/kit.js` draws, `assets/viewer.html` is the page and `assets/phone.js` is a four-level example.
- `skills/check-visual/scripts/check-visual.mjs`: state, layout, text and target-size checks with a contact sheet.
- `skills/post-video/scripts/post-video.mjs` and `scripts/voice-over.mjs`: social video recorder with voice and captions, and the Fish Audio narration client.

It bundles no hooks, MCP servers, credentials, upstream skills, auto-running executables or image-generation service. Image generation and browser verification depend on tools present in the assistant host. `voice-over.mjs` calls Fish Audio only when you run it with your own `FISH_API_KEY`.

## Install in any agent

```sh
npx skills add hungduong-projects/brand-studio --skill brand-design
gemini skills install https://github.com/hungduong-projects/brand-studio.git --path plugins/brand-studio/skills/brand-design
```

The first command installs to `.agents/skills` and links the skill for each agent it detects. Swap `brand-design` for `take-apart`, `check-visual` or `post-video` to add the others.

## Install locally in Codex and Claude Code

From the Brand Studio workspace:

```sh
codex plugin marketplace add .
codex plugin add brand-studio@brand-studio-local
claude plugin marketplace add .
claude plugin install brand-studio@brand-studio-local --scope user
```

Start a new Codex or Claude Code session after installation. In Codex, invoke
`$brand-design`; in Claude Code, invoke `/brand-studio:brand-design`. The other
skills follow the same pattern, such as `$take-apart` and `/brand-studio:take-apart`.
The marketplace catalogs live at `.agents/plugins/marketplace.json` and
`.claude-plugin/marketplace.json` in the repository root.

## Local Claude test

From the Brand Studio workspace:

```sh
claude --plugin-dir ./plugins/brand-studio
```

Then invoke `/brand-studio:brand-design`. Example: “Create a brand system for my coffee shop and a connected, responsive visual story. Use my real menu and location when supplied.”

Manifest validation:
```sh
claude plugin validate ./plugins/brand-studio
```

## Limits

The checker verifies contract shape and selected text contrast, not design quality or full WCAG conformance. Generated images can vary between runs, so review each one.

Original text and helper code are MIT. Tool providers and externally sourced assets have their own terms.
