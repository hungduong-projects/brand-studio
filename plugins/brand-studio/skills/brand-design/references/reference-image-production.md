# Reference image production

Use for posters, social images and other compositions that combine an existing template, supplied assets and exact wording. Continue to use [imagery.md](imagery.md) for asset identity and provenance, and [campaign.md](campaign.md) for format families and delivery-size legibility. Match the requested deliverable: a prompt request ends with a usable brief; a generation request includes actual generation, inspection and the selected image.

## 1. Inspect the template and every input

View every supplied image before assigning its role. Record filename, dimensions, orientation and whether it is a layout reference, protected asset, edit target, style reference or supporting insert. Give each a stable ID. A source photograph is not automatically a style reference or permission to redraw its subject.

Keep original bytes. Convert unsupported formats such as HEIC into separate viewing/input derivatives when needed; retain orientation and record the conversion. For a template, measure canvas, margins, reading order, text regions, image regions, layer order and likely typography roles. Bounds inferred from a flattened image are estimates; a JPEG does not establish the original font family or brand tokens.

Transcribe all required copy into one ledger. OCR helps locate text but can misread accents, decimals and phone numbers, even with high confidence. Inspect small crops and compare them with the source. Distinguish user-confirmed replacements, literal template copy and independently verified facts. Template copy alone does not establish that an offer is current.

Record missing assets and conflicts before generation. Do not invent a missing room photograph, silently choose between conflicting measurements, or infer a person's name from their image. Ask only when the unresolved detail blocks the result; otherwise make a reversible proposal, retain the conflict and explain any omission. A required disclaimer must stay with its claim.

## 2. Choose what must remain exact

| Requirement | Production method | What can be claimed |
|---|---|---|
| Similar mood, lighting or composition | Reference-guided generation, then visual comparison | A generated interpretation of the reference |
| Same person, product or architecture | Strong source references and explicit invariants; compare after every edit | Reviewed resemblance, with remaining uncertainty recorded |
| Unchanged labels, logos, floorplans, faces or other protected regions | Composite original approved assets using the host's permitted editing tools | Preservation only to the extent actually checked |
| Exact wording and font | Typeset approved copy as real text/vector layers | Text accuracy after font and export checks |
| Pixel-identical region | Restore the original region and compare decoded pixels at the same geometry | Pixel identity only in the compared region |

Cropping, scaling, colour conversion and edge matting are transformations. Preserve them in the manifest; do not call their output pixel-identical. Prompt instructions, high-fidelity settings and masks do not establish this guarantee. Follow the active host's tool rules; a JSON brief is not authorization to bypass an image-editing restriction. If exact compositing is unavailable, describe the result as reference-guided instead of claiming exact preservation.

## 3. Write one portable brief

Start from [the fictional JSON example](../assets/reference-image-brief.example.json). It is a creative brief, not an OpenAI/Gemini API schema or an extension to `brand.json`.

- Keep one `copy` object with exact Unicode strings, source/approval status and permitted line breaks. Normalize to NFC without changing wording.
- Describe assets by stable IDs and relative files. File paths in a pasted prompt do not upload images; attach them through the active interface.
- Describe layout in one declared coordinate system: `[x, y, width, height]`, top-left origin, plus the canvas dimensions. Keep measured template bounds separate from an adapted layout.
- Separate locked facts/assets from creative freedom in background, lighting, spacing, panels and other approved variables.
- Keep provider execution settings outside the creative brief. Record the actual interface, model if exposed, supported controls, and source date for volatile limits.
- Build each call's numbered input map from the images actually attached to that call. After staging or reordering, renumber the prompt. Never refer to an absent “Image 6”.
- Derive the concise execution prompt from the canonical copy and layout. Verify that referenced field names and asset IDs exist; do not maintain a second, drifting copy of the wording in a long prompt.

Before use, parse the JSON; check unique IDs, valid asset/copy references, in-bounds rectangles and available input files. Metadata, conflicts and review notes are not visible poster text. When a person or contact changes, remove the previous name/number from visible copy while keeping a source record.

## 4. Check the active provider before the first call

Inspect the actual tool/interface capabilities: reference count, accepted formats, edit support, output controls and whether it can access local files. A limit encountered in one Codex tool is not a universal ChatGPT, OpenAI API or Gemini limit. Do not copy API-only flags into a built-in tool, assume a prompt selects a model, or silently switch provider to fit more images.

| Surface | Operational check |
|---|---|
| ChatGPT/Codex image tool | Follow its current input schema and image-loading requirements. Use available reference paths or attachments as documented. Record model as unknown if it is not exposed. |
| OpenAI API | Check current model-specific edit, size, quality, transparency and output-format support. A saved skill's model default can be older than the provider documentation. |
| Gemini app/API | Check the selected model and interface's reference limits and multi-turn support. Supply images explicitly and preserve edit context using that interface's supported mechanism. Do not transplant another provider's flags. |

