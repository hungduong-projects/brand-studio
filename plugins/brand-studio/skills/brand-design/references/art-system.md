# Art system: one family of images across artifacts

Use this before you produce more than a few images for a brand, or when the same art has to work on a page, a social card and an email. It adds rules for a whole family and its records to [imagery.md](imagery.md), which covers generating each image.

## Families with a job

Build a small family, not a pile of one-off images. Atlassian splits its illustration into spot art, low-fidelity UI and ambient patterns, each with its own job ([Atlassian illustrations](https://atlassian.design/foundations/illustrations)); Dropbox splits imagery into photography, illustration and product visuals ([Dropbox imagery](https://brand.dropbox.com/imagery)). Start with one master and cut these roles from it:

- **Master:** the full approved composition. Every other asset traces back to it.
- **Background:** a field for copy, with a stated clear area.
- **Subject:** the main thing, isolated on transparency, for headers and cards.
- **Object:** one prop or document, isolated, for small spots next to body copy.
- **Atmosphere:** a quiet texture or pattern for section bands, often in the dark theme.

Each role names at least one artifact type it serves. A family proves itself when it works in at least two types, such as a social card and an email.

## Write the asset bible first

Keep it as `asset-bible.json` next to the files. Record:

- `subject`: geometry that must not drift: sizes, proportions, corner radii, angles, how text or faces appear.
- `palette`: each colour with a role and a hex, taken from the contract's tokens. The `brand` path lets the checker compare them.
- `lighting` and `materials`: light direction and softness, shadow values, surfaces, texture.
- `camera` or `illustration`: viewpoint, lens or projection, tilt range, crop rules, copy-safe space.
- `exclusions`: what never appears. Start from the contract's `imagery.avoid`, then add images of text (keep headlines and data as live text), decorative images where content belongs, and generic stock ([GOV.UK images](https://design-system.service.gov.uk/styles/images/)).
- `assets`: one record per file, below.

## Masters and versioned derivatives

Approve one master, record its SHA-256, and never write over it. Each derivative is a new file whose name ends in its version (`subject-v1.png`), with `derivedFrom` naming its parent and `changes` listing what was done: crop, isolate, recolour, recompose. To change an approved derivative, write `-v2` and keep `-v1` until nothing uses it. This follows C2PA, which models a derived asset as its ingredients plus the actions applied to them ([C2PA 2.1](https://spec.c2pa.org/specifications/specifications/2.1/specs/C2PA_Specification.html)).

## Provenance and rights per asset

Every asset records `id`, `role`, `version`, `file`, `alt`, `uses` and a `source` whose `type` sets what else is required:

| Type | Required | Note |
|---|---|---|
| `generated` | `prompt`, `model` | Add model version, reference images and their role, and seed. Seeds rarely reproduce an image across sessions, so keep the output file. IPTC `digitalSourceType`: `trainedAlgorithmicMedia`, or `compositeWithTrainedAlgorithmicMedia` after edits. |
| `code` | `script` | The script redraws the asset from tokens. IPTC `algorithmicMedia`. |
| `open-licence` | `title`, `author`, `url`, `licence` | Title, author, source and licence (TASL), as Creative Commons recommends ([attribution](https://wiki.creativecommons.org/wiki/Recommended_practices_for_attribution)). Record the source for CC0 and public domain as well. |
| `original` | `author` | Photography or drawing you made or commissioned. |
| `licensed` | `author`, `licence` | Add the licence term and where it ends. |

IPTC codes: [digital source type](https://cv.iptc.org/newscodes/digitalsourcetype/). Write alt text that states what the image tells the reader. Leave it empty only for a background or atmosphere layer that sits behind copy and adds no information.

## Keep the family consistent

- Draw every asset from the same geometry and palette. If you render in code, share the drawing functions; if you generate, pass the master as a reference and restate the locked subject.
- Hold the signature devices steady: the same highlight shape, line weight or light direction in every file.
- Lay the set out side by side at the size each artifact uses, and reject drift in angle, colour temperature, line weight or texture.
- Fix a drifted asset in a new version. Do not recolour the UI to match a bad image.

## Check the family

```sh
node <this-skill>/scripts/asset-bible.mjs <dir>/asset-bible.json
```

The checker covers required fields, source records by type, files that exist inside the folder, unique ids and files, derivatives that lead back to a master, versioned derivative names, SHA-256 of masters, hex palette values, palette drift from the brand tokens (a warning) and at least two artifact types.

It cannot judge the art. Before you call the family done:

1. Rights: every source has its licence or generation record, and nothing copies a reference.
2. Prompt log: every generated file has its prompt, model and references.
3. Consistency: the side-by-side sheet shows one family.
4. Usefulness: build the named artifacts with live text on top, check them at phone width, and look at each one.

The Deskhand art family in `examples/deskhand/art/` is a worked example drawn in code: a master, four derivatives, a bible, and a preview page with a social card, an email and a landing section.
