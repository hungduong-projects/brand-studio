# Apply the brand system

Use this guide after the creative direction and contract are agreed, before implementing pages or product UI. The goal is traceability: important brand decisions should produce consistent downstream behavior rather than isolated styling.

## Translate decisions into surfaces

| Brand source | Apply it to |
|---|---|
| Positioning, audience, evidence | Information hierarchy, hero promise, proof order, calls to action |
| Direction concept and devices | Composition, repeated visual motif, product demonstration, section transitions |
| Colour tokens | Page surfaces, text, borders, controls, focus, status and data visualization |
| Type roles | Display, body, labels, data, code, controls and dense product views |
| Shape and spacing | Cards, fields, buttons, dialogs, grouping and layout rhythm |
| Voice | Headlines, buttons, navigation, onboarding, empty/error/loading states |
| Imagery rules | Subject, crops, screenshots, illustration, lighting, materials and exclusions |
| Motion rules | Opening, transitions, feedback, loading, reduced-motion and static fallbacks |

The contract is the source of truth, but it only changes the rendered product when the implementation consumes its semantic roles. Avoid copying raw hex values or one-off measurements into components when a semantic token should govern them.

## CSS token layer

Map contract values to scoped semantic custom properties. Components consume meanings such as `surface`, `ink`, `accent` and `line`, not palette-specific names such as `yellow` or `navy`.

Derive secondary values with `color-mix()` when supported by the target stack, and keep light and dark modes role-compatible. Add project-specific tokens for spacing, type scale, focus, status or data visualization only when the interface needs them. Define status colors by meaning and verify contrast; do not reuse the brand accent as an error or success color merely because it is available.

## Components and states

Specify each reused component across the states the product actually needs: default, hover, focus, active, disabled, loading, error, success, empty and selected. Brand application includes behavior and hierarchy, not just restyling.

Marketing pages may spend more of the motion and typography budget. Product surfaces should preserve the same identity while prioritizing task clarity, information density and predictable interaction.

## Use the real product as evidence

When a working product already exists, let the landing page show it. Inspect the real flow with Playwright, browser tooling or an authorized product MCP before designing a mock. Choose one representative task that directly proves the page's main claim, then capture a clear product state or short demonstration for the relevant section.

Use the real interface as evidence, not as decoration:

- capture a complete, credible workflow or state rather than an unrelated dashboard overview;
- use controlled demo data and remove personal data, customer records, secrets, internal URLs, account identifiers and private notifications;
- confirm the user is authorized to capture and publish the product surface;
- preserve the product's actual behavior and limitations; do not edit a capture to imply functionality that was not observed;
- crop or frame the capture for the page without hiding information needed to understand the task;
- provide intrinsic dimensions, meaningful alternative text and a responsive treatment;
- give video or animated demonstrations a static poster and reduced-motion fallback; and
- record the source, capture date, route or product state, tool and material edits in the asset plan or provenance record.

Prefer a screenshot when one state proves the point. Use a short interaction demo only when sequence, transformation or feedback is the evidence. If authorized product access is unavailable, request supplied captures or use a clearly labelled conceptual mock; never present invented UI as a live product.

## Iconography

The v1 contract does not define icon fields. Record project-level icon rules in `brand/storyboard.md` or a nearby design-system document until the schema gains a justified optional field. Define only what the product uses:

- library or source and its license;
- outline, filled or mixed style, with a rule for selected states;
- standard sizes and stroke weight;
- semantic colour behavior, normally `currentColor`;
- labeling rules for unfamiliar or icon-only actions;
- exclusions, such as decorative icons in headings or mixed families.

Icons clarify actions, objects and status. They should not become decoration added to every label. Keep accessible names on icon-only controls and hide redundant decorative icons from assistive technology.

## SaaS application pattern

For SaaS, let the product prove the promise. The hero should normally show a credible product state, followed by the workflow, limits or controls, evidence, and the primary action. Reuse one coherent record or scenario across sections so the page demonstrates cause and effect rather than presenting unrelated dashboard fragments.

For example, if the concept is "every reply shows its sources," use the accent on citations, source highlights and the primary action; repeat the same ticket and source numbering; animate the link between claim and evidence; and keep those rules in the product mock, copy and interaction states. A generic gradient, arbitrary icon set or unrelated dashboard would weaken the concept even if it used the correct palette.

## Trace before verification

Before calling the work complete, check that each invariant named in `brand/brand.json` appears where expected and that each exclusion is absent. Then verify desktop and mobile composition, keyboard focus, contrast, reduced motion, content without animation, and all relevant component states. Record exceptions and reasons in `brand/verification.md`.
