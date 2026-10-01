# Mascot styles

Pick one drawing style per brand and write it in the spec's `style` field. The style decides how parts are drawn; the concept, states and checks in [mascot.md](mascot.md) stay the same. `examples/mascot-styles/` in the Brand Studio repository draws one page character in each style, so you can compare them side by side.

## Choose from the brand

Read the contract before you choose:

- `voice`: calm and precise traits point to silhouette, monoline or geometric. Warm, cheeky or loud traits point to sticker or retro.
- `direction.concept` and `direction.devices`: a style that repeats a device from the mark or layout reads as the same brand.
- `tokens` and `imagery.palette`: a near-black `ink` with one strong `accent` suits silhouette or geometric. A palette of several bright colours suits sticker. Paper and ink tones suit monoline or retro.
- `imagery.avoid`: a rule against cartoons or nostalgia removes sticker and retro.

Draw two styles for the top concept, three states each, and show them side by side before you build the full rig.

## silhouette

One solid shape in the darkest token. The face is cut out of it in white, and one accent mark is the hook: a stripe, a fold or a spot. Limbs are fat lobes merged into the mass, with no outlines and no shading.

- Suits: tools, finance, developer and productivity brands with a calm, precise voice.
- Avoid: brands whose surfaces are mostly dark, unless you set `darkOutline`.
- Study: GitHub's Octocat, and the most-appreciated mascot projects on Behance, where one filled shape with a negative-space face recurs.
- Rig: set `darkOutline` to a light token. The script adds a die-cut border on the dark surface and writes `states/<id>-dark.svg`. `examples/deskhand/mascot/` is this style.

## monoline

One stroke width traces every part, over white or paper fills, with one accent fill. The line carries the personality, so keep it even and round-capped.

- Suits: editorial, writing, education and note-taking brands; voices that are thoughtful and plain.
- Avoid: tiny sizes under 24 px, where thin lines blur; raise the stroke width or use silhouette.
- Study: Notion's black line illustrations.
- Rig: parts may stroke in contract colours, and every stroke shares one `stroke-width`. The script fails a second width. `--3d` drops stroked paths, so the 3D render shows only the fills.

## sticker

Bold flat colour with one darker tone for shade and one lighter tone for highlight, big eyes with catchlights, and a thick ink edge. It reads at a glance and invites play.

- Suits: consumer, games, kids, food and learning apps; voices that are warm, cheeky and encouraging.
- Avoid: professional tools and any brand that must look restrained. It goes stale fast when every competitor uses it.
- Study: Duolingo's Duo for the flat colour and shade, and LINE Friends for the expression range.
- Rig: draw the edge as a filled ink shape behind the colour, since this style allows no strokes. List shade and highlight tones in `palette` when they are not tokens.

## retro

1930s rubber-hose cartoon: noodle limbs as round-capped strokes, white gloves, pie-cut eyes and big shoes. The motion lines and squash carry the energy.

- Suits: drinks, food, entertainment, craft and independent brands with a playful or nostalgic voice.
- Avoid: brands that sell speed, precision or the future.
- Study: Cuphead, and the cartoon shorts it draws on.
- Rig: parts may stroke in contract colours, and widths may vary between limbs and the body edge. `--3d` drops stroked paths, so keep the body a filled shape.

## geometric

Built from circles, quarter circles and rectangles on a grid. Every curve is an arc of one radius family and every edge is straight. The construction is the hook.

- Suits: architecture, design, data and infrastructure brands; voices that are exact and confident.
- Avoid: brands that need warmth or a wide range of expression, since the face has few moving parts.
- Study: the Android robot, and Bauhaus poster figures.
- Rig: put the grid size in `concept` so new parts snap to it. The silhouette check is strict here, because one moved block changes the outline.

## Rules for every style

- Tilt the body 8 to 20 degrees in lively states with `lean`, and raise it with `lift` for a jump. A straight, centred body reads as a sticker in a catalogue.
- Keep held props inside the body's outline, in front of it. A prop held out to the side breaks the silhouette check.
- Use three or four colours. Each extra colour must earn its place in the 16 px row.
