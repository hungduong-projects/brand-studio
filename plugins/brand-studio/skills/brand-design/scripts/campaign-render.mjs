// Render one campaign message as a family of formats (link preview, social, display ads, email header, poster) in the brand's tokens.
//
//   node campaign-render.mjs --brand brand/brand.json --campaign brand/campaign.json [--formats og,feed] [--out DIR]
//
// Each format gets a layout for its ratio family (strip, wide, square, portrait, tall) rather than a crop of one master.
// Copy, wordmark, call to action and proof stay separate layers, built with DOM text nodes. After rendering, the script
// checks that every text layer sits inside the format's safe zone, that text is legible at the size people see it,
// that nothing overflows, that the headline leads the hierarchy and that ad units fit their IAB file-weight budget.
// It writes one file per format (poster also as PDF), report.json and contact-sheet.png.
//
// Needs playwright-core and a Chromium (`npx playwright-core install chromium`).
import { readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateBrand } from './brand-check.mjs';

/**
 * Delivery formats, checked 2026-09-25. width and height are CSS pixels; scale multiplies them into file pixels.
 * safe is [top, right, bottom, left] as shares of the height or width where platform UI or cropping may cover text.
 * seenAt is the width in CSS pixels people typically see the image at; legibility floors scale from it.
 * layers lists what the image carries; the rest belongs in live text next to it (og:title, the email's HTML button).
 */
export const formats = {
  og: { label: 'Open Graph link preview', width: 1200, height: 630, scale: 1, type: 'png', seenAt: 390, safe: [.06, .05, .06, .05], compact: true, layers: ['wordmark', 'headline', 'proof', 'disclosure'] },
  linkedin: { label: 'LinkedIn single image', width: 1200, height: 628, scale: 1, type: 'png', seenAt: 390, safe: [.06, .05, .06, .05], compact: true, layers: ['wordmark', 'headline', 'proof', 'disclosure'] },
  square: { label: 'Square feed and responsive display', width: 1200, height: 1200, scale: 1, type: 'png', seenAt: 390, safe: [.05, .05, .05, .05] },
  feed: { label: 'Instagram and Facebook feed 4:5', width: 1080, height: 1350, scale: 1, type: 'png', seenAt: 390, safe: [.05, .06, .05, .06] },
  story: { label: 'Stories 9:16', width: 1080, height: 1920, scale: 1, type: 'png', seenAt: 390, safe: [.14, .06, .2, .06] },
  reel: { label: 'Reels 9:16', width: 1080, height: 1920, scale: 1, type: 'png', seenAt: 390, safe: [.14, .06, .35, .06] },
  'display-tall': { label: 'Responsive display 9:16', width: 900, height: 1600, scale: 1, type: 'png', seenAt: 390, safe: [.05, .06, .05, .06] },
  mrec: { label: 'IAB medium rectangle', width: 300, height: 250, scale: 1, type: 'png', seenAt: 300, safe: [.04, .04, .04, .04], compact: true, maxBytes: 150_000, layers: ['wordmark', 'headline', 'proof', 'cta', 'disclosure'] },
  leaderboard: { label: 'IAB leaderboard', width: 728, height: 90, scale: 1, type: 'png', seenAt: 728, safe: [.1, .02, .1, .02], compact: true, maxBytes: 100_000, layers: ['wordmark', 'headline', 'proof', 'cta', 'disclosure'] },
  skyscraper: { label: 'IAB wide skyscraper', width: 160, height: 600, scale: 1, type: 'png', seenAt: 160, safe: [.02, .05, .02, .05], compact: true, maxBytes: 150_000 },
  'mobile-banner': { label: 'IAB mobile banner', width: 320, height: 50, scale: 1, type: 'png', seenAt: 320, safe: [.1, .03, .1, .03], compact: true, maxBytes: 50_000, layers: ['headline', 'cta'] },
  'email-header': { label: 'Email header', width: 600, height: 300, scale: 2, type: 'png', seenAt: 360, safe: [.08, .04, .08, .04], compact: true, layers: ['wordmark', 'headline', 'proof', 'disclosure'] },
  'poster-a3': { label: 'A3 poster (297 x 420 mm)', width: 1123, height: 1587, scale: 1.5625, type: 'png', pdf: { width: '297mm', height: '420mm' }, seenAt: 500, safe: [.05, .05, .05, .05] },
  'poster-a2': { label: 'A2 poster (420 x 594 mm)', width: 1587, height: 2245, scale: 1.5625, type: 'png', pdf: { width: '420mm', height: '594mm' }, seenAt: 700, safe: [.05, .05, .05, .05] },
};

