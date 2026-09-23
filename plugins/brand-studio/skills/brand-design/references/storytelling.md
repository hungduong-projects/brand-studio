# Continuous visual storytelling

Apple's homepage demonstrates a sequence of concise product posters. A product page such as [Mac mini](https://www.apple.com/mac-mini/) expands into design, use cases, capability, ecosystem and purchase support. Borrow the progression and art direction, not Apple's copyrighted assets, copy, marks or typefaces.

## Narrative model

Promise -> material/origin -> craft -> benefit in use -> next action is one useful product story. Adapt it to the business. Each chapter answers one question and carries one primary visual. Keep copy in HTML and keep a usable action available early.

Plan transitions as a continuity ledger:

| Transition | Preserve | Change | Why |
|---|---|---|---|
| Whole cup to beans | Light direction, steel surface, cobalt cue | Scale and subject detail | Explain the material |
| Beans to pour | Palette, camera language, cup geometry | Action | Show craft |
| Pour to finished cup | Same cup and environment | Moment and composition | Return to the promise |

For a coffee shop, business essentials such as real opening hours, menu, location and directions must remain easy to find. Do not invent them for a concept.

## Choose the cheapest adequate motion

- CSS state transitions for hover and focus.
- IntersectionObserver plus CSS crossfade for chapter changes.
- Motion for React state/layout relationships.
- GSAP ScrollTrigger for genuinely continuous scrubbed timelines and complex pinning.
- Rive for stateful authored vector artwork.
- Video for real movement; a still-image crossfade is not a video.
- Three.js only when real interactive 3D is necessary.

One owner per animated property. Clean up observers and timeline instances. Default to native scrolling. Avoid forced scroll snapping and scroll hijacking. Desktop sticky scenes become inline images on narrow screens; reduced motion gets all chapters in normal flow.

## Media delivery

Prefer MP4/WebM video over large GIFs for photographic motion; supply a poster and playback controls. Respect autoplay restrictions and reduced motion, suspend off-screen playback, and defer noncritical downloads. Use responsive AVIF/WebP images with explicit dimensions and meaningful focal points. Prioritize only the actual hero/LCP asset. A filmstrip of hundreds of decoded full-size images is an explicit memory tradeoff, not a default.

Sources: [web.dev video performance](https://web.dev/learn/performance/video-performance), [GIF replacement](https://web.dev/articles/replace-gifs-with-videos), [W3C pause/stop/hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide/).
