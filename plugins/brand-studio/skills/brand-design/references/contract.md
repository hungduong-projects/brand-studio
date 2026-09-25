# Brand contract v1

A project-owned JSON object with:
- `schemaVersion: 1`
- `name`, `positioning`, `audience`: nonempty strings
- `voice`: three or more concise voice traits
- `primaryAction`: `label` and `href` (same-page anchor, project-relative path or HTTPS URL)
- `tokens.light` and `tokens.dark`: surface, elevated, ink, muted, accent, onAccent, line (six-digit hex colors); font (CSS font-family); radius (nonnegative px/rem value); optional accentText, a hex accent for text and small marks when the accent itself is too light to read as text, such as yellow
- `imagery`: subject, materials, lighting, palette, invariants array, avoid array
- `motion`: character and reducedMotion strings
- `chapters`: nonempty array of unique id, question, message, visual, transition and mobileFallback strings
- `evidence`: array of facts with source, or an empty array for an explicitly fictional concept
- Optional `tokens.<mode>.voiceFont`: a second CSS font-family for the voice role (the promise line under display type); see [creative-direction.md](creative-direction.md)
- Optional `direction`: `concept` and `tier` strings, plus `devices`, `invariants` and `variables` text arrays recording the creative direction

Use [still.brand.json](../assets/still.brand.json) as a populated example. This is a compact Brand Studio format, not the DTCG specification.

Run the checker before generating CSS. Its contrast checks cover ink/muted on surface/elevated, onAccent on accent, and accentText on surface/elevated when set. Components draw accent-coloured text with accentText, falling back to accent, so a brand whose accent fails 4.5:1 on its surface needs accentText. Image overlays, focus indicators, UI boundaries, token usage in application code and other accessibility requirements need separate review. Exported CSS uses `[data-brand="slug"]` and an optional nested `data-theme="dark"` attribute on the same element; see the generated comment. BrandTheme uses the same contract with its own scoped variables.
