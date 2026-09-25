# Creative direction: from brief to a distinctive site

Read this after the brand basics and before the storyboard, whenever a page needs to be memorable, not just correct. It covers how to choose a concept, how much spectacle the business can afford, which signature devices to use, and how to produce the imagery and transitions.

Evidence comes from a Playwright study (2026-09-23) of Shopify Editions, Nike, Cloudflare, Linear, Raycast and Framer. Observed facts are summarised; the method is our synthesis.

## 1. A concept beats a style

A style is a look ("dark, minimal, glassy"). A concept is an idea that generates decisions ("a Renaissance for an AI release"). The concept tells you what the images show, what the type evokes, how sections change and what the jokes are. A style tells you none of that.

Look for concepts in these places:

- **A pun or a truth in the offer.** Shopify's "Ren*ai*ssance" or "Boring" ("nothing new, everything improved").
- **An era or medium with the right associations.** Renaissance means craft and rebirth, 80s synthwave means optimism, the 1995 web means honesty and plainness.
- **The product's own material.** Linear, Raycast and Framer show their product UI as the hero, and Cloudflare turns its network into a globe diagram.
- **The customer's world.** Nike shows athletes in use and the coffee study shows the ritual.

Test a concept with four questions:

1. Can you say it in five words?
2. Does it produce at least five concrete visual decisions (subject, material, type, colour role, transition)?
3. Does it survive on the least glamorous section, such as a pricing table or feature list?
4. Could a competitor use it unchanged? If so, it is a style, not a concept.

Write two concepts, score them against the brief, and record why the winner won.

## 2. Fit the ambition to the business

The same brief deserves different levels of spectacle depending on what visitors come to do. Pick the tier first, then the concept.

| Business / page type | Visitor job | Tier | What carries identity | Constraint to respect |
|---|---|---|---|---|
| Retail, fashion, sport (Nike) | browse, buy | photographic | photography, one display face, one button shape | speed, merchandising flexibility, frequent campaign swaps; chrome stays neutral |
| Developer or infra platform (Cloudflare) | evaluate, trust | diagrammatic | one brand colour, construction lines, proof numbers | clarity, proof, docs links; no decoration without data |
| Product-led SaaS (Linear, Framer) | understand the product | product-as-hero | real product UI, surface steps, restrained type | the UI must be real or clearly a mock; dark mode and density |
| Tool or utility (Raycast) | download, try | tactile | physical depth, keycaps, abstract light | a CTA with requirements next to it; performance |
| Launch, release or annual event (Shopify Editions) | explore what is new | cinematic | a concept world, 3D or collage, chaptered story | long content must stay navigable; a static fallback |
| Local business (café, clinic, studio) | find, visit, book | editorial | photography of the real place, a warm voice | hours, location, menu and booking stay one tap away |
| Personal, portfolio or agency | judge taste | expressive | an authored signature device | projects load fast; the work outranks the frame |

The tiers use cumulative budgets. Photographic uses images and CSS. Diagrammatic adds SVG and light motion. Product-as-hero adds video and mocks. Tactile and cinematic add Rive, WebGL and authored 3D. Move up a tier only when the concept needs it and the team can maintain it.

## 3. Hold the system constant and vary the world

Shopify Editions change concept, typefaces, palette and even technology every six months. The chapter list, "Read help doc" links, CTA wording and nav position stay the same. Decide early:

- **Invariants:** nav, primary action label and position, content model (chapter → feature → link), accessibility floor, performance budget.
- **Variables:** display typeface, palette, imagery medium, transition device, soundtrack or texture.

Record both in the brand contract. A campaign then becomes a new "world" on top of a stable product system.

## 4. Signature device catalogue

Choose one or two devices that come from the concept, and repeat them until they become recognisable. Each device below lists where it was observed.

- **A brand colour as an object inside the imagery.** Shopify painted its purple into a portrait mask, a velvet robe and a cherub's cap. Recognition comes without a logo.
- **Anachronism collage.** Period art holding modern devices (Shopify). It works when the concept is about change or rebirth.
- **A swash or drop initial.** One ornamental letter per chapter promise, never in body copy (Shopify, ImperialScript).
- **Giant chapter words.** A single 150px+ word per chapter, tracked tight (Shopify "Agentic", Nike "SPOTLIGHT").
- **A two-tone heading.** A white claim followed by a grey elaboration inside one heading (Linear).
- **Construction lines.** Dashed guides, corner ticks and golden-ratio arcs drawn in on load (Cloudflare, Shopify). They signal precision.
- **Physical depth.** Bevelled stacked shadows and keycaps (Raycast).
- **A texture ground.** UI screenshots placed on gold leaf, plaster, paper or velvet in place of flat colour (Shopify).
- **A period-medium parody.** The whole page as a 1995 website, a record shelf or a TV ad (Shopify Boring, Editions index).
- **A persistent chapter index.** Roman numerals and live progress in a fixed side rail that inverts over dark scenes (Shopify).

Avoid stacking devices that belong to different concepts.

## 5. Typography roles

Distinctive sites give each typeface one job and never overlap them:

| Role | Example (observed) | Use |
|---|---|---|
| Display | NeueMontreal Bold 167px, -0.03em, lh 0.9 | one word per chapter |
| Voice | high-contrast serif about 40px, -0.05em | the chapter's single promise sentence |
| Ornament | script swash | the first letter of the promise only |
| Text/UI | grotesk or Inter, 14-18px | features, body, buttons |
| Data | mono (Berkeley, Apercu, Geist, DM Mono) | code, IDs, requirements, microcopy |

