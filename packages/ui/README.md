# Brand Studio UI

69 typed React components for branded apps, AI agent interfaces, effects, visual storytelling and product pages.

## Install

Install the package in a React application with your package manager:

```sh
pnpm add @brand-studio/ui
# or: npm install @brand-studio/ui
# or: yarn add @brand-studio/ui
# or: bun add @brand-studio/ui
```

```tsx
import { ActionLink, BrandTheme, StoryHero } from '@brand-studio/ui';
import '@brand-studio/ui/styles.css';

// brand.tokens contains both light and dark BrandTokens.
// image is { src, alt, width, height, mobileSrc?, srcSet?, focalPoint? }.
<BrandTheme palette={brand.tokens} mode="system">
  <StoryHero
    title="A moment of your own."
    description="Coffee and a small pause in the day."
    asset={image}
    action={<ActionLink href="#ritual">Explore the ritual</ActionLink>}
  />
</BrandTheme>
```

## Selected API

| Export | Main props | Behavior |
|---|---|---|
| BrandTheme | palette, mode, children; div attributes | Scoped CSS variables; light/dark/system; no document mutation |
| Button | tone, loading; button attributes | Native action; default type=button; disabled during loading |
| ActionLink | href, tone; anchor attributes | Native navigation |
| TextField | label, hint, error; input attributes | Stable IDs; label and description associations |
| BrandImage | asset, priority, sizes | Intrinsic dimensions, optional responsive source, focal point |
| StoryHero | title, description, asset, action, eyebrow? | One h1; use once as the page hero |
| EditorialSection | title, children, asset?, id? | h2, text/media composition; one column on mobile |
| StorySequence | title, chapters, id? | h2/h3; sticky desktop images with crossfade; inline mobile/reduced-motion content |

Exported types: BrandTokens, BrandPalette, ImageAsset, StoryChapter.

The full component catalogue, live previews and props are in the [documentation](https://brandstudio.js.org/docs/).

Import the stylesheet once. Supply a validated palette; the library does not silently normalize bad brand values. Its CSS is scoped to `.bs-theme` and `.bs-*` classes. The package does not install fonts, so load your licensed font separately. It contains no photos.

The current client entry works in React applications and Next.js client boundaries. Static markup can render on the server, but browser behavior should be tested in the target framework. Peer range includes React 18.3 and 19; the showcase is tested with React 19.3 only.

## Story behavior and limits

Desktop enhancement requires >=900px and no reduced-motion preference. Without JavaScript or IntersectionObserver the inline story is readable. When reduced motion or viewport changes, observers are reconfigured and cleaned up. Every image remains described to assistive technology.

StorySequence is a crossfading image story, not video or 3D. The package also includes app controls, agent states and visual effects; see each component's documentation for its behavior and limits.

## Build

```sh
npm run build
```

The package exports ESM JavaScript, TypeScript declarations and CSS, with React as a peer dependency. Original source is MIT; third-party examples and assets retain separate terms.
