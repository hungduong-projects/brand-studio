---
name: aesthetic-websites
description: Build an award-level, immersive website in the style of Awwwards, FWA or CSSDA winners - a real-time 3D or WebGL scene, shader and post-processing effects, scroll-driven camera or storytelling, cursor trails and hover distortion, page transitions, kinetic type, a gated "Enter" experience with sound - broken into components, with effects chosen for one concept and every asset (3D models, HDRIs, textures, stock video, music, sound effects, fonts, icons, Lottie or Rive files) sourced under a licence the site can use. Use when someone wants a site that looks award-winning, unique, immersive, "crazy", "next level" or not like a template, asks for three.js, React Three Fiber, GLSL shaders, WebGL effects, GSAP ScrollTrigger, Lenis or Theatre.js work on a marketing page, wants to know which effects or components such sites use, wants a reference site's technique studied, or needs free and commercially usable 3D, video, sound or font sources. Pair with brand-design when the brand or concept is not yet agreed.
---

# Aesthetic websites

Build the kind of site that wins design awards: one signature real-time experience, a few effects that all serve one concept, choreography that rewards attention, assets with clean rights, and a page that still works on a phone, without WebGL and under reduced motion.

This skill owns the experience build. The brand-design skill owns the concept and the brand contract. When neither exists, agree a concept first, either through brand-design's [creative-direction.md](../brand-design/references/creative-direction.md) and [contract.md](../brand-design/references/contract.md) or as a one-paragraph brief the user approves. An effect with no concept behind it is decoration, and award juries see a hundred of those a day.

## Workflow

1. **Concept.** Write one sentence that names the idea the page expresses and the feeling a visitor leaves with. Every later choice traces back to it.
2. **Shape.** Pick one experience shape ([patterns.md](references/patterns.md), section 1). Two signature experiences compete for the same attention and the same GPU.
3. **Components.** Break the page into its parts ([components.md](references/components.md)) and write the component sheet in `brand/experience.md`. Leave out parts the concept does not need.
4. **Effects.** Pick one signature effect, at most two supporting effects and a final grade ([effects.md](references/effects.md)). Write each effect's phone and reduced-motion variant into the sheet now; retrofitting them later breaks the build.
5. **Assets.** Source every model, texture, clip, sound, font and icon from [sources.md](references/sources.md) under its rules, and record each one in `PROVENANCE.md`.
6. **Build.** Start with the signature experience alone, at full quality, before the page around it: it carries the most risk. Then follow the stack defaults, choreography and loading budget in [patterns.md](references/patterns.md).
7. **Verify.** See "Done when" below.

## Studying a reference site

When the user names a site ("like this one"), open it in a real browser (Playwright or Chrome DevTools) and write notes, not code:

- its experience shape and the components it uses, named from [components.md](references/components.md);
- each effect, named from [effects.md](references/effects.md), and what it does for the story;
- what loads before the gate and what streams after it (the network panel shows `.glb`, `.ktx2`, `.drc`, `.ogg` and worker files);
- how sound, phones and reduced motion are handled.

Take nothing else: no code, shaders, media, copy, fonts or recognisable composition. Build each effect from scratch for the brand, and restyle anything a viewer would name.

## Component sheet

One row per part. A short example for a fictional stationery brand whose concept is "a notebook that prints itself":

| Part | Job | Effect | Assets | Phone | Reduced motion |
|---|---|---|---|---|---|
| Loader | A pen line draws the logo while models decode | SVG stroke | Own SVG | Same | Static logo and progress text |
| Gate | "Open the notebook", with a sound line | Dither reveal on click | None | Same | Instant cut |
| Stage | Desk scene; the camera turns page to page | Ordered-dither scan (signature), toon bands | CC0 desk props, own paper textures | Pixel ratio 1.5, no outline pass | Cuts between pages |
| Sections | One spread per product line | Split reveal on headlines | Brand fonts (OFL) | Stacked layout | Text shown at once |
| Sound | Paper rustle on page turns, room tone | Filter tied to scroll speed | CC0 sound effects | Same | Same; muted until clicked |

## Done when

- The concept sentence, the component sheet and the effect list with phone and reduced-motion variants exist in `brand/experience.md`.
- `PROVENANCE.md` covers every asset, nothing carries a non-commercial licence, and assets that need credit appear on a credits page.
- Screenshots with the GPU on (brand-design's `shoot.mjs`) show the loader, the gate, every section, the phone layout, reduced motion and the no-WebGL fallback, and you have looked at each one. With the check-visual skill, its check passes.
- The console has no errors, frame time stays steady while scrolling on a throttled CPU, sound starts only after a click, and a mute control is always visible.
- Nothing copies a reference site's code, media or recognisable composition.
- The user has seen the screenshots, with anything unverified named.
