# Brand and implementation review

## Brand

Would this design still identify the brand if its wordmark were removed? Explain the answer using subject, composition, voice, image direction and interaction. Check palette and type continuity from hero to footer; varied layouts must still share the system. Remove repeated ornamental labels, unrelated background effects, empty card containers and unsupported claims.

These are judgment criteria, not a regex-based aesthetic score. A purposeful centered hero or purple identity is valid when the brief supports it.

## Responsive and accessible

Inspect at 320, 390, 768 and 1440 CSS pixels, plus 200% text size. Check focus visibility, keyboard order, touch targets, heading order, labels, errors and meaningful image alternatives. Do not mask overflow globally to conceal layout bugs.

Aim for WCAG 2.2 AA: normal text contrast 4.5:1, large text 3:1, applicable non-text UI contrast 3:1. Use 44px control targets as a comfortable project default; do not confuse that with the WCAG 2.2 AA 24px minimum and its exceptions.

Reduce parallax/pinning and preserve all content when reduced motion is requested. Automatically moving content that lasts more than five seconds alongside other content needs pause/stop/hide unless essential. Color-scheme changes must preserve hierarchy and brand recognition. Any decorative scene should have a usable static fallback.

## Performance and honesty

Measure hero loading, layout shift and interaction where tools permit. Targets: LCP <=2.5s, INP <=200ms, CLS <=0.1 at the field 75th percentile. A local Lighthouse run is a diagnostic, not field proof. Record compressed asset sizes; lazy-load below-fold media.

Run build and relevant tests. Report screenshot widths, browser/engine, automated findings, keyboard checks, media failures, package validation and any remaining gaps. Do not declare a plugin installed or published from manifest validation alone.

Sources: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Core Web Vitals](https://web.dev/articles/vitals).
