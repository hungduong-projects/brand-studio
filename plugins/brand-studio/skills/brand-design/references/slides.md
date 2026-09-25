# Slides and pitch decks

A deck from the contract should look like it came from the same studio as the website: same paper, ink, accent, type and devices. Write the story first, then pick a layout for each slide. The generator writes an editable PowerPoint file with native text, shapes and charts.

## Storyline first

1. Write one sentence for the decision or outcome the deck supports, and one for who is in the room.
2. List the slide titles alone, in order. Read them as a paragraph. If the titles alone do not tell the story, fix the order before any design work.
3. Each title is a full-sentence claim of about 15 words or fewer ("An $84 refund over your limit waits for your approval"), not a topic ("Refunds"). One idea per slide; split a slide that needs two headlines.
4. Evidence under the title is visual: a product capture, one figure, a native chart, ordered steps or two options side by side. A paragraph under a title means the visual is missing.
5. Open with what it is, move through proof, close with the decision or next step and an owner.

Use facts from the contract and approved sources. Label fictional work and proposals on the slide. Run every visible string through [copy.md](copy.md).

## Layouts

Each layout is a narrative role. Pick by the slide's job, not its look.

| Layout | Job | Fields |
|---|---|---|
| `cover` | What this is and for whom | `title`, `subtitle`, `highlight`, `context` |
| `section` | One narrative transition | `title`, `body` |
| `statement` | One claim with its support | `title`, `body`, `highlight`, `points` |
| `image` | An image carries the point | `title`, `image {path, alt, source, frame}`, `caption` |
| `comparison` | Two or three options on a stated basis | `title`, `basis`, `columns [{heading, points, mark}]` |
| `data` | One figure or one native chart, with its source | `title`, `metric {value, label}` or `chart {labels, values, highlight}`, `source` |
| `process` | Three to five ordered stages | `title`, `steps [{title, text}]` |
| `closing` | Decision, next step and contact | `title`, `body`, `action`, `contact` |

Every slide also takes `tone` (`light`, `dark` or `accent`), `source` (text or a list) and `notes` (speaker notes, optional). Deck fields: `title`, `author`, `footer`, `sizes {body, detail}` and `fonts {head, body, mono, fallback, monoFallback}`. The example in `examples/deskhand/slides/deck.json` uses every layout.

## Contract mapping

- **Colour:** `tokens.light` for paper slides, `tokens.dark` for dark slides, `accent` with `onAccent` for accent fields. The generator writes explicit hex values and rewrites the file's theme colours (`dk1` ink, `lt1` surface, `accent1` accent) so PowerPoint's colour picker offers the brand, not Office blue. Do not add slide-only colours.
- **Highlight:** `highlight` marks one phrase in the accent colour as a native text highlight. Sources print as numbered accent chips above the footer, the same way the website numbers citations. Use both only where the contract names that device; other brands can skip them.
- **Fonts:** the first family in `tokens.light.font` becomes the heading and body font, with a trailing "Variable" removed. PowerPoint files name fonts and do not embed them. Pair each brand font with a safe fallback taken from the stack's generic family (sans-serif gives Arial) and tell the recipient. Build a second copy with `--fallback-fonts` for people who do not have the brand fonts installed.
- **Voice:** titles and captions follow `voice`. Short sentences with checkable facts.
- **Radius:** cards and chips take `tokens.light.radius`.

## Accessibility

- Every slide has a unique title, and the title sits in the layout's real title placeholder, so the outline, screen readers and slide sorter see it. `validateDeck` rejects duplicates.
- Body text is at least 18pt; slide titles are 28pt or larger. Only sources, footers, slide numbers and the cover and closing context lines go smaller (12 to 14pt).
- Reading order follows the order the generator adds shapes: title, then content, then sources.
- Every image needs `alt` text and a `source`. Charts get alt text from their labels and values unless you pass `chart.alt`.
- Meaning never rides on colour alone: a marked comparison column also has its own heading, and a highlighted bar also carries its value label. A light accent bar on a paper slide can fall below 3:1 against the background; the label keeps the value readable.
- Keep contrast at 4.5:1 for text; the contract checker already enforces the token pairs the generator uses.

## Build and verify

```sh
npm install --no-save pptxgenjs   # skip in a project that already has it
node <this-skill>/scripts/slides.mjs --brand brand/brand.json --deck deck.json --out deck.pptx
```

The script validates the contract and the deck first, then refuses to write a slide whose text would run past the 16:9 safe area (5% side and top margins). It estimates text width, so it can be wrong for very narrow or very wide typefaces; render and look.

Render every slide with LibreOffice and inspect each image at full size:

```sh
soffice --headless --convert-to pdf deck.pptx
pdftoppm -png -r 80 deck.pdf slide
```

Converting straight to PNG with `soffice` gives only the first slide. LibreOffice substitutes fonts it cannot find; check `pdffonts deck.pdf` lists the brand fonts before you judge the typography. On macOS, fonts must be installed or registered with the system for LibreOffice to use them.

Check before you share: the story reads from title to title; every claim is factual or labelled; nothing is clipped; text is readable in the PDF at projected size; images have sources and alt text; text and shapes stay editable in PowerPoint or Keynote. A LibreOffice render is not proof of how PowerPoint or Keynote renders the file; say which you checked.