export const roles = ['wordmark', 'headline', 'support', 'cta', 'proof', 'disclosure'];

/** Smallest size, in CSS pixels as seen, for headline and for every other text layer. 11px is a common floor for caption text. */
export const seenFloor = { headline: 16, text: 11 };

/** Layout family from the aspect ratio: each family has its own composition. */
export function familyFor(width, height) {
  const ratio = width / height;
  if (ratio >= 3) return 'strip';
  if (ratio >= 1.5) return 'wide';
  if (ratio >= 0.9) return 'square';
  if (ratio >= 0.65) return 'portrait';
  return 'tall';
}

/** Minimum rendered font size in the format's own CSS pixels. */
export const minFont = (format, role) => Math.ceil((role === 'headline' ? seenFloor.headline : seenFloor.text) * format.width / format.seenAt);

/** The rectangle text must stay inside, in CSS pixels. */
export function safeRect(format) {
  const [top, right, bottom, left] = format.safe;
  return { left: format.width * left, top: format.height * top, right: format.width * (1 - right), bottom: format.height * (1 - bottom) };
}

/** True when a box ({ x, y, width, height }) lies inside the format's safe rectangle, with half a pixel for rounding. */
export function insideSafe(box, format) {
  const safe = safeRect(format);
  return box.x >= safe.left - .5 && box.y >= safe.top - .5 && box.x + box.width <= safe.right + .5 && box.y + box.height <= safe.bottom + .5;
}

/** Design sizes per family, as multiples of one hundredth of the short side. Floors from minFont win. */
const scaleByFamily = {
  strip: { wordmark: 16, headline: 24, support: 13, cta: 14, proof: 13, label: 12, disclosure: 12 },
  wide: { wordmark: 4.6, headline: 14.5, support: 4.6, cta: 4.4, proof: 5.6, label: 4.2, disclosure: 3.6 },
  square: { wordmark: 3.6, headline: 8.6, support: 3.8, cta: 3.8, proof: 3.9, label: 3, disclosure: 2.8 },
  portrait: { wordmark: 3.4, headline: 10.5, support: 3.6, cta: 3.6, proof: 3.4, label: 2.8, disclosure: 2.8 },
  tall: { wordmark: 3.6, headline: 10.5, support: 3.8, cta: 3.8, proof: 3.5, label: 2.9, disclosure: 2.9 },
};

/** Font size in CSS pixels for each text role of a format. */
export function typeScale(format) {
  const unit = Math.min(format.width, format.height) / 100;
  const scale = scaleByFamily[familyFor(format.width, format.height)];
  return Object.fromEntries(Object.entries(scale).map(([role, k]) => [role, Math.max(Math.round(k * unit), minFont(format, role))]));
}

/** Pick the art for a family: art.byFamily[family] overrides src and focus, as a <picture> would per ratio. */
export function artFor(art, family) {
  if (!art) return undefined;
  const pick = { ...art, ...art.byFamily?.[family] };
  return { src: pick.src, alt: pick.alt ?? art.alt, focus: pick.focus ?? '50% 50%' };
}

