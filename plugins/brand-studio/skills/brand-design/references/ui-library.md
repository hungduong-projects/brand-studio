# Use Brand Studio UI

The companion React package is provisionally named `@brand-studio/ui`. It is optional and not assumed to be published. Inspect the target project's stack and dependencies first. Preserve its existing accessible component system when it can express the contract; do not install or replace a UI package merely to use Brand Studio.

In the Brand Studio source workspace, the showcase declares `@brand-studio/ui` as its own dependency because it demonstrates that package. Other applications may declare different packages or use another framework. Outside the workspace, use `@brand-studio/ui` only from an explicitly supplied package archive or a confirmed published version.

When the target has chosen `@brand-studio/ui`, import components from `@brand-studio/ui` and styles from `@brand-studio/ui/styles.css`. Wrap the intended subtree in `BrandTheme` with `palette={brand.tokens}`. Its theme is scoped to the subtree.

Available v0.1 components:
- BrandTheme: semantic light/dark/system tokens.
- Button: actions with default, disabled and loading behavior.
- ActionLink: navigation with button presentation.
- TextField: linked labels, hints and errors.
- BrandImage: intrinsic dimensions, responsive sources, focal point and priority.
- StoryHero: focused promise, action and product image.
- EditorialSection: a text/media composition.
- StorySequence: desktop shared image stage, inline mobile/reduced-motion chapters.

These are storytelling foundations, not a replacement for a complete application design system. For dialogs, menus and complex controls, use the existing app's accessible foundation; for a new React application, consider shadcn/ui or React Aria before implementing custom behavior.

The private `workbench/references/` catalogue is optional research material and is not bundled with this plugin. Do not assume another user's filesystem contains it. Borrow a documented pattern; copy code only after checking the exact snapshot licence and recording required attribution. Restricted or custom licences do not become MIT merely because a component is renamed.

Existing Harry UI informed semantic tokens, complete states and responsive discipline. Brand Studio's initial components are newly authored, not a wholesale rename or publication of the reference catalogue.
