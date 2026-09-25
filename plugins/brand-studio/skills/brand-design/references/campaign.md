# Campaign across formats

Use this when one campaign idea has to run as a link preview, social posts, display ads, an email header and a poster. The family should read as one campaign, but each format gets its own layout. Hold the message, hierarchy and signature devices constant, and let the composition change with the format. Cropping one master image mechanically loses the headline in a strip and the proof in a story.

## Brief: one message

Write the campaign as data before designing anything:

- **Headline:** one checkable sentence, 40 characters or fewer. It must work alone, because the smallest ad shows only the headline and the call to action.
- **Support:** one sentence that adds the fact that makes the headline specific. The first line to drop when space runs out.
- **Call to action:** the action and its result, from the contract's `primaryAction`.
- **Proof:** the evidence the headline rests on: a product moment, a cited claim, a real number with its source. Rankings, superlatives, guarantees and percentages need proof, and the proof stays next to the claim. The FTC treats a claim without evidence as deceptive, and it wants any disclosure clear and close to the claim it qualifies ([FTC advertising FAQs](https://www.ftc.gov/business-guidance/resources/advertising-faqs-guide-small-business), [.com Disclosures](https://www.ftc.gov/business-guidance/resources/com-disclosures-how-make-effective-disclosures-digital-advertising)).
- **Disclosure:** fictional brand, sample data, terms. It follows the same legibility floor as the rest of the copy.
- **Trace:** for each line, where it came from: a contract field, an evidence entry or an approved source. A line with no trace does not ship.

Run every line through [copy.md](copy.md). The hierarchy is fixed across formats: headline, then proof, then call to action, then support. A format drops layers from the bottom of that list. It never reorders them.

## Formats

Checked 2026-09-25. Platforms change these; re-check before a launch.

| Format | Size in pixels | Family | Notes and source |
|---|---|---|---|
| Open Graph link preview | 1200x630, at least 600x315 | wide | The platform prints `og:title` and `og:description` under the image, so the image carries the headline and proof, not the support line ([Meta sharing images](https://developers.facebook.com/docs/sharing/webmasters/images/)) |
| LinkedIn single image | 1200x628 or 1200x1200 | wide, square | [LinkedIn ad specs](https://www.linkedin.com/help/lms/answer/a426534) |
| Instagram and Facebook feed | 1080x1350 (4:5); 1440x1800 accepted | portrait | Keep text off the edges ([Meta ad guide](https://www.facebook.com/business/help/980593475366490)) |
| Stories | 1080x1920 (9:16) | tall | Keep the top and bottom clear of profile and reply bars. Common guidance puts that at the top 14% and bottom 20%, but those percentages come from secondary sources, not Meta: unverified |
| Reels | 1080x1920 (9:16) | tall | Bottom 35% clear in secondary sources (unverified). Meta asks Reels ads with a disclaimer to keep the bottom 40% clear |
| Google responsive display | 1200x628, 1200x1200, 900x1600 | wide, square, tall | Google assembles the ad from assets. It rejects illegible text and text or logos placed over images, so keep art and copy as separate assets ([Google Ads](https://support.google.com/google-ads/answer/9823397)) |
| IAB medium rectangle | 300x250, 150 KB | square | Initial-load file budgets from the IAB New Ad Portfolio. Verified from summaries, not from the full IAB document |
| IAB leaderboard | 728x90, 100 KB | strip | |
| IAB wide skyscraper | 160x600, 150 KB | tall | |
| IAB mobile banner | 320x50, 50 KB | strip | Room for the headline and the action only |
| Email header | 600px wide (640 is also safe); export at 2x | wide | Email templates are about 600px wide ([Mailchimp](https://mailchimp.com/help/about-template-widths/)). Phone mail apps shrink it to about 360px. Put the call to action in a live HTML button below the header, because many clients block images by default |
| Poster | A3 297x420 mm, A2 420x594 mm | portrait | ISO 216. Export a vector PDF at the exact page size and a 150 dpi preview. Ask the printer about bleed; the script adds none |

## Layout per ratio family

Treat this as an art-direction problem. As with `<picture>` sources per aspect ratio ([MDN: art direction](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images#art_direction)), each family gets its own composition, and art gets its own crop and focal point (`object-position`) per family.

- **Strip (3:1 and wider):** one reading line: wordmark, headline, proof reduced to one line, then the action. No support line.
- **Wide (1.5:1 to 3:1):** copy on one side, proof or art on the other. The art may bleed off the edge; the copy may not.
- **Square (about 1:1):** headline on top, proof in the middle, action in a band at the bottom.
- **Portrait (4:5, A-series):** the poster stack. A large headline, the support line, the full proof, the action in a band.
- **Tall (9:16):** the message sits in the middle of the screen, between the platform bars, with the proof below it. Leave the bottom band as colour or art only.

Keep copy, wordmark, call to action and art as separate layers. That lets a format drop a layer, lets a platform add its own button, and keeps text off images for Google.

## Legibility at delivery size

Judge text at the size people see it. A 1200px link preview shows at about 390px on a phone, and a 600px email header at about 360px. Scale the floor by the ratio of the file width to that viewed width:

- 11px as seen for any text, including the disclosure and the citation number.
- 16px as seen for the headline, which also has to be the largest text in every format.

That makes the floor 34px of body text on a 1200px Open Graph image, 19px on a 600px email header and 11px on a 300x250 ad. When copy does not fit above the floor, drop a layer. Do not shrink it further.

## Weight budgets

IAB ad units have an initial-load budget: 150 KB for 300x250 and 160x600, 100 KB for 728x90 and 50 KB for 320x50. Flat brand colour compresses best as PNG. Photography needs JPEG or WebP. Keep a source file and export per format instead of converting one export into another.

## Render and check

Write the campaign as JSON next to the contract and run:

```sh
node <this-skill>/scripts/campaign-render.mjs --brand brand/brand.json --campaign brand/campaign.json --out brand/campaign
```

```json
{
  "message": {
    "headline": "Every reply shows its sources.",
    "support": "One sentence with the fact that makes it specific.",
    "cta": "Start a 14-day trial",
    "proof": { "label": "Draft reply · ticket #2291", "before": "Context sentence.", "claim": "The cited claim.", "source": "Source title", "sourceLine": "The line the claim came from." },
    "disclosure": "Fictional brand. Sample ticket."
  },
  "trace": { "headline": "brand.json direction.concept", "support": "...", "cta": "...", "proof": "...", "disclosure": "..." },
  "formats": ["og", "feed", "story", "mrec", "leaderboard", "email-header", "poster-a3"],
  "mark": "mark.svg",
  "fonts": [{ "family": "Brand Sans", "src": "fonts/brand-sans.woff2", "weight": "100 900" }]
}
```

Use `art` (`src`, `alt`, `focus`, optional `byFamily`) in place of `proof` for photography. The script uses the contract's colour, font and radius tokens, with the light scheme on paper and the dark scheme on the proof field. It builds every layer from text nodes, fits the copy to its floors and exports each format at its exact size, plus a PDF for posters. Then it checks:

- every text layer sits inside the format's safe zone;
- rendered text meets the floor for the viewed size;
- no layer or region overflows;
- the headline is at least 1.25 times any other text;
- the brand font loaded;
- ad files fit the IAB budget.

It writes `report.json` and `contact-sheet.png`.

## Verify

- Open every output at delivery size, and the small ones at 1x. Check that the headline reads first, the proof is legible, and the call to action looks like the brand's action.
- Put the contact sheet beside the contract. Without the wordmark, would every format still read as the same campaign? Check palette, type roles, signature devices and subject treatment.
- Factual copy: every line has a trace, claims sit beside their proof, and the disclosure is legible in every format that carries it.
- Asset rights: record the source and licence of each font, image and mark next to the campaign. Reference campaigns are evidence, not material.
- Record in `brand/verification.md` the formats, checks passed and anything unverified, such as secondary-source safe zones, printer bleed or how a platform crops in its grid view.
