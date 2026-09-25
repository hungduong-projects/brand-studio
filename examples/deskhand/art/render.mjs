// Render the Deskhand art family from the brand tokens: one master and four versioned derivatives.
//
//   node examples/deskhand/art/render.mjs
//
// Every asset is drawn in SVG from shared geometry, then rasterised with playwright-core's Chromium.
// Existing files are never replaced: to change an approved asset, bump its version and render a new file.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const brand = JSON.parse(readFileSync(path.join(here, '../../../apps/showcase/src/deskhand.brand.json'), 'utf8'));
const L = brand.tokens.light, D = brand.tokens.dark;

/* Deterministic randomness, so a re-render draws the same marks. */
const rng = seed => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

/* A highlighter stroke: flat body, slightly uneven long edges, angled chisel ends. */
function stroke(x, y, w, h, seed, opacity = .92, blend = true) {
  const r = rng(seed), wob = () => (r() - .5) * Math.min(h * .08, 8), cut = h * .18, n = Math.max(6, Math.round(w / 80));
  const top = [], bottom = [];
  for (let i = 0; i <= n; i++) top.push(`${(x + cut + (w - cut) * i / n).toFixed(1)} ${(y + wob()).toFixed(1)}`);
  for (let i = n; i >= 0; i--) bottom.push(`${(x + (w - cut) * i / n).toFixed(1)} ${(y + h + wob()).toFixed(1)}`);
  return `<path d="M${top.join(' L')} L${bottom.join(' L')} Z" fill="${L.accent}" opacity="${opacity}"${blend ? ' style="mix-blend-mode:multiply"' : ''}/>`;
}

const bar = (x, y, w, h, fill, o = 1) => `<rect x="${x}" y="${y}" width="${Math.max(w, 0)}" height="${h}" rx="${h / 2}" fill="${fill}" opacity="${o}"/>`;
const rule = (x, y, w, o = .45) => `<rect x="${x}" y="${y}" width="${w}" height="1.5" fill="${L.line}" opacity="${o}"/>`;

/* Paper: white sheet, hairline edge, soft top-edge highlight, shadow from elevation. */
function paper(w, h, inner) {
  return `<g filter="url(#lift)"><rect width="${w}" height="${h}" rx="24" fill="${L.elevated}"/></g>
  <rect x=".75" y=".75" width="${w - 1.5}" height="${h - 1.5}" rx="23.5" fill="none" stroke="${L.line}" stroke-opacity=".35" stroke-width="1.5"/>
  <rect x="24" y="1.5" width="${w - 48}" height="2" rx="1" fill="#ffffff"/>${inner}`;
}

/* Greeked text: ink bars stand in for words, so the art never carries text to translate or misread. */
function lines(x, y, widths, { gap = 34, h = 13, o = .16, marks = {} } = {}) {
  return widths.map((w, i) => {
    const m = marks[i], words = [], r = rng(97 + i * 13);
    for (let at = 0; at < w - 20;) { const ww = Math.min(40 + r() * 90, w - at); words.push({ at, ww, on: m && at >= w * m[0] - 4 && at < w * m[1] }); at += ww + 10; }
    const lit = words.filter(v => v.on);
    // The mark covers whole words, a little past each end, as a hand would draw it.
    const hl = lit.length ? stroke(x + lit[0].at - 12, y + i * gap - 10, lit.at(-1).at + lit.at(-1).ww - lit[0].at + 26, h + 20, 11 + i) : '';
    return hl + words.map(v => bar(x + v.at, y + i * gap, v.ww, h, L.ink, v.on ? .8 : o)).join('');
  }).join('');
}

/* Geometry shared by every asset. Sizes in px at 2400 px master width. */
const REPLY = { w: 760, h: 940 };
const DOC = { w: 480 };
// Each citation: which reply line it marks, the span on that line, and which document line it came from.
const REPLY_LINES = [610, 560, 632, 540, 600, 470, 612, 380];
const CITES = [
  { n: 1, line: 1, span: [.34, 1], doc: 'help' },
  { n: 2, line: 3, span: [0, .72], doc: 'order' },
  { n: 3, line: 6, span: [.18, .86], doc: 'payments' },
];
const REPLY_BODY_Y = 420;

