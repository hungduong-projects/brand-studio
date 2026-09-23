# Design brief: ask before you design

A page built from guessed taste gets sent back. On Deskhand the user rejected three things they were never asked about: the colour, the amount of copy and a one-style header. Ask about the feel first, then build.

## How to ask

- Use the host's question tool (AskUserQuestion in Claude Code). Codex and similar hosts: one numbered question at a time.
- Ask 2-4 questions per round, and no more than 3 rounds before the first build. Put your recommendation first and say why in one line.
- Show every visual choice as a preview: hex swatches with roles, a 4-6 line ASCII layout, or a named reference site. Describe what the visitor sees ("the page turns dark while you scroll the demo") and skip jargon ("inverted section tone").
- Skip a question when the brand contract, the repo or the user already answered it. Record each answer in `brand/storyboard.md` under "Brief answers".
- Measure before you offer colours (creative-direction.md section 10). Options come from the measurements, not from adjectives.

## Round 1: what and who

1. **Product and page type.** For example: AI agent app, dev tool, shop, local business, portfolio or launch page.
2. **Main action.** For example: start a trial, book a demo, buy, book a table or download.
3. **Reference feel.** Offer 3-4 named sites that fit the category, such as Linear/Framer (product UI as the hero), Stripe (gradients and diagrams), Apple (big photography) or Notion (friendly illustration).
4. **Motion level.** Calm, lively, or a show-piece with a pinned scroll scene.

## Round 2: look

1. **Colour theme.** Offer 3-4 measured palettes, each with a preview of where the brand colour lands (button only, big blocks, objects in images). Include one light and one dark option.
2. **Background rhythm.** Pick one:
   - one colour throughout
   - a mix of section colours: light hero, a dark demo scene, a grey panel for pricing, a brand-colour band before the footer
   - a soft texture: grid, grain or a glow behind the product
   - a colour that fades as you scroll
3. **Type personality.** Tight grotesk (Geist, Inter Display), editorial serif with a grotesk, or rounded and friendly. Show the headline set in each.
4. **Imagery.** Product UI mocks, photography, illustration, 3D, or none.

## Round 3: page chrome and density

1. **Header.** Multi-select. Default to a combination for any landing page:
   - clear at the top, a floating bar once you scroll, and light text over dark sections
   - dropdown menus with icons, a one-line description per item and a featured card
   - a marker under the section in view, plus a hover pill that follows the pointer
   - a sign-in link, with a full-screen menu on phones
2. **Word budget.** A 5-word hero with captions under visuals, or longer explanatory copy.
3. **Sections.** Which chapters to include: demo, how it works, controls or limits, pricing, proof, FAQ, trial form.

## After the answers

State the concept in five words and the choices you took, then build. When the user answers "be creative" or "you choose", pick the richer option and say which one you picked. The multi-select header with all four behaviours is the Deskhand reference build (`apps/showcase/src/deskhand.tsx`, `DeskhandHeader`).
