# Deskhand campaign

A campaign for Deskhand, a fictional AI support agent from the Brand Studio showcase. It runs one message across seven formats with five layouts: strip, wide, square, portrait and tall. The ticket, order and store policy are sample data.

- `campaign.json`: the message, where each line comes from, and the formats to render.
- `renders/`: one file per format, the A3 poster as a PDF, `report.json` with the checks, and `contact-sheet.png`.

To regenerate the renders, run this from the repository root after `npm ci`:

```sh
node plugins/brand-studio/skills/brand-design/scripts/campaign-render.mjs --brand apps/showcase/src/deskhand.brand.json --campaign examples/deskhand/campaign/campaign.json
```

## Provenance

- Copy: taken from `apps/showcase/src/deskhand.brand.json` and the showcase's sample ticket. `campaign.json` traces each line.
- Type: Geist and Geist Mono, SIL Open Font License, loaded from the `@fontsource` packages.
- Mark: `mark.svg`, drawn for the Deskhand showcase header.
- No photography, stock or third-party art.