function replySheet() {
  const p = 64, marks = Object.fromEntries(CITES.map(c => [c.line, c.span]));
  return paper(REPLY.w, REPLY.h, `
  <circle cx="${p + 22}" cy="${p + 22}" r="22" fill="none" stroke="${L.line}" stroke-width="1.5"/>
  ${bar(p + 60, p + 8, 190, 14, L.ink, .85)}${bar(p + 60, p + 30, 120, 11, L.muted, .45)}
  <rect x="${REPLY.w - p - 104}" y="${p + 6}" width="104" height="32" rx="8" fill="none" stroke="${L.line}" stroke-width="1.5"/>${bar(REPLY.w - p - 88, p + 16, 72, 12, L.ink, .7)}
  ${rule(p, p + 84, REPLY.w - p * 2)}
  <rect x="${p}" y="${p + 116}" width="${REPLY.w - p * 2}" height="132" rx="14" fill="${L.surface}"/>
  ${lines(p + 28, p + 150, [520, 330], { o: .3 })}
  ${bar(p, REPLY_BODY_Y - 64, 120, 11, L.muted, .55)}
  ${lines(p, REPLY_BODY_Y, REPLY_LINES, { gap: 44, marks })}
  ${rule(p, REPLY.h - 150, REPLY.w - p * 2)}
  ${bar(p, REPLY.h - 100, 200, 12, L.muted, .5)}${bar(p + 212, REPLY.h - 100, 48, 12, L.ink, .75)}
  <rect x="${REPLY.w - p - 232}" y="${REPLY.h - 122}" width="232" height="56" rx="28" fill="${L.ink}"/>${bar(REPLY.w - p - 184, REPLY.h - 100, 136, 12, L.elevated, .9)}`);
}
/* Point where a citation meets the reply edge, in reply-sheet coordinates. */
const citeAt = (c, side) => ({ x: side > 0 ? REPLY.w : 0, y: REPLY_BODY_Y + c.line * 44 + 6 });

/* The three sources. `hl` is the cited line index; `target` returns its anchor in sheet coordinates. */
function docHeader(n, w) {
  const p = 52, dots = Array.from({ length: n }, (_, i) => `<circle cx="${p + 14 + i * 12 - (n - 1) * 6}" cy="${p + 14}" r="3.5" fill="${L.ink}"/>`).join('');
  return `<rect x="${p}" y="${p}" width="28" height="28" rx="8" fill="${L.accent}" stroke="${L.ink}" stroke-width="1.5"/>${dots}
  ${bar(p + 44, p + 3, 150, 11, L.muted, .55)}${bar(p + 44, p + 20, 96, 9, L.muted, .3)}${bar(p, p + 64, w - p * 2 - 80, 20, L.ink, .88)}`;
}
const DOCS = {
  help: {
    h: 620, rows: [372, 340, 356, 250, null, 360, 330, 372, 200], hl: 5,
    draw(d) { return paper(DOC.w, d.h, docHeader(1, DOC.w) + lines(52, 200, d.rows.map(w => w ?? 0), { marks: { [d.hl]: [0, 1] } })); },
    target: d => ({ y: 200 + d.hl * 34 + 6 }),
  },
  order: {
    h: 560, hl: 5,
    draw(d) {
      const p = 52, rows = [[150, 96], [118, 70], [170, 84], [96, 60]];
      let out = docHeader(2, DOC.w);
      rows.forEach(([a, b], i) => {
        const y = 200 + i * 52;
        out += bar(p, y, a, 12, L.ink, .22) + bar(DOC.w - p - b, y, b, 12, L.ink, .5) + rule(p, y + 32, DOC.w - p * 2, .3);
      });
      const y = 200 + 4 * 52 + 20;
      out += stroke(p - 8, y - 12, DOC.w - p * 2 + 16, 36, 5) + bar(p, y, 130, 14, L.ink, .8) + bar(DOC.w - p - 104, y, 104, 14, L.ink, .88);
      return paper(DOC.w, d.h, out + bar(p, d.h - 88, 220, 10, L.muted, .35));
    },
    target: () => ({ y: 200 + 4 * 52 + 20 + 7 }),
  },
  payments: {
    h: 540, rows: [360, 372, 300, 356, 180], hl: 3,
    draw(d) {
      return paper(DOC.w, d.h, docHeader(3, DOC.w) + lines(52, 200, d.rows, { marks: { [d.hl]: [0, .9] } })
        + `<rect x="52" y="${d.h - 128}" width="${DOC.w - 104}" height="64" rx="12" fill="none" stroke="${L.line}" stroke-opacity=".5" stroke-width="1.5"/>`
        + bar(76, d.h - 102, 110, 12, L.ink, .3) + bar(DOC.w - 76 - 76, d.h - 102, 76, 12, L.ink, .55));
    },
    target: d => ({ y: 200 + d.hl * 34 + 6 }),
  },
};

const rad = a => a * Math.PI / 180;
const world = (s, x, y) => ({ x: s.x + x * Math.cos(rad(s.rot)) - y * Math.sin(rad(s.rot)), y: s.y + x * Math.sin(rad(s.rot)) + y * Math.cos(rad(s.rot)) });
const place = (s, inner) => `<g transform="translate(${s.x} ${s.y}) rotate(${s.rot})">${inner}</g>`;

/* A source line: open ring at the citation, bezier, filled dot at the source line. */
function connector(a, b, color = L.ink, width = 3, end = color) {
  const bend = (b.x - a.x) * .5;
  return `<path d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} C${(a.x + bend).toFixed(1)} ${a.y.toFixed(1)} ${(b.x - bend).toFixed(1)} ${b.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>
  <circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="8" fill="${L.elevated}" stroke="${color}" stroke-width="${width}"/><circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="7.5" fill="${end}"/>`;
}