const text = value => typeof value === 'string' && value.trim().length > 0;
const fontFamily = value => text(value) && /^[a-z0-9 ,"'-]+$/i.test(value);
// Rankings, superlatives, guarantees and percentages are claims that need evidence next to them (FTC advertising guidance).
const claimWords = /#\s?1\b|\bbest\b|\bfastest\b|\bcheapest\b|\bleading\b|\bguarantee|\bproven\b|\d+\s?%|\bno\.\s?1\b/i;

/** Problems with a campaign file, as readable strings. */
export function checkCampaign(campaign) {
  if (!campaign || typeof campaign !== 'object' || Array.isArray(campaign)) return ['campaign must be an object'];
  const errors = [];
  const message = campaign.message ?? {};
  const limits = { headline: 40, support: 140, cta: 24, disclosure: 60 };
  for (const key of ['headline', 'cta']) if (!text(message[key])) errors.push(`message.${key} must be nonempty text`);
  for (const [key, max] of Object.entries(limits)) {
    if (message[key] !== undefined && (!text(message[key]) || message[key].length > max)) errors.push(`message.${key} must be text of ${max} characters or fewer`);
  }
  if (message.proof !== undefined) {
    for (const key of ['claim', 'source']) if (!text(message.proof?.[key])) errors.push(`message.proof.${key} must be nonempty text`);
    for (const key of ['label', 'before', 'sourceLine']) if (message.proof?.[key] !== undefined && !text(message.proof[key])) errors.push(`message.proof.${key} must be nonempty text when given`);
  }
  for (const key of ['headline', 'support', 'cta']) {
    if (claimWords.test(message[key] ?? '') && !message.proof) errors.push(`message.${key} makes a ranking, superlative or numeric claim; add message.proof with its source`);
  }
  // Every line of copy names where it came from, so a reviewer can check it against the contract or evidence.
  for (const key of ['headline', 'support', 'cta', 'proof', 'disclosure']) {
    if (message[key] !== undefined && !text(campaign.trace?.[key])) errors.push(`trace.${key} must say where message.${key} comes from`);
  }
  if (!Array.isArray(campaign.formats) || !campaign.formats.length) errors.push('formats must be a nonempty array of format ids');
  else for (const id of campaign.formats) if (!formats[id]) errors.push(`unknown format ${id}; use ${Object.keys(formats).join(', ')}`);
  if (campaign.art !== undefined) {
    if (!text(campaign.art?.src) || !text(campaign.art?.alt)) errors.push('art needs src and alt');
    if (message.proof) errors.push('art and message.proof both want the stage; choose one');
  }
  if (campaign.dataFont !== undefined && !fontFamily(campaign.dataFont)) errors.push('dataFont must be a plain CSS font-family');
  if (campaign.fonts !== undefined && (!Array.isArray(campaign.fonts) || !campaign.fonts.every(f => fontFamily(f?.family) && text(f?.src)))) errors.push('fonts must be a list of { family, src }');
  return errors;
}

/**
 * Problems with one rendered format. measured comes from the page: { roles: [{ role, box, minFont, maxFont, overflow }],
 * overflow: [selectors], fontsLoaded }.
 */
export function checkLayout(format, measured, expected) {
  const problems = [];
  const found = new Map(measured.roles.map(entry => [entry.role, entry]));
  for (const role of expected) if (!found.has(role)) problems.push(`${role} is missing`);
  for (const entry of measured.roles) {
    const { x, y, width, height } = entry.box;
    if (!insideSafe(entry.box, format)) problems.push(`${entry.role} at ${Math.round(x)},${Math.round(y)} ${Math.round(width)}x${Math.round(height)} leaves the safe zone`);
    const floor = minFont(format, entry.role);
    if (entry.minFont < floor) problems.push(`${entry.role} text is ${entry.minFont}px; ${floor}px is the floor for ${format.width}px shown at ${format.seenAt}px`);
    if (entry.overflow) problems.push(`${entry.role} overflows its box`);
  }
  for (const selector of measured.overflow) problems.push(`${selector} content overflows`);
  const headline = found.get('headline');
  if (headline) for (const entry of measured.roles) {
    if (entry.role !== 'headline' && entry.maxFont * 1.25 > headline.maxFont) problems.push(`${entry.role} (${entry.maxFont}px) competes with the headline (${headline.maxFont}px)`);
  }
  if (!measured.fontsLoaded) problems.push('the brand font did not load; text fell back to another face');
  return problems;
}

/** File weight against the format's budget, if it has one. */
export const checkWeight = (format, bytes) => format.maxBytes && bytes > format.maxBytes ? [`file is ${Math.round(bytes / 1000)} KB; budget is ${format.maxBytes / 1000} KB`] : [];

const css = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{overflow:hidden}
body{font-family:var(--font);color:var(--ink);background:var(--surface);-webkit-font-smoothing:antialiased;font-kerning:normal}
.frame{position:relative;width:var(--w);height:var(--h);overflow:hidden;background:var(--surface);display:grid}
.copy,.stage,.band{position:relative;min-width:0;min-height:0;overflow:hidden}
.copy{display:flex;flex-direction:column}
.message{display:flex;flex-direction:column;gap:calc(var(--fs-headline)*.32)}
.wordmark{display:flex;align-items:center;gap:.42em;font-size:var(--fs-wordmark);font-weight:650;letter-spacing:-.025em;line-height:1.1;white-space:nowrap}
.wordmark img{height:1.05em;width:auto;display:block}
.headline{font-size:var(--fs-headline);font-weight:650;letter-spacing:-.045em;line-height:.98;text-wrap:balance}
.support{font-size:var(--fs-support);line-height:1.3;color:var(--muted);letter-spacing:-.012em;text-wrap:pretty}
.cta{display:inline-flex;align-items:center;gap:.55em;align-self:flex-start;font-size:var(--fs-cta);font-weight:600;letter-spacing:-.01em;background:var(--accent);color:var(--on-accent);border-radius:999px;padding:.62em 1.05em .62em 1.15em;line-height:1.1;white-space:nowrap;box-shadow:inset 0 0 0 max(1.5px,.06em) var(--on-accent)}
.cta svg{width:1em;height:1em;flex:none}
.stage{background:var(--d-surface);color:var(--d-ink)}
.stage .art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:var(--focus)}
.proof{position:relative;display:flex;flex-direction:column;gap:calc(var(--fs-proof)*1.2)}
.card{position:relative;background:var(--elevated);color:var(--ink);border-radius:var(--radius);padding:.85em 1em .95em;font-size:var(--fs-proof);line-height:1.3;letter-spacing:-.01em;box-shadow:0 1px 2px rgb(0 0 0/.25),0 1.4em 3em -1.2em rgb(0 0 0/.7)}
.label{font-family:var(--data-font);font-size:var(--fs-label);font-weight:500;letter-spacing:0;color:var(--muted);margin-bottom:.55em;white-space:nowrap}
.claim{background:var(--accent);color:var(--on-accent);border-radius:.16em;padding:.02em .14em;margin-inline:-.14em;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.claim sup{font-family:var(--data-font);font-size:var(--fs-label);font-weight:500;margin-left:.2em;line-height:0}
.head{display:flex;align-items:center;gap:.5em;font-weight:600;white-space:nowrap}
.n{display:inline-grid;place-items:center;flex:none;min-width:1.4em;height:1.4em;border-radius:.32em;background:var(--ink);color:var(--elevated);font-family:var(--data-font);font-size:var(--fs-label);font-weight:500}
.line{margin-top:.4em;color:var(--muted)}
.line span{background:var(--accent);color:var(--on-accent);border-radius:.16em;padding:.02em .14em;margin-inline:-.14em;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.compact .claimline{font-weight:600}
.compact .head{margin-top:.5em;font-weight:500;color:var(--muted)}
.link{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:2}
.link path{fill:none;stroke:var(--accent);stroke-width:var(--link);stroke-linecap:round}
.link .under{stroke:var(--ink);stroke-width:calc(var(--link)*2.6)}
.link circle{fill:var(--accent);stroke:var(--ink);stroke-width:calc(var(--link)*.8)}
.disclosure{font-size:var(--fs-disclosure);line-height:1.3;color:var(--d-muted);letter-spacing:0}
.band{background:var(--accent);color:var(--on-accent);display:flex;align-items:center}
.band .cta{background:var(--on-accent);color:var(--accent);box-shadow:none}

/* wide: copy on paper at left, proof on an ink field that bleeds off the right edge */
[data-family=wide]{grid-template-columns:52% 48%}
[data-family=wide] .copy{padding:var(--st) calc(var(--s)*6) var(--sb) var(--sl);justify-content:space-between}
[data-family=wide] .stage{padding:var(--st) var(--sr) var(--sb) calc(var(--s)*7);display:flex;flex-direction:column;justify-content:center;gap:calc(var(--fs-disclosure)*.9)}
[data-family=wide] .disclosure{position:absolute;left:calc(var(--s)*7);right:var(--sr);bottom:var(--sb)}

/* square: headline over an ink proof field, call to action in a highlighter band */
[data-family=square]{grid-template-rows:auto minmax(0,1fr) auto}
[data-family=square] .copy{padding:var(--st) var(--sr) calc(var(--s)*4) var(--sl);gap:calc(var(--s)*4)}
[data-family=square] .stage{padding:calc(var(--s)*5) var(--sr) calc(var(--s)*3) var(--sl);display:flex;flex-direction:column;justify-content:center;gap:calc(var(--s)*3)}
[data-family=square] .band{padding:calc(var(--s)*3) var(--sr) var(--sb) var(--sl);justify-content:space-between}

/* portrait: poster stack, the reply and its source on an ink field, the trial in a highlighter band */
[data-family=portrait]{grid-template-rows:auto minmax(0,1fr) auto}
[data-family=portrait] .copy{padding:var(--st) var(--sr) calc(var(--s)*6) var(--sl);gap:calc(var(--s)*6)}
[data-family=portrait] .stage{padding:calc(var(--s)*7) calc(var(--sr) + var(--s)*2) calc(var(--s)*4) calc(var(--sl) + var(--s)*2);display:flex;flex-direction:column;justify-content:center;gap:calc(var(--s)*4)}
[data-family=portrait] .band{padding:calc(var(--s)*4.5) var(--sr) var(--sb) var(--sl)}
[data-family=portrait] .band .cta{font-size:calc(var(--fs-cta)*1.15)}

/* tall: highlighter field with the message above the fold of the phone, ink below with the proof crossing the seam */
[data-family=tall]{grid-template-rows:auto minmax(0,1fr);background:var(--d-surface)}
[data-family=tall] .copy{background:var(--accent);color:var(--on-accent);padding:var(--st) var(--sr) calc(var(--s)*12) var(--sl);gap:calc(var(--s)*4)}
[data-family=tall] .copy .support{color:var(--on-accent)}
[data-family=tall] .copy .cta{background:var(--on-accent);color:var(--accent);box-shadow:none}
[data-family=tall] .stage{overflow:visible;background:transparent;padding:0 calc(var(--sr) + var(--s)*2) 0 calc(var(--sl) + var(--s)*2);margin-top:calc(var(--s)*-9);display:flex;flex-direction:column;gap:calc(var(--s)*4)}

/* strip: one line of reading order, left to right */
[data-family=strip]{grid-template-columns:auto minmax(0,1fr) auto;align-items:center;column-gap:calc(var(--h)*.26);padding:var(--st) calc(var(--sr) + var(--h)*.12) var(--sb) calc(var(--sl) + var(--h)*.12)}
[data-family=strip] .copy{justify-content:center;gap:calc(var(--h)*.08)}
[data-family=strip] .headline{white-space:nowrap}
[data-family=strip] .card{background:none;box-shadow:none;padding:0;display:flex;align-items:center;gap:.7em;white-space:nowrap}
[data-family=strip] .compact .head{margin-top:0}
[data-family=strip] .end{display:flex;flex-direction:column;align-items:flex-end;gap:calc(var(--h)*.08)}
[data-family=strip] .disclosure{color:var(--muted)}
`;

/** Runs inside the page. Builds the format from data with DOM nodes only; contract text never becomes markup. */
function compose(data) {
  const { family, compact, layers, format, sizes, tokens, message, name, mark, art, dataFont } = data;
  const root = document.documentElement.style;
  const set = (key, value) => root.setProperty(key, value);
  const light = tokens.light, dark = tokens.dark ?? tokens.light;
  set('--surface', light.surface); set('--elevated', light.elevated); set('--ink', light.ink); set('--muted', light.muted);
  set('--accent', light.accent); set('--on-accent', light.onAccent); set('--line', light.line); set('--radius', light.radius);
  set('--d-surface', dark.surface); set('--d-ink', dark.ink); set('--d-muted', dark.muted);
  set('--font', light.font); set('--data-font', dataFont ?? light.font);
  set('--w', `${format.width}px`); set('--h', `${format.height}px`);
  set('--s', `${Math.min(format.width, format.height) / 100}px`);
  set('--link', `${Math.max(1.5, Math.min(format.width, format.height) / 300)}px`);
  const [top, right, bottom, left] = format.safe;
  set('--st', `${format.height * top}px`); set('--sr', `${format.width * right}px`); set('--sb', `${format.height * bottom}px`); set('--sl', `${format.width * left}px`);
  for (const [role, px] of Object.entries(sizes)) set(`--fs-${role}`, `${px}px`);

  const el = (tag, className, textValue) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textValue !== undefined) node.textContent = textValue;
    return node;
  };
  const has = role => layers.includes(role) && (role === 'wordmark' || role === 'proof' ? true : Boolean(message[role]));
  const frame = el('div', 'frame');
  frame.dataset.family = family;
  const copy = el('div', 'copy');
  const stage = el('div', 'stage');
  const band = el('div', 'band');

  const wordmark = el('div', 'wordmark');
  wordmark.dataset.role = 'wordmark';
  if (mark) { const img = el('img'); img.src = mark; img.alt = ''; wordmark.append(img); }
  wordmark.append(document.createTextNode(name));

  const block = el('div', 'message');
  const headline = el('h1', 'headline', message.headline);
  headline.dataset.role = 'headline';
  block.append(headline);
  if (has('support')) { const p = el('p', 'support', message.support); p.dataset.role = 'support'; block.append(p); }

  const cta = el('div', 'cta');
  cta.dataset.role = 'cta';
  cta.append(document.createTextNode(message.cta));
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  arrow.setAttribute('viewBox', '0 0 16 16');
  arrow.setAttribute('aria-hidden', 'true');
  const shaft = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  shaft.setAttribute('d', 'M2.5 8h10.5M9 3.5 13.5 8 9 12.5');
  shaft.setAttribute('fill', 'none');
  shaft.setAttribute('stroke', 'currentColor');
  shaft.setAttribute('stroke-width', '1.8');
  shaft.setAttribute('stroke-linecap', 'round');
  shaft.setAttribute('stroke-linejoin', 'round');
  arrow.append(shaft);
  cta.append(arrow);

  let proof;
  if (message.proof && has('proof')) {
    const p = message.proof;
    proof = el('div', `proof${compact ? ' compact' : ''}`);
    proof.dataset.role = 'proof';
    const claim = el('mark', 'claim', p.claim);
    // The compact card puts the source directly under the claim, so only the full reply needs a citation number.
    if (!compact) claim.append(el('sup', '', '1'));
    const number = el('span', 'n', '1');
    const head = el('p', 'head');
    head.append(number, document.createTextNode(p.source));
    if (compact) {
      const card = el('div', 'card');
      const line = el('p', 'claimline');
      line.append(claim);
      card.append(line, head);
      proof.append(card);
    } else {
      const reply = el('div', 'card reply');
      if (p.label) reply.append(el('p', 'label', p.label));
      const body = el('p', 'text');
      if (p.before) body.append(document.createTextNode(`${p.before} `));
      body.append(claim);
      reply.append(body);
      const source = el('div', 'card source');
      source.append(head);
      if (p.sourceLine) { const line = el('p', 'line'); line.append(el('span', '', p.sourceLine)); source.append(line); }
      proof.append(reply, source);
    }
  } else if (art && has('proof')) {
    const img = el('img', 'art');
    img.src = art.src;
    img.alt = art.alt;
    stage.style.setProperty('--focus', art.focus);
    stage.append(img);
  }
  const disclosure = has('disclosure') ? el('p', 'disclosure', message.disclosure) : undefined;
  if (disclosure) disclosure.dataset.role = 'disclosure';

  const show = role => has(role);
  if (family === 'strip') {
    if (show('wordmark')) frame.append(wordmark);
    copy.append(headline);
    if (proof) copy.append(proof);
    frame.append(copy);
    const end = el('div', 'end');
    if (show('cta')) end.append(cta);
    if (disclosure) end.append(disclosure);
    frame.append(end);
  } else if (family === 'wide') {
    if (show('wordmark')) copy.append(wordmark);
    copy.append(block);
    if (show('cta')) copy.append(cta); else copy.append(el('span'));
    if (proof) stage.append(proof);
    if (disclosure) stage.append(disclosure);
    frame.append(copy, stage);
  } else if (family === 'tall') {
    if (show('wordmark')) copy.append(wordmark);
    copy.append(block);
    if (show('cta')) copy.append(cta);
    if (proof) stage.append(proof);
    if (disclosure) stage.append(disclosure);
    frame.append(copy, stage);
  } else {
    if (show('wordmark')) copy.append(wordmark);
    copy.append(block);
    if (proof) stage.append(proof);
    if (disclosure) stage.append(disclosure);
    frame.append(copy, stage);
    if (show('cta')) { band.append(cta); frame.append(band); }
  }
  document.body.append(frame);
}

/** Runs inside the page: shrink support, proof and then headline toward their floors until nothing overflows, then draw the connector. */
function fitAndMeasure({ sizes, floors }) {
  const root = document.documentElement.style;
  const boxes = ['.frame', '.copy', '.stage', '.band'];
  const overflowing = () => boxes.flatMap(selector => [...document.querySelectorAll(selector)])
    .some(node => getComputedStyle(node).overflow !== 'visible' && (node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1));
  for (const role of ['support', 'proof', 'headline']) {
    let px = sizes[role];
    while (overflowing() && px > floors[role]) { px = Math.max(floors[role], Math.floor(px * .95)); root.setProperty(`--fs-${role}`, `${px}px`); }
  }
  // Connector: from under the cited claim to the source's number, drawn after layout settles.
  const proof = document.querySelector('.proof:not(.compact)');
  const claim = proof?.querySelector('.claim');
  const number = proof?.querySelector('.source .n');
  if (claim && number) {
    const base = proof.getBoundingClientRect();
    const rects = claim.getClientRects();
    const last = rects[rects.length - 1];
    const x1 = last.right - last.height * .45 - base.left, y1 = last.bottom - base.top;
    const target = number.getBoundingClientRect();
    const x2 = target.left + target.width / 2 - base.left, y2 = target.top - base.top;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'link');
    svg.setAttribute('aria-hidden', 'true');
    const d = (y2 - y1) * .55;
    // An ink casing under a highlighter stroke keeps the line visible on white cards and on the ink field.
    for (const layer of ['under', 'over']) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', layer);
      path.setAttribute('d', `M${x1} ${y1} C${x1} ${y1 + d} ${x2} ${y2 - d} ${x2} ${y2}`);
      svg.append(path);
    }
    const r = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--link')) * 2.2;
    for (const [cx, cy] of [[x1, y1], [x2, y2]]) {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('r', r);
      svg.append(dot);
    }
    proof.append(svg);
  }
  const textSizes = node => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const found = [];
    while (walker.nextNode()) if (walker.currentNode.textContent.trim()) found.push(parseFloat(getComputedStyle(walker.currentNode.parentElement).fontSize));
    return found.length ? found : [0];
  };
  const roles = [...document.querySelectorAll('[data-role]')].map(node => {
    const { x, y, width, height } = node.getBoundingClientRect();
    const found = textSizes(node);
    return { role: node.dataset.role, box: { x, y, width, height }, minFont: Math.min(...found), maxFont: Math.max(...found), overflow: node.scrollWidth > node.clientWidth + 1 };
  });
  const overflow = boxes.filter(selector => [...document.querySelectorAll(selector)].some(node => getComputedStyle(node).overflow !== 'visible' && (node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1)));
  const family = getComputedStyle(document.body).fontFamily;
  return { roles, overflow, fontsLoaded: document.fonts.check(`16px ${family}`) && [...document.fonts].some(face => face.status === 'loaded') };
}

async function loadFonts(faces) {
  for (const face of faces) {
    const bytes = Uint8Array.from(atob(face.data), c => c.charCodeAt(0));
    const font = new FontFace(face.family, bytes, { weight: face.weight ?? 'normal', style: face.style ?? 'normal' });
    document.fonts.add(await font.load());
  }
  await document.fonts.ready;
}

const mime = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const dataUrl = file => `data:${mime[path.extname(file).toLowerCase()] ?? 'application/octet-stream'};base64,${readFileSync(file).toString('base64')}`;

async function main() {
  const args = process.argv.slice(2);
  const flag = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
  if (!flag('brand') || !flag('campaign')) {
    console.error('usage: node campaign-render.mjs --brand brand.json --campaign campaign.json [--formats og,feed] [--out DIR]');
    process.exit(1);
  }
  let chromium;
  try { ({ chromium } = await import('playwright-core')); } catch {
    console.error('playwright-core is not installed here. Run: npm install --no-save playwright-core && npx playwright-core install chromium');
    process.exit(1);
  }
  const brand = JSON.parse(readFileSync(flag('brand'), 'utf8'));
  const campaignFile = flag('campaign');
  const campaign = JSON.parse(readFileSync(campaignFile, 'utf8'));
  const errors = [...validateBrand(brand).map(error => `brand: ${error}`), ...checkCampaign(campaign)];
  const ids = flag('formats')?.split(',') ?? campaign.formats ?? [];
  for (const id of ids) if (!formats[id]) errors.push(`unknown format ${id}`);
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

  const base = path.dirname(campaignFile);
  const out = flag('out') ?? path.join(base, 'renders');
  mkdirSync(out, { recursive: true });
  const faces = (campaign.fonts ?? []).map(face => ({ ...face, data: readFileSync(path.resolve(base, face.src)).toString('base64') }));
  const mark = campaign.mark ? dataUrl(path.resolve(base, campaign.mark)) : undefined;

  const browser = await chromium.launch();
  const report = [];
  let failed = false;
  for (const id of ids) {
    const format = formats[id];
    const family = familyFor(format.width, format.height);
    const layers = format.layers ?? roles;
    const sizes = typeScale(format);
    const floors = Object.fromEntries(Object.keys(sizes).map(role => [role, minFont(format, role)]));
    const picked = artFor(campaign.art, family);
    const art = picked && { ...picked, src: dataUrl(path.resolve(base, picked.src)) };
    const page = await browser.newPage({ viewport: { width: format.width, height: format.height }, deviceScaleFactor: format.scale });
    const problems = [];
    page.on('pageerror', error => problems.push(error.message));
    await page.setContent(`<!doctype html><html lang="${campaign.lang ?? 'en'}"><head><meta charset="utf-8"><style>${css}${format.pdf ? `@page{size:${format.pdf.width} ${format.pdf.height};margin:0}` : ''}</style></head><body></body></html>`);
    await page.evaluate(loadFonts, faces);
    await page.evaluate(compose, { family, compact: Boolean(format.compact), layers, format, sizes, tokens: brand.tokens, message: campaign.message, name: brand.name, mark, art, dataFont: campaign.dataFont });
    await page.evaluate(() => Promise.all([...document.images].map(img => img.decode().catch(() => {}))));
    const measured = await page.evaluate(fitAndMeasure, { sizes, floors });
    const expected = layers.filter(role => role === 'wordmark' || (role === 'proof' ? Boolean(campaign.message.proof || campaign.art) : Boolean(campaign.message[role])));
    problems.push(...checkLayout(format, measured, expected));
    const file = `${id}.${format.type === 'jpeg' ? 'jpg' : 'png'}`;
    await page.screenshot({ path: path.join(out, file), type: format.type, ...(format.type === 'jpeg' ? { quality: format.quality ?? 85 } : {}) });
    const files = [file];
    if (format.pdf) {
      await page.pdf({ path: path.join(out, `${id}.pdf`), width: format.pdf.width, height: format.pdf.height, printBackground: true, pageRanges: '1' });
      files.push(`${id}.pdf`);
    }
    const bytes = statSync(path.join(out, file)).size;
    problems.push(...checkWeight(format, bytes));
    await page.close();
    if (problems.length) failed = true;
    report.push({ id, label: format.label, family, size: `${Math.round(format.width * format.scale)}x${Math.round(format.height * format.scale)}`, files, bytes, maxBytes: format.maxBytes, fonts: Object.fromEntries(measured.roles.map(r => [r.role, r.maxFont])), problems });
    console.log(`${problems.length ? 'FAIL' : 'ok  '} ${id} ${family} ${Math.round(bytes / 1000)} KB${problems.length ? `\n  ${problems.join('\n  ')}` : ''}`);
  }

  // Contact sheet: every format side by side, small ones at delivery size, so family consistency can be judged at a glance.
  const sheet = await browser.newPage({ viewport: { width: 2400, height: 800 } });
  await sheet.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:64px;background:${brand.tokens.light.surface};color:${brand.tokens.light.ink};font:15px/1.4 system-ui,sans-serif;display:flex;flex-wrap:wrap;gap:56px 48px;align-items:flex-end}figure{margin:0}img{display:block;box-shadow:0 0 0 1px ${brand.tokens.light.line}}figcaption{margin-top:12px;font-family:ui-monospace,monospace;font-size:14px}</style></head><body></body></html>`);
  await sheet.evaluate(items => {
    for (const item of items) {
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      img.src = item.src;
      const fit = Math.min(1, 760 / item.width, 760 / item.height);
      img.width = Math.round(item.width * fit);
      img.height = Math.round(item.height * fit);
      const caption = document.createElement('figcaption');
      caption.textContent = item.caption;
      figure.append(img, caption);
      document.body.append(figure);
    }
  }, report.map(entry => ({ src: dataUrl(path.join(out, entry.files[0])), width: formats[entry.id].width, height: formats[entry.id].height, caption: `${entry.id} · ${entry.size} · ${entry.family}${entry.problems.length ? ' · FAIL' : ''}` })));
  await sheet.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
  await sheet.screenshot({ path: path.join(out, 'contact-sheet.png'), fullPage: true });
  await browser.close();
  writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${report.length} formats in ${out}`);
  if (failed) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
