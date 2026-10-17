# Effects catalogue

Use this when you pick or build the effects a page uses. Each entry names the look, the mechanism, its cost, the phone variant and, where useful, an original starting sketch. Tune the constants to the brand's palette and motion; the sketches are written for a three.js `ShaderMaterial` on WebGL2.

Contents: [1. Choosing](#1-choosing-effects) · [2. Scene materials](#2-scene-materials) · [3. Screen passes](#3-screen-passes) · [4. Cursor and touch](#4-cursor-and-touch) · [5. Transitions](#5-transitions) · [6. Text](#6-text) · [7. Scroll](#7-scroll) · [8. Sound](#8-sound) · [9. Effect code sources](#9-effect-code-sources)

## 1. Choosing effects

A page earns one signature effect, one or two supporting effects and a final grade. More than that reads as a demo reel, and every effect after the first dilutes the one people should remember.

- Tie each effect to the concept in one sentence ("the dither is the brand's print heritage"). An effect you cannot justify that way goes.
- Cost: **low** is per-material maths or one cheap full-screen pass; **medium** adds a render target or several passes; **high** runs a simulation over many texels every frame.
- Every effect needs a phone variant and a reduced-motion variant before it ships. Write them down when you pick the effect, not after.

## 2. Scene materials

### Fresnel rim

A glow on edges that face away from the viewer; makes objects read against dark backgrounds. Cost: low.

```glsl
float facing = max(dot(normalize(vNormal), normalize(vViewDir)), 0.0);
col += uRimColor * pow(1.0 - facing, uRimPower);
```

### Toon bands

Flat cel shading with two or three steps and a coloured shadow instead of black. Cost: low. Pairs with screen-space outlines (section 3).

```glsl
float l = max(dot(N, L), 0.0);
float band = min(floor(l * uBands), uBands - 1.0) / (uBands - 1.0);
vec3 col = mix(uShadowColor, uLitColor, band);
```

### Noise wobble

A soft, breathing surface: move each vertex along its normal by noise. Cost: low to medium, set by vertex count. Phone: halve the subdivision.

```glsl
float n = snoise(position * uFreq + uTime * uSpeed);
vec3 displaced = position + normal * n * uAmp;
```

Recompute normals from neighbouring samples, or the lighting stays flat while the shape moves.

### Thin-film bubbles and glass

Iridescent soap, glass or chrome. Map film thickness and view angle to a hue shift, weight it by fresnel, and add a ripple that starts at a hit point and decays. Cost: low to medium.

```glsl
float ndv = max(dot(N, V), 0.0);
float thickness = uThickness + snoise(vPos * 3.0 + uTime * 0.1) * uVariation;
vec3 film = 0.5 + 0.5 * cos(6.2831 * (thickness * (1.0 - ndv) + vec3(0.0, 0.33, 0.67)));
float ring = sin(distance(vPos, uHitPos) * 40.0 - uHitProgress * 20.0) * (1.0 - uHitProgress);
col = mix(base, film, pow(1.0 - ndv, 3.0) + ring * 0.2);
```

### Fake interior depth on flat surfaces

Windows, display cases or screens that look deep without geometry. Offset the inner texture's UV by the camera's offset from the window centre, scaled by a depth mask. Cost: low.

```glsl
vec2 camOffset = clamp((uWindowCenter - cameraPosition.xy) / uSpan, -uMax, uMax);
float depth = texture2D(uDepthMask, vWindowUv).g - 0.5;
vec4 inner = texture2D(uInterior, vWindowUv + camOffset * depth * uStrength);
```

Clamp the offset and use smaller constants on phones, where the camera moves more relative to the screen.

### Projected light (gobo)

Shaped light across a wall or floor: window frames, leaves, a logo. Project a light-cookie texture from a light position and multiply it into the surface colour; drift its UV with low-frequency noise so the light breathes. Cost: low.

### Dissolve with a burning edge

An object or image appears or disappears through noise, with a bright band at the edge. Cost: low.

```glsl
float n = snoise(vPos * uScale) * 0.5 + 0.5;
float keep = step(uProgress, n);
float band = (1.0 - smoothstep(uProgress, uProgress + uEdge, n)) * keep;
col = mix(col, uEdgeColor, band);
if (keep < 0.5) discard;
```

### GPU particles

Thousands of points that flow, swarm or form a shape. Store positions in a float texture, update them in a fragment shader with curl noise (three.js `GPUComputationRenderer`), and draw points that read their position from that texture. Cost: high. Phone: a quarter of the count and a half-resolution simulation.

## 3. Screen passes

Every full-screen pass costs fill rate at full resolution. Keep the stack short, and on phones drop to the grade plus the signature pass.

### Ordered-dither scan

A retro, printed or "scanning" look. Pixelate the UV to a grid, take the luminance and compare it with a 4x4 Bayer threshold. Cost: low.

```glsl
vec2 cell = floor(vUv * uResolution / uPixel) * uPixel / uResolution;
float luma = dot(texture2D(uScene, cell).rgb, vec3(0.299, 0.587, 0.114));
ivec2 p = ivec2(mod(gl_FragCoord.xy / uPixel, 4.0));
float bayer[16] = float[](0.,8.,2.,10., 12.,4.,14.,6., 3.,11.,1.,9., 15.,7.,13.,5.);
float on = step((bayer[p.y * 4 + p.x] + 0.5) / 16.0, luma);
gl_FragColor = vec4(mix(uInk, uPaper, on), 1.0);
```

Animate `uPixel` or a reveal mask during transitions, then return to the clean scene.

### Screen-space outlines

A hand-drawn or cel look over a whole scene. Render each object's flat colour (or an ID) to a target, then draw a line wherever a pixel differs from its neighbours. Cost: medium (one extra target).

```glsl
vec2 px = 1.0 / uSize;
vec3 c = texture2D(uIds, vUv).rgb;
float edge = length(c - texture2D(uIds, vUv + vec2(px.x, 0.0)).rgb)
           + length(c - texture2D(uIds, vUv - vec2(px.x, 0.0)).rgb)
           + length(c - texture2D(uIds, vUv + vec2(0.0, px.y)).rgb)
           + length(c - texture2D(uIds, vUv - vec2(0.0, px.y)).rgb);
gl_FragColor = vec4(mix(texture2D(uColor, vUv).rgb, uLine, step(uThreshold, edge)), 1.0);
```

### Library passes

`postprocessing` (section 9) ships these ready to combine; build your own only for the signature look.

| Pass | Use it for | Watch for |
|---|---|---|
| Bloom (selective) | Light sources, emissive UI, neon | Bloom on everything flattens the image |
| Depth of field | One subject in focus, product hero | Costly; text inside the canvas blurs too |
| Chromatic aberration | Glitch, lens character, speed | Keep it at the edges; centre text must stay sharp |
| Noise and grain | Film texture, hides banding in gradients | Animate slowly or it reads as static |
| Vignette | Pulls the eye to the centre | Subtle; a dark ring looks dated |
| Pixelation, scanlines, dot screen | Retro, print, screen-on-screen | Pair with the concept, not as decoration |
| God rays | Light through a window or haze | Needs a clear light source in frame |
| SSAO | Contact shadows in a modelled interior | Costly; bake ambient occlusion instead when the scene is static |
| Glitch, shock wave | A single moment (a click, a transition) | Never as a constant state |

### Final grade

One last full-screen pass: a colour lookup table (LUT) or a curve, ACES or AgX tone mapping, light grain and a vignette. It ties mixed assets into one palette and is the cheapest way to make a scene look on-brand. Cost: low.

## 4. Cursor and touch

### Trail, frost or ink

The cursor leaves a mark that fades or spreads. Keep two render targets; each frame, read last frame's trail, fade it, stamp a soft disc at the cursor and write to the other target, then swap. Cost: medium.

```glsl
float prev = texture2D(uTrail, vUv).r * uFade;
vec2 d = (vUv - uCursor) * vec2(uAspect, 1.0);
float stamp = 1.0 - smoothstep(0.0, uRadius, length(d));
float spread = max(texture2D(uTrail, vUv + uDir).r, texture2D(uTrail, vUv - uDir).r) * 0.92;
gl_FragColor = vec4(max(max(prev, stamp * uDown), spread * uSpread), 0.0, 0.0, 1.0);
```

Use the trail as a mask in the visible shader: reveal a second image, add refraction or blend in a frost texture. On touch, stamp along the finger's path; do not leave the effect idle.

### Fluid

Ink or smoke that swirls behind the cursor: a stable-fluids solver (advect, divergence, pressure iterations, gradient subtract) at half resolution. Cost: high. Phone: a quarter resolution and fewer pressure iterations, or swap to the trail above.

### Image hover distortion

DOM images drawn as WebGL planes that bend toward the cursor. Sync each plane to its image's `getBoundingClientRect()` every frame, keep the `<img>` in the DOM for accessibility, and offset the UV by the cursor's velocity with a falloff. Cost: low per image.

```glsl
vec2 toMouse = vUv - uMouse;
float f = exp(-dot(toMouse, toMouse) * uFalloff);
vec2 uv = vUv - uVelocity * f * uStrength;
float split = 0.003 * f;
gl_FragColor = vec4(texture2D(uImage, uv + vec2(split, 0.0)).r, texture2D(uImage, uv).g, texture2D(uImage, uv - vec2(split, 0.0)).b, 1.0);
```

### Magnetic targets and custom cursor

Buttons that lean toward the pointer and a cursor that changes shape over targets. Move the button by a fraction of the pointer's offset inside a radius and spring it back on leave. Enable only under `(hover: hover) and (pointer: fine)`; keep the native cursor visible or the replacement as large as a pointer.

## 5. Transitions

### Noise dissolve between images

```glsl
float n = snoise(vUv * uScale) * 0.5 + 0.5;
float edge = smoothstep(uProgress, uProgress + uWidth, n);
vec3 col = mix(texture2D(uTo, vUv).rgb, texture2D(uFrom, vUv).rgb, edge);
col += uGlow * (1.0 - abs(edge * 2.0 - 1.0)) * step(0.001, uProgress);
```

### Displacement slide

Both images slide along a displacement map's values, so the cut follows the texture (brush strokes, ripples, stripes).

```glsl
float d = texture2D(uDisp, vUv).r;
vec4 a = texture2D(uFrom, vUv + vec2(d * uProgress * uStrength, 0.0));
vec4 b = texture2D(uTo, vUv - vec2(d * (1.0 - uProgress) * uStrength, 0.0));
gl_FragColor = mix(a, b, uProgress);
```

### DOM and route transitions

- Mask wipes with `clip-path` (circle from the click point, diagonal bars) for DOM sections; animate the path, not layout.
- The View Transitions API for route changes in a multi-page site; name the shared element so a thumbnail grows into the next page's hero.
- In a WebGL scene, a camera cut with a short dither or dissolve often reads better than a long camera travel between distant poses.

## 6. Text

- **Split reveal.** Wrap each line in an `overflow: hidden` mask and slide its inner span up from 100%, staggered by line. Split after `document.fonts.ready` and again on resize, or line breaks drift.
- **Scramble or decode.** Characters cycle through random glyphs and settle left to right. Put the final text in `aria-label` so screen readers hear it once, and use a monospace or tabular font so the width holds.
- **Variable-font axes.** Drive weight, width or a custom axis from scroll or pointer distance. One family, no extra files.
- **MSDF text in 3D.** Labels and headlines inside the scene stay sharp at any distance; reveal them with the same dissolve or dither the scene uses.
- **Marquee and text on a path.** Fill a band with repeated type; pause it on hover and under reduced motion.

## 7. Scroll

- **Pinned sections.** Hold a section while its timeline plays, then release. Keep the pinned distance proportional to what plays; long empty pins feel broken.
- **Scroll-scrubbed video.** Encode with a keyframe on every frame or two (`ffmpeg -g 1`) so seeking stays instant, and set `currentTime` from scroll inside `requestAnimationFrame`. A host that answers `Range` requests with a full 200 never seeks; load the file as a blob URL there.
- **Image sequence.** Preloaded WebP or AVIF frames drawn to a canvas; steadier than video seeking on some browsers, heavier to load. Halve the frame count on phones.
- **Horizontal section.** A pinned track that moves sideways as you scroll down. Give it visible progress and keep it short.
- **Velocity skew and stretch.** Skew or scale content by the smoothed scroll velocity, clamped, easing back to rest.
- **Parallax layers.** Move layers at different rates. Small offsets look rich; large ones make people seasick.

## 8. Sound

Sound effects carry as much of the feel as the visuals, and they fail more loudly.

- Start nothing before a click. The gate's click resumes the `AudioContext`.
- UI one-shots: a soft tick on hover, a click, a whoosh on a transition. Keep each under half a second and quieter than the ambience.
- Ambience per zone or section, crossfaded as the reader moves; positional audio (`PannerNode`) for objects in a world.
- Tie a filter to scroll velocity or depth (a `BiquadFilterNode` cutoff) so the soundscape responds to movement.
- A visible mute control on every screen; remember the choice. Sources and licences are in [sources.md](sources.md).

## 9. Effect code sources

Use these to build effects. Checked on 2026-10-17; re-check the licence before you ship.

| Source | What it gives you | Licence |
|---|---|---|
| three.js and its examples | Renderer, loaders, `GPUComputationRenderer`, post passes | MIT |
| `postprocessing` (pmndrs) | Bloom, depth of field, chromatic aberration, noise, vignette, LUT, tone mapping, god rays, outline, pixelation, scanline, dot screen, glitch, shock wave, SSAO | zlib |
| THREE-CustomShaderMaterial | Adds your shader code to three.js's lit materials, so lighting and shadows still work | MIT |
| webgl-noise (Ashima, Gustavson) | Simplex and classic noise in GLSL | MIT |
| OGL | Minimal WebGL library for a single full-screen shader or a light scene | Unlicense (public domain) |
| Lenis | Smooth scroll | MIT |
| GSAP, with ScrollTrigger and SplitText | Timelines, scroll triggers, text splitting | Standard "No Charge" GSAP License: free for commercial sites; bars no-code visual animation tools that compete with Webflow |
| Theatre.js | Visual keyframe editor for camera and scene timelines | `@theatre/core` Apache 2.0; `@theatre/studio` AGPL 3.0, so keep the studio out of the production bundle |
| LYGIA | Large GLSL and WGSL function library | Prosperity License plus Patron License: commercial use needs sponsorship, a contribution or a paid licence |
| Shadertoy | Thousands of shader studies | Per shader; read the licence in each code header. No stated licence means no permission, and NC licences bar commercial sites |

Study tutorials and demo galleries for technique, then write your own code. Codrops' licensing page could not be read when this was checked, so treat its demo code as study material only.
