# Aesthetics: why a drawn object looks right

Use this when you shape a mascot, an icon, an app icon or a 3D object and need to decide proportion, curves, symmetry, detail or how much novelty to add. It turns philosophy and the empirical research behind it into rules you can check. It does not replace the style rules in [mascot.md](mascot.md) and [icons.md](icons.md).

## Judge the object by its job

A brand object is what Kant called dependent beauty: people judge it against a concept of what the object is meant to be, unlike a free ornament ([SEP: Kant's aesthetics](https://plato.stanford.edu/entries/kant-aesthetics/)). Xenophon's Socrates made the same point: a golden shield that fits badly is ugly, and a dung basket that does its job can be beautiful ([SEP: Beauty](https://plato.stanford.edu/entries/beauty/)). Before you judge a drawing, write the object's job in one line, such as "reads as a ticket at 16 px". Reject a change that looks better but does the job worse.

## Balance order and variety, but do not score them

Hutcheson located beauty in "uniformity amidst variety", and Hogarth called regularity "composed variety" ([SEP: 18th-century British aesthetics](https://plato.stanford.edu/entries/aesthetics-18th-british/)). Birkhoff turned this into a formula, M = O/C, but it fails as a score. In a 2023 test on 25 vases, M correlated with ratings at r = 0.20 and gave only two distinct values ([Hübner & Ufken](https://www.frontiersin.org/articles/10.3389/fpsyg.2023.1114793/full)). Use the idea, not the number:

- Hold one system fixed across the object: stroke width, corner radius, eye shape, light direction.
- Vary one thing on purpose: a pose, a prop or a single accent shape.
- Remove any detail that neither carries the job nor adds the chosen variety.

## Make it easy to see

People like what they process easily. Symmetry, figure–ground contrast, repetition and prototypical shape all make an object easier to process, and so better liked (Reber, Schwarz & Winkielman 2004, *Personality and Social Psychology Review* 8(4)). For icons and small mascot states:

- Start from the shape people expect for the category, such as an envelope for mail.
- Separate the figure from the background with strong contrast before you add any tone.
- Repeat construction shapes across a set so each new glyph looks related to the others.

## Add one measured surprise

Ease alone becomes dull. Berlyne found that liking peaks at moderate arousal from novelty and complexity, and falls on either side ([Wikipedia: Daniel Berlyne](https://en.wikipedia.org/wiki/Daniel_Berlyne)). Hekkert and colleagues found that typicality and novelty predict preference for products equally, and that each hides the other's effect: people like novelty that does not cost typicality (*British Journal of Psychology*, 2003). This is the "most advanced, yet acceptable" (MAYA) principle. In practice:

- Keep the category silhouette readable, then put the novelty in one signature device.
- Spend complexity in one focal area. Curvier outlines were rated more beautiful and more complex ones more interesting (Carbon et al. 2018, *i-Perception*).
- For a pattern or background, aim for medium-to-high complexity, not the maximum. In fractal installations, preference rose with complexity while relaxation fell (Robles et al. 2021, *Frontiers in Psychology*).

## Prefer curves for friendly objects

People prefer curved objects to angular ones, and sharp contour changes may read as threat (Bar & Neta 2006, *Psychological Science* 17(8)). The preference weakens when the angular version is the more familiar shape (Chuquichambi et al. 2021, *PeerJ*). Use sharp corners on purpose, for power, precision or warning, not by default. For S-shaped outlines, choose a moderate curve. Hogarth's "line of beauty" sits in the middle of his seven curves, and in tests liking followed an inverted U, with moderate curvature liked most ([Hübner & Ufken](https://www.frontiersin.org/articles/10.3389/fpsyg.2023.1114793/full)).

## Keep curvature continuous

A circular-arc corner joins a straight edge with a sudden jump in curvature. A squircle ramps the curvature up and down instead, which is why iOS icons look smoother than plain rounded rectangles ([Figma](https://www.figma.com/blog/desperately-seeking-squircles/)).

- App icons and product silhouettes: use continuous corners. Figma's corner smoothing at about 0.6 approximates the iOS shape.
- Superellipse |x/a|ⁿ + |y/b|ⁿ = 1: n = 2 gives an ellipse, and larger n moves toward a rectangle. Piet Hein used n = 2.5 for Sergels Torg ([Wikipedia: Superellipse](https://en.wikipedia.org/wiki/Superellipse)).
- 3D objects: use continuous fillets in the same way.

## Take proportion from a module, not from φ

Vitruvius defined symmetry as agreement between the parts and the whole, measured from one chosen part of the work. His figure gives the face as a tenth of the height and the foot as a sixth ([Vitruvius, Book III](https://www.gutenberg.org/cache/epub/20239/pg20239.txt)). Pick one module, such as the eye width or the stroke width, and size the other parts in simple multiples of it.

Do not justify a design with the golden ratio. The claims about the Parthenon, the Mona Lisa and Pacioli do not survive measurement. Fechner's rectangle preference was "at best, inconclusive" in later tests, and a 2022 study found only a 53% preference for φ against 1.5 and 1.8 ([Wikipedia: Golden ratio](https://en.wikipedia.org/wiki/Golden_ratio); De Bartolo et al., *PsyCh Journal*). Use a ratio when it does a job: √2 keeps its shape when halved, as ISO paper sizes do ([ISO 216](https://www.cl.cam.ac.uk/~mgk25/iso-paper.html)).

## Exaggerate what makes it distinct

Ramachandran's "peak shift" holds that an exaggerated version of a distinguishing feature draws a stronger response than the original. Caricature works this way ([Wikipedia: Neuroesthetics](https://en.wikipedia.org/wiki/Neuroesthetics)). The authors call the theory speculative, so test the result. Find the one feature that separates the mascot from its category and push it further than feels safe. Then check that the silhouette still reads at 16 px.

## Faces: baby schema and the uncanny valley

- A higher forehead, larger eyes, a wider face and a smaller nose and mouth made infant faces look cuter and raised the wish to care for them (Glocker et al. 2009, [*Ethology*](https://pmc.ncbi.nlm.nih.gov/articles/PMC3260535/)). Push these features for a friendly or reassuring mascot. Pull them back for a formal or expert brand.
- Affinity drops sharply as a figure approaches full human realism, and motion makes the drop worse. Mori advises designers to aim for the first peak, a moderate likeness ([IEEE Spectrum](https://spectrum.ieee.org/the-uncanny-valley)). Keep 3D characters stylized, especially when they move.

## Leave room for the viewer

Ingarden held that a work leaves "places of indeterminacy" that each viewer fills ([SEP: Ingarden](https://plato.stanford.edu/entries/ingarden/)). Japanese *yūgen* and *wabi* prize suggestion, negative space and the unfinished ([SEP: Japanese aesthetics](https://plato.stanford.edu/entries/japanese-aesthetics/)). Imply a detail when the silhouette already carries it, and leave negative space around the subject. A small, deliberate break in symmetry, such as a tilted ear, a chipped edge or patina on a 3D surface, adds life. Group studies rank symmetry first for beauty, but individual raters differ, and some prefer asymmetric patterns (Jacobsen & Höfel 2002, *Perceptual and Motor Skills*).

## Taste varies; test with people

Group averages hide subgroups. In one study, about half of observers preferred fractal images with a medium amount of fine detail, and most of the rest split between smoother and sharper images ([Spehar et al. 2016](https://www.frontiersin.org/articles/10.3389/fnhum.2016.00350/full)). When a choice is close, show two versions to people from the audience and record the result in `brand/verification.md`. Do not settle it with a formula.

## Review checklist

- The object's job is written in one line, and the drawing serves it.
- One module sets the proportions. No golden-ratio claims appear in the rationale.
- Stroke, radius and light stay constant. Variety comes from one chosen place.
- The category shape is readable before the signature device is added.
- Curves are moderate, and corners on icons and 3D objects are continuous.
- The distinguishing feature is exaggerated, and the silhouette still reads at 16 px.
- Face proportions fit the brand's warmth. 3D characters stay stylized.
- Close choices were tested with people from the audience, not settled by a score.
