# Experience patterns: shape, stack, choreography and budget

Use this when you choose what the page's signature experience is and how it runs. The effects themselves live in [effects.md](effects.md), the page parts in [components.md](components.md), and the assets in [sources.md](sources.md).

The patterns come from teardowns of recent award-winning sites. They describe technique only. Build every effect from scratch for the brand, and restyle it if a viewer would name the site it came from.

## 1. Pick the experience shape

| Shape | What carries it | Typical stack |
|---|---|---|
| Scroll-driven world or gallery | A camera that travels a path as the reader scrolls; each section is a pose | three.js, a keyframe timeline (Theatre.js or GSAP ScrollTrigger), Lenis smooth scroll |
| Explorable little world | A character or cursor that moves through a stylised scene with sound | three.js, a custom outline pass, positional audio, decoding in workers |
| Gated campaign | A splash screen with one "Enter" button that unlocks sound and loads the heavy scene | Any of the above, plus a small first payload |
| Interactive surface | The cursor paints, melts or reveals something on a full-screen plane | Two render targets used in turn (ping-pong) and one full-screen shader |
| Motion without WebGL | Pinned sections, video and Lottie or Rive animation driven by scroll | GSAP ScrollTrigger, Lenis, video, Rive or Lottie |

The page framework (React, Vue, Svelte) does not decide the result. The scene layer and its choreography do. Pick one shape per page; two signature experiences compete for the same attention and the same GPU.

## 2. Stack defaults

- Renderer: current three.js. Use React Three Fiber only when the page is already React. OGL suits a single full-screen shader with no scene graph.
- Geometry: Draco or meshopt compression. Keep parts that move as separate meshes.
- Textures: KTX2 (Basis) for anything the GPU samples; WebP or AVIF for DOM images.
- Decoding: Draco, KTX2 and custom formats decode in web workers so the loader animation never stalls.
- Choreography: Lenis for scroll, then either GSAP ScrollTrigger (code-driven) or Theatre.js (camera keyframes authored visually and exported as JSON).
- Sound: WebAudio, or Howler on top of it. Short looping ambiences per zone, one-shot UI sounds, positional audio for objects in the world.
- Text in 3D: MSDF fonts, so labels stay sharp at any distance.

Licences for each library are in [effects.md](effects.md) under "Effect code sources".

## 3. Choreography

1. A loader that is itself on-brand: a drawn icon, a progress line or an object assembling. It covers the decode time.
2. The gate: one button (Enter, Begin, Start) with a sound-on line. The click unlocks the AudioContext and starts the intro camera move.
3. One pinned canvas behind the page. Each section names a camera pose or a timeline position; ease between them and damp toward the target every frame.
4. Interaction that rewards attention: hover states in the scene, a cursor that leaves marks, sound on contact.
5. Reduced motion: replace the camera travel with cuts and keep every section's message visible.

## 4. Loading and budget

- Keep the payload before the gate small: the page shell, the loader and the first frame. Stream the heavy scene after the click or while the reader is on the splash screen.
- Compress geometry and textures, and send short audio loops (OGG, with M4A for Safari) instead of long tracks.
- Ship a cheaper mobile variant through shader defines (`#ifdef USE_MOBILE`), a lower device pixel ratio and fewer post passes, rather than a separate site.
- Show a static fallback with the same story when WebGL is unavailable.

## 5. Done when

The brand-design skill's showcase test loop passes ([showcase.md](../../brand-design/references/showcase.md), step 5) with the GPU on. The gate, loader, every section and the mobile variant appear in screenshots. Sound starts only after a click and has a visible mute control. No effect copies a reference site's code, media or recognisable composition.
