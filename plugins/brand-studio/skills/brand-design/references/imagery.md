# Consistent generated imagery

Create an asset bible before generating. Record product geometry, colors, materials, lighting direction and softness, lens/perspective, background, grain, allowed crops and forbidden props. Separate subject identity from style: the same blue color is not proof that two cups are the same object.

## Production loop

1. Create one master hero with enough negative space for the planned layout.
2. Review silhouette, handle, proportions, material, shadows and crop. Save the chosen reference.
3. Generate each next scene with that exact master as a reference. Restate invariants; change only the narrative beat or camera composition.
4. Compare the set side by side and on the page. Reject geometry, temperature, texture or background drift. Fix by editing the relevant asset, not recoloring the entire UI.
5. Create mobile crops or dedicated compositions. Keep the product and intended focal point visible.
6. Export web derivatives, record dimensions/bytes and retain the original with its prompt and provenance.

Prompt structure: intended use; reference image and its role; locked subject; locked environment/light/material; changed action; camera/composition; copy-safe area; output size; exclusions.

Do not promise perfect identity, deterministic seeds, exact brand colors or logo lettering unless the tool actually supports those guarantees. Precise packaging may require real photography, compositing, or a shared 3D model. Keep marks and headlines as real SVG/text layers with known rights.

For moving imagery, use approved stills as start/end references only if the video tool supports them. Verify temporal geometry and loop seams. Otherwise use the actual still sequence and describe it accurately.

[OpenAI image documentation](https://developers.openai.com/api/docs/guides/image-generation#limitations) explicitly identifies recurring brand consistency and precise composition as limitations. Reference-guided generation improves control but requires human/visual QA.

## Asset manifest fields

Record ID, filename, narrative role, source (generated/provided/licensed), actual tool, prompt, reference filenames, dimensions, focal point, approval status and license/provenance notes. Never claim generated scenes show a real farm, shop, customer or production method without evidence.