Tracking tightens as size grows: about -0.02 to -0.05em at display sizes and 0 at body size. Three to four faces are fine when every role is distinct. Two faces is the safe default.

## 6. Imagery pipelines

Match the pipeline to the tier and state it in `brand/asset-plan.md`.

- **Photography (real or generated).** Follow imagery.md: master shot, then reference-guided scenes, then side-by-side QA.
- **Collage or anachronism.**
  - Source period art with known rights: public-domain museum scans, licensed stock or commissioned painting. Record each source.
  - Composite the modern object in, then match the lighting, grain and craquelure so the object belongs to the painting.
  - Keep brand-colour objects exact by compositing, not by prompting.
  - Generated painting is allowed only with provenance recorded. Never imitate a living artist's style by name.
- **Product UI as image.** Use real screens or clearly labelled mocks with realistic data, framed on texture grounds or in a bordered stage. Export at 2x and never fake metrics.
- **Authored 3D.**
  - Model per scene and keep glTF/GLB files small.
  - Use KTX2 textures and one environment map for consistent light.
  - Date-stamp versions (Shopify's `_251209v5` naming shows how many iterations a scene takes).
  - Give each scene a still or video fallback.
- **Captured 3D (Gaussian splats, photogrammetry).** Use these for real places or rich environments. They need a GPU tier check and a still fallback.
- **Vector state animation (Rive/Lottie).** Use for UI illustrations and mascots, with per-state static fallbacks for mobile.

Whatever the pipeline, each concept needs a material list (e.g. craquelure, gold leaf, cream paper, velvet), a light direction, and a rule for where the brand colour may appear.

## 7. Transitions as story

A transition should say what changes between chapters.

| Device | Says | Cheapest build |
|---|---|---|
| Crossfade same subject | "same thing, closer look" | CSS opacity + IntersectionObserver |
| Paper tear or reveal | "behind the page is another world" | SVG mask with a rough path animated on scroll, or a WebGL overlay if 3D is already present |
| Camera move through one set | "a continuous place" | a keyframed sequence (Theatre.js / GSAP) scrubbed by scroll over a single three.js scene |
| Sticky media, copy scrolls | "one object, many facts" | CSS `position: sticky` |
| Colour-field wipe | "new chapter, same system" | a CSS clip-path or transform on a full-bleed block |
| Line draw-in | "precision, construction" | SVG `stroke-dashoffset` transition (Shopify: 3s) |
| Mode switch (text mode or video mode) | "choose how to consume" | a route or state toggle with the same content model |

Rules:

- One transition vocabulary per site. Shopify repeats the same tear for every chapter.
- Author timing once, in one place: a keyframe file or timeline per scene with explicit camera, asset, light and overlay tracks.
- Scroll maps to time. Never hijack scroll speed.
- Reduced motion and no-WebGL get the chapter content in normal flow with the scene's still frame.

## 8. Constraints checklist before committing to a tier

- **Content volume.** Long release notes need a chapter index and repeated beats; a single-message page does not.
- **Update cadence.** Weekly campaigns favour photographic swaps; a twice-yearly launch can justify 3D.
- **Team skill and tooling.** Who can edit a GLB, a Theatre.js file or a Rive state machine after launch?
- **Device spread.** Detect the GPU tier or use a simple heuristic, then serve lower-cost scenes or stills. Test at 390px.
- **Performance budget.** Keep the hero LCP under 2.5s with the 3D deferred. The first paint must show real text (Linear's hero was blank before its animation ran; avoid that).
- **Accessibility.** Pause for auto-motion over 5s, a text alternative for scene-only information, and the index usable by keyboard.
- **Rights.** Art, fonts, music and captured locations each need a recorded licence.
- **Honesty.** Mock data, fictional stores and generated scenes carry labels.

## 9. Output of this step

Add to `brand/storyboard.md`:

1. The concept in five words, the runner-up, and why the winner won.
2. The tier and the constraint that set it.
3. Invariants versus the variables for this world.
4. One or two signature devices, and where each appears.
5. Type roles.
6. The imagery pipeline and material list.
7. The transition vocabulary with its fallback.

Borrow principles from the references; never copy their art, copy, fonts, models or characters.

## 10. Measure the category's colours before choosing a palette

Guessing a palette from adjectives produced a muddy dark page on Deskhand. Measure instead:

1. List 5-10 leaders in the category and 3 direct competitors.
2. For each, load the page in Playwright, wait for it to settle, and collect `getComputedStyle` background colours weighted by element area over the first 2500px, text colours, the body font and the first filled button (its background and text colour).
3. Note which are light or dark, where the brand colour appears (field, object, button only) and how many words the hero uses.
4. Offer 3-4 palettes through the host's question tool (AskUserQuestion previews in Claude Code; a numbered list elsewhere): hex values with roles, plus a 4-line ASCII layout showing where the brand colour lands. Recommend the one that follows from the concept.

2026 baseline (AI agents and SaaS, measured 2026-09-23): light off-white page, near-black ink, one saturated colour used big (Clay's forest field and lime CTA, Fin's orange object, Ramp's lime button). A thin accent on a dark page does not read as a brand. Record the measurements in the project's lessons file.