const defs = () => `<defs>
  <filter id="lift" x="-20%" y="-20%" width="140%" height="150%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="2"/><feOffset dy="2" result="contact"/>
    <feGaussianBlur in="SourceAlpha" stdDeviation="28"/><feOffset dy="26" result="ambient"/>
    <feFlood flood-color="${L.ink}" flood-opacity=".09"/><feComposite in2="contact" operator="in" result="c"/>
    <feFlood flood-color="${L.ink}" flood-opacity=".11"/><feComposite in2="ambient" operator="in" result="a"/>
    <feMerge><feMergeNode in="a"/><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>`;
// Flat fields, no grain: noise would multiply the PNG size tenfold for a texture nobody sees at card size.
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs()}${body}</svg>`;
const field = (w, h, color) => `<rect width="${w}" height="${h}" fill="${color}"/>`;

/* Master: the exploded reply. Reply sheet centre, three sources pulled out, a source line per citation. */
function master() {
  const W = 2400, H = 1500;
  const reply = { x: 830, y: 250, rot: -1.2 };
  const at = { help: { x: 150, y: 400, rot: -3.5 }, order: { x: 1790, y: 150, rot: 3 }, payments: { x: 1800, y: 820, rot: -2 } };
  let body = field(W, H, L.surface);
  for (const [k, s] of Object.entries(at)) body += place(s, DOCS[k].draw(DOCS[k]));
  body += place(reply, replySheet());
  for (const c of CITES) {
    const s = at[c.doc], d = DOCS[c.doc], side = s.x > reply.x ? 1 : -1;
    const from = citeAt(c, side), a = world(reply, from.x, from.y);
    const t = d.target(d), b = world(s, side > 0 ? 30 : DOC.w - 30, t.y);
    body += connector(a, b);
  }
  return svg(W, H, body);
}

/* Subject: the reply sheet alone, upright, on transparency. */
const subject = () => svg(REPLY.w + 160, REPLY.h + 180, place({ x: 80, y: 60, rot: 0 }, replySheet()));

/* Object: the order document alone at its master angle, on transparency. */
const object = () => svg(DOC.w + 200, DOCS.order.h + 220, place({ x: 110, y: 70, rot: 3 }, DOCS.order.draw(DOCS.order)));

/* Background: paper field, one highlighter stroke grown into a band, and the order document resting on it.
   The left 55% stays empty for copy. */
function background() {
  const W = 2400, H = 1260, doc = { x: 1660, y: 250, rot: 4 }, d = DOCS.order;
  const band = `<g transform="rotate(-3 1800 980)">${stroke(1020, 830, 1600, 280, 41, 1, false)}</g>`;
  const a = { x: 1340, y: 640 }, b = world(doc, 30, d.target(d).y);
  return svg(W, H, field(W, H, L.surface) + band + place(doc, d.draw(d)) + connector(a, b));
}

/* Atmosphere: dark field of source lines, the pattern the page leaves behind once every claim is linked.
   Lines run left to right in near order, so the texture reads calm, with two landing on yellow. */
function atmosphere() {
  const W = 2400, H = 1200, r = rng(7), order = [1, 0, 2, 4, 3, 5, 7, 6, 8, 10, 9];
  let body = field(W, H, D.surface);
  order.forEach((j, i) => {
    const a = { x: 140 + r() * 520, y: 110 + i * 98 }, b = { x: 1740 + r() * 520, y: 110 + j * 98 + (r() - .5) * 20 };
    const lit = i === 3 || i === 8;
    body += connector(a, b, lit ? D.muted : D.line, lit ? 2.5 : 2, lit ? L.accent : D.line).replace(new RegExp(L.elevated, 'g'), D.surface);
  });
  return svg(W, H, body);
}

const family = [
  ['master/exploded-reply.png', master, false],
  ['derivatives/background-v1.png', background, false],
  ['derivatives/subject-v1.png', subject, true],
  ['derivatives/object-v1.png', object, true],
  ['derivatives/atmosphere-v1.png', atmosphere, false],
];

let chromium;
try { ({ chromium } = await import('playwright-core')); } catch {
  console.error('playwright-core is missing. Run npm ci at the repo root, then npx playwright-core install chromium.');
  process.exit(1);
}
const browser = await chromium.launch();
try {
  for (const [file, draw, transparent] of family) {
    const out = path.join(here, file);
    if (existsSync(out)) { console.log(`kept ${file} (exists; bump the version to change it)`); continue; }
    mkdirSync(path.dirname(out), { recursive: true });
    const markup = draw();
    const [, w, h] = markup.match(/width="(\d+)" height="(\d+)"/);
    const page = await browser.newPage({ viewport: { width: +w, height: +h } });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${markup}`);
    const png = await page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: +w, height: +h } });
    await page.close();
    writeFileSync(out, png, { flag: 'wx' });
    console.log(`wrote ${file} ${w}x${h} sha256 ${createHash('sha256').update(png).digest('hex')}`);
  }
} finally { await browser.close(); }
