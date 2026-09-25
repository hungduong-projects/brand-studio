# Brand Studio

Brand Studio turns business facts and visitor purpose into a durable brand contract, then applies that contract across websites and other creative artifacts.

[![Brand Studio UI documentation homepage showing components in three demo brands](assets/readme/brand-studio-ui.webp)](https://brandstudio.js.org/)

[Live docs](https://brandstudio.js.org/) · [Component catalogue](https://brandstudio.js.org/docs/) · [Examples](https://brandstudio.js.org/examples/) · [npm package](https://www.npmjs.com/package/@brand-studio/ui)

It combines a design workflow, an optional accessible React UI package and public examples in one workspace. The system preserves a brand's positioning, voice, typography, colour logic, imagery and signature devices without forcing every output into one visual template or package.

## Products

| Product | Location | Current status |
|---|---|---|
| Brand Studio UI | [packages/ui](packages/ui/README.md) | 93 typed React components for apps, AI agents, effects, story pages and product pages |
| Brand Studio plugin | [plugins/brand-studio](plugins/brand-studio/README.md) | Shared brand-design skill with Codex and Claude manifests |
| Showcase | [apps/showcase](apps/showcase/) | Interactive component library and completed brand studies |
| Docs | [apps/docs](apps/docs/) | Public component docs: live previews in any demo brand, props and copyable code |
| Public examples | [examples](examples/README.md) | Curated standalone proofs, currently focused on authored motion |

Install the published [`@brand-studio/ui`](https://www.npmjs.com/package/@brand-studio/ui) package with npm, pnpm, Yarn or Bun. Browse the [component documentation](https://brandstudio.js.org/docs/).

## Run

Requires Node.js 22.12 or newer and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

```sh
npm run check:brand
npm test
npm run build
npm run typecheck
```

## License

Source code is MIT. Third-party assets keep their own terms; see the `PROVENANCE.md` file next to each.