Official guidance checked 2026-10-01: [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation), [OpenAI image prompting](https://developers.openai.com/api/docs/guides/image-prompting), [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation). OpenAI recommends explicit input roles, invariants and targeted edits. Google recommends preparing image text first and supports conversational edits on suitable models. Re-check capabilities at execution time; these sources do not certify Vietnamese typography or exact source preservation. A workflow documented for a provider is not a workflow tested on that provider.

## 5. Generate and repair in bounded passes

1. Establish composition with the layout reference and the most identity-sensitive sources. State subject, medium, intended use, exact copy, invariants and exclusions.
2. If all inputs fit, include them. If the interface cannot accept them all, plan stages before calling: keep a clearly identified empty insert region, then add the remaining source in an edit. Do not substitute a generated approximation for a missing input. Mark intermediate outputs as drafts until every required region is complete.
3. Inspect the output. Compare the whole image and tight crops of face/hands, logos, floorplan/packaging geometry, numbers and small text. Check every output, not only the first candidate.
4. Repair one bounded issue per pass. Name its region and give exact replacement text or asset; repeat the preserved elements. Compare unaffected regions too, because “change only this” can still cause drift.
5. Keep the approved source and each selected iteration. If repeated edits degrade identity or keep failing the same text, return to the best version and use exact text/compositing when permitted, or report the remaining limitation. Do not accumulate blind retries.

A local text repair can be specific: remove the existing note, render the approved sentence once in a larger normal-width font inside the same panel, preserve the amount and surrounding assets. One tiny line may need its own row rather than a stronger “perfect text” instruction.

## 6. Vietnamese and other exact image copy

For generated lettering, quote the approved string, state how often it appears, its placement and type role, and exclude extra words. Specify difficult accented letters when repairing a known error. Prompting a font name does not prove that font was used.

For exact production text, use a licensed font with the required glyphs, confirm the actual font loaded, and check shaping, weight, line height, fallback substitution and diacritic clipping. Keep text separate from the generated artwork when the workflow allows it. Inspect Vietnamese tone marks and vowel marks independently, including `ư`, `ơ`, `ă`, `â`, `ê`, `ô` and `đ`; check uppercase forms too.

After the final export, run OCR against the canonical copy and visually inspect disagreements. OCR can reject a correct glyph or accept a wrong one. Check names, phone digits, units, separators and disclaimers individually. Correct OCR for the review record only after looking at the pixels; do not treat that correction as fixing the image.

## 7. Judge the delivered image, not the requested canvas

Recompose for a new aspect ratio; do not stretch a reference poster to fit. Separate exact template matching from an approved adaptation and record what changed. Keep important text, face, price and CTA inside a proposed content-safe region; backgrounds can bleed. Platform UI varies with placement, device and caption. A prompted margin or an ads guide is not proof that an organic post is safe.

Measure the actual output's dimensions and important regions. Compare text at the expected viewing width. For example, 21px text in a 1080px file appears about 7px when viewed at 360px wide; a sharp PNG does not make it readable. Apply [campaign.md's delivery-size floors](campaign.md#legibility-at-delivery-size). Enlarge/reflow, reduce optional content with authorization, or propose another image instead of silently shrinking required copy. A local layout check does not replace an actual platform preview.

Retain the native generated output and an editable master when one exists. Export a lossless PNG for text-heavy handoff; use supported JPEG/WebP derivatives where appropriate and check alpha for transparent assets. Verify the real dimensions, bytes, colour profile, clipping and legibility after conversion. Record native size separately from delivery size. Resampling creates a different pixel grid, not newly generated detail; avoid non-uniform scaling when the aspect ratios differ.

Report checks separately: copy, identity/assets, layout, file properties and target-platform preview. State any unverified category. User approval of appearance does not establish pixel identity, correct facts or platform-safe placement.

## 8. Keep private work portable

Keep reusable guidance and fictional examples in the plugin. Keep client photographs, personal names/contact details, commercial copy, prompts containing those details, raw OCR and generated derivatives in the user's project/delivery folder outside public product paths.

A useful private folder contains `inputs/`, `prompts/`, `drafts/`, `final/`, `production/` and `verification/`. Save actual per-pass prompts, input order, tool/settings and the selected result. When the user asks to consolidate files, inventory destinations first, avoid overwrites, preserve source hashes and rewrite live paths in JSON/manifests. Record previous locations in a migration log. Retain app-managed originals when moving them would break chat history; copy them into the handoff folder. Verify that the final image and all current input references resolve before returning the folder.
