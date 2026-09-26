# Brand Studio plugin

A shared brand-design skill for Claude Code, Codex, Gemini CLI and other agents that read Agent Skills. It produces a brand contract, visual storyboard, consistent-image direction, implementation guidance and a verification record.

## Contents

- `.codex-plugin/plugin.json`: supported Codex compatibility manifest.
- `.claude-plugin/plugin.json`: Claude manifest.
- `skills/brand-design/SKILL.md`: one portable workflow with conditional references.
- `skills/brand-design/scripts/brand-check.mjs`: Node.js contract and contrast checker; optional CSS export.
- `skills/brand-design/scripts/film-render.mjs` and `scripts/film/`: product-film kit and MP4 renderer; `assets/film-starter.tsx` is a starter film.
- `skills/brand-design/assets/still.brand.json`: fictional coffee example.

It bundles no hooks, MCP servers, credentials, upstream skills, auto-running executables or image-generation service. Image generation and browser verification depend on tools present in the assistant host.

## Install in any agent

```sh
npx skills add hungduong-projects/brand-studio --skill brand-design
gemini skills install https://github.com/hungduong-projects/brand-studio.git --path plugins/brand-studio/skills/brand-design
```

The first command installs to `.agents/skills` and links the skill for each agent it detects.

## Install locally in Codex and Claude Code

From the Brand Studio workspace:

```sh
codex plugin marketplace add .
codex plugin add brand-studio@brand-studio-local
claude plugin marketplace add .
claude plugin install brand-studio@brand-studio-local --scope user
```

Start a new Codex or Claude Code session after installation. In Codex, invoke
`$brand-design`; in Claude Code, invoke `/brand-studio:brand-design`.
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
