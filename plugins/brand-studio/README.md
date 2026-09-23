# Brand Studio plugin

A shared brand-design skill for Codex and Claude Code. It produces a brand contract, visual storyboard, consistent-image direction, implementation guidance and a verification record.

## Contents

- `.codex-plugin/plugin.json`: supported Codex compatibility manifest.
- `.claude-plugin/plugin.json`: Claude manifest.
- `skills/brand-design/SKILL.md`: one portable workflow with conditional references.
- `skills/brand-design/scripts/brand-check.mjs`: Node.js contract and contrast checker; optional CSS export.
- `skills/brand-design/assets/still.brand.json`: fictional coffee example.

It bundles no hooks, MCP servers, credentials, upstream skills, auto-running executables or image-generation service. Image generation and browser verification depend on tools present in the assistant host.

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
`.claude-plugin/marketplace.json` in the repository root. When releasing changes
to the plugin, bump its version in both plugin manifests and update the installed
plugin so each host refreshes its cached copy.

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

## Codex distribution

The Codex compatibility manifest is supported by the official plugin-creator workflow. The same skills directory can be packaged for a local marketplace or a skills-only public submission. Creating an archive does not install it. See the workspace release guide and [official packaging docs](https://developers.openai.com/plugins/build/plugins).

Keep host-specific configuration in the corresponding manifest and brand knowledge in the shared skill. A skill does not need an MCP server unless it provides an external service integration.

## Limits

The deterministic checker proves contract shape and selected text contrast, not design quality. No amount of prompting guarantees identical generated product geometry. Review all images. Do not claim full WCAG conformance, installation, publishing or production readiness from schema validation.

Original text and helper code are MIT. Tool providers and externally sourced assets have their own terms.
