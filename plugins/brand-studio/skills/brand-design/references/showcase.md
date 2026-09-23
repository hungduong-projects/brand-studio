# Showcase pipeline: from brief to a reviewed, rights-clean page

Use this when the output is a showcase-grade page: a product launch, a hardware page with a 3D product, or an editorial release page. It runs after the concept and contract are agreed ([creative-direction.md](creative-direction.md), [contract.md](contract.md)) and ends with screenshots the user reviews before anything ships.

Two pages in this repository followed it: an editorial release page built on public-domain museum paintings, and a hardware page for a fictional camera built on a CC0 3D model.

## 1. Study the structure, not the surface

When the user names a reference site ("like apple.com"), open it in Playwright and write down its structure: section order, what is pinned, where the product sits, how the page changes from dark to light, and the type scale. Record these as layout facts in the contract's `direction.tier`.

Take nothing else from it: no media, copy, fonts, icons, code, product names or distinctive marks. Name the new brand yourself and search the web for the name before you use it. If the product is a real category (a camera, a phone), make the brand fictional and say so in the footer.

## 2. Source assets you are allowed to publish

Accept only licences with no conditions unless the user agrees to more: public domain, CC0, or media you rendered or generated yourself.

| Need | Source | Script |
|---|---|---|
| Paintings, prints, photographs | The Met Open Access, Art Institute of Chicago, IIIF services such as the National Gallery of Art and Getty | `scripts/fetch-open-art.py` |
| 3D models, HDR lighting | Poly Haven (all CC0) | `scripts/fetch-polyhaven.py` |
| Study of a reference site's media | Playwright capture, saved to a git-ignored folder | none; local study only, never shipped |

Pick the best asset, not the first one. For 3D, choose models with real wear, 2k or better PBR textures (colour, normal, roughness/metal) and separate meshes for the parts you want to move. Preview a candidate on a neutral stage before you build around it.

Keep raw downloads outside Git (`.git/info/exclude`). Commit the web derivative, a script that rebuilds it from the raw download, and a `PROVENANCE.md` with the source URL, author, licence and every change.

## 3. Clear trademarks and personal details

CC0 and public domain clear copyright, not trademarks. A CC0 model of a real product can still carry the maker's name. Before you publish any asset:

1. Run `scripts/texture-sheet.py <textures-dir>` and look at every map it writes. Engraved and embossed text often shows only in the normal or roughness map.
2. Zoom into each line of lettering at full resolution. Remove maker names, model names, logos, serials, town and country of origin, patent marks, stamps on straps or labels, and any person's name.
3. Recolour marks that act as brand signatures even without words, such as a maker's signature colour dot.
4. Keep generic markings: distance and aperture scales, shutter speeds, film speeds, arrows and function icons.
5. Make every edit in a script that covers the colour, normal and roughness maps together, so the mark does not survive as a bump. Rebuild, run the sheet again, then check close-ups on the rendered page.
6. Record each removal in `PROVENANCE.md`.

For paintings, check that the museum record says public domain, and crop to the composition you need rather than reproducing a museum's photo layout.

## 4. Build the set piece

One signature experience carries the page. The rest reuses shared primitives (`@brand-studio/ui` or the project's own).

For a 3D product page (three.js):

- One pinned canvas behind the page. Each story section names a pose: turn, tilt, distance, screen position, and how far the parts come apart.
- Between section midpoints, ease from one pose to the next, and damp toward the target each frame so fast scrolls stay smooth.
- An exploded view moves each mesh along the product's own axis. Convert world offsets into each mesh's parent space.
- Part labels are HTML, placed each frame from each part's projected centre. Check they do not collide.
- Load a small HDR environment for reflections, use ACES filmic tone mapping, and compress the model (glTF-Transform: WebP textures, meshopt, parts kept separate).
- Phones: centre the model, pull the camera back and shift the view so the product sits above the copy.
- Reduced motion: poses change as cuts with no drift, and every section still shows the product.
- The page stays readable before the model loads, with the canvas fading in once it is ready.

For an editorial page, use one image per chapter and a transition that belongs to the concept (a tile wave, a page turn), with a static fallback.

## 5. Test and review in a loop

1. Add the page to the project's end-to-end test. Check that the model or stage loads, each chapter goes live, labels stay on screen, controls respond, the phone layout does not scroll sideways, and the console has no errors.
2. Run `node scripts/shoot.mjs <url>` for desktop and phone screenshots of every section. It launches Chromium with the GPU on; a throttled browser window makes WebGL scenes look frozen.
3. Look at every screenshot. Fix framing (clipped product, copy over the product, overlapping labels) by changing the poses and layout, then shoot again.
4. Show the user the screenshots before you commit, and say what remains unverified.

The pipeline is done when the brand check, build, tests and end-to-end run all pass, `PROVENANCE.md` covers every asset, the trademark review is recorded, and the user has seen the screenshots.
