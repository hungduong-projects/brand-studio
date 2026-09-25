#!/usr/bin/env node
// Build an editable 16:9 PowerPoint deck from a brand contract and a deck outline.
//
//   node slides.mjs --brand brand/brand.json --deck deck.json --out deck.pptx [--fallback-fonts]
//
// Needs pptxgenjs (MIT). Run it from a project that has pptxgenjs installed, or install it first.
// Each slide uses one semantic layout; the layout owns the composition, the contract owns every colour and font.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateBrand } from './brand-check.mjs';

export const LAYOUTS = ['cover', 'section', 'statement', 'image', 'comparison', 'data', 'process', 'closing'];
const TONES = ['light', 'dark', 'accent'];
const DEFAULT_TONE = { cover: 'light', section: 'accent', statement: 'light', image: 'light', comparison: 'light', data: 'light', process: 'dark', closing: 'accent' };
export const MIN_BODY_PT = 18;
const MAX_TITLE_WORDS = 15, MAX_BODY_WORDS = 45, MAX_POINT_WORDS = 20;

// 16:9 widescreen in inches, with 5% side and top margins as the title-safe area.
const W = 13.333, H = 7.5, MX = 0.667, MY = 0.5, CW = W - 2 * MX, FOOT_Y = 6.9, SOURCE_Y = 6.42;
const GENERIC = { 'sans-serif': 'Arial', 'system-ui': 'Arial', serif: 'Georgia', monospace: 'Courier New' };

const isText = value => typeof value === 'string' && value.trim().length > 0;
const words = text => (isText(text) ? text.trim().split(/\s+/).length : 0);
const list = value => (Array.isArray(value) ? value : value === undefined ? [] : [value]);

/** Returns a list of problems; an empty list means the deck can be built. */
export function validateDeck(deck) {
  const errors = [];
  if (!deck || typeof deck !== 'object' || Array.isArray(deck)) return ['deck must be an object'];
  if (!isText(deck.title)) errors.push('title must be nonempty text');
  for (const [key, value] of Object.entries(deck.sizes ?? {})) {
    if (typeof value !== 'number' || value < MIN_BODY_PT) errors.push(`sizes.${key} must be a number of at least ${MIN_BODY_PT}pt`);
  }
  if (!Array.isArray(deck.slides) || !deck.slides.length) return [...errors, 'slides must be a nonempty array'];
  const titles = new Map();
  deck.slides.forEach((slide, i) => {
    const at = `slides[${i}]`;
    if (!slide || typeof slide !== 'object') { errors.push(`${at} must be an object`); return; }
    if (!LAYOUTS.includes(slide.layout)) errors.push(`${at}.layout must be one of ${LAYOUTS.join(', ')}`);
    if (slide.tone !== undefined && !TONES.includes(slide.tone)) errors.push(`${at}.tone must be one of ${TONES.join(', ')}`);
    if (!isText(slide.title)) errors.push(`${at}.title must be nonempty text`);
    else {
      if (words(slide.title) > MAX_TITLE_WORDS) errors.push(`${at}.title has ${words(slide.title)} words; keep it to ${MAX_TITLE_WORDS} and split the idea`);
      const key = slide.title.trim().toLowerCase();
      if (titles.has(key)) errors.push(`${at}.title repeats slides[${titles.get(key)}]; every slide needs a unique title`);
      titles.set(key, i);
    }
    if (slide.body !== undefined && !isText(slide.body)) errors.push(`${at}.body must be nonempty text when present`);
    if (words(slide.body) > MAX_BODY_WORDS) errors.push(`${at}.body has ${words(slide.body)} words; keep it to ${MAX_BODY_WORDS}`);
    if (slide.highlight !== undefined && !(isText(slide.highlight) && [slide.body, slide.subtitle].some(t => t?.includes(slide.highlight)))) errors.push(`${at}.highlight must be a phrase from body or subtitle`);
    if (slide.notes !== undefined && typeof slide.notes !== 'string') errors.push(`${at}.notes must be text`);
    if (slide.points !== undefined && (!Array.isArray(slide.points) || slide.points.length > 5 || !slide.points.every(isText))) errors.push(`${at}.points must be one to five text items`);
    list(slide.points).forEach((p, k) => { if (words(p) > MAX_POINT_WORDS) errors.push(`${at}.points[${k}] has ${words(p)} words; keep it to ${MAX_POINT_WORDS}`); });
    if (slide.source !== undefined && !list(slide.source).every(isText)) errors.push(`${at}.source must be text or a list of text`);
    if (slide.layout === 'image') {
      if (!isText(slide.image?.path)) errors.push(`${at}.image.path is required`);
      if (!isText(slide.image?.alt)) errors.push(`${at}.image.alt is required alt text`);
      if (!isText(slide.image?.source)) errors.push(`${at}.image.source must record where the image came from`);
    }
    if (slide.layout === 'data') {
      const metric = isText(slide.metric?.value) && isText(slide.metric?.label);
      const chart = Array.isArray(slide.chart?.labels) && Array.isArray(slide.chart?.values) && slide.chart.labels.length === slide.chart.values.length && slide.chart.values.length > 0 && slide.chart.values.every(Number.isFinite);
      if (!metric && !chart) errors.push(`${at} needs a metric {value, label} or a chart {labels, values} of equal length`);
      if (!list(slide.source).length) errors.push(`${at}.source is required for a data slide`);
    }
    if (slide.layout === 'comparison') {
      if (!isText(slide.basis)) errors.push(`${at}.basis must state what the columns are compared on`);
      if (!Array.isArray(slide.columns) || slide.columns.length < 2 || slide.columns.length > 3) errors.push(`${at}.columns must hold two or three options`);
      else slide.columns.forEach((c, k) => { if (!isText(c?.heading) || !Array.isArray(c.points) || !c.points.length || !c.points.every(isText)) errors.push(`${at}.columns[${k}] needs a heading and points`); });
    }
    if (slide.layout === 'process') {
      if (!Array.isArray(slide.steps) || slide.steps.length < 3 || slide.steps.length > 5) errors.push(`${at}.steps must hold three to five stages`);
      else slide.steps.forEach((s, k) => { if (!isText(s?.title)) errors.push(`${at}.steps[${k}].title is required`); });
    }
  });
  return errors;
}

/** First family in a CSS font stack, minus a "Variable" suffix, plus a safe fallback taken from the stack's generic family. */
export function fontsFrom(brand, deck = {}) {
  const stack = String(brand.tokens.light.font).split(',').map(f => f.trim().replace(/^["']|["']$/g, ''));
  const face = stack[0].replace(/\s+Variable$/i, '');
  const generic = stack.find(f => GENERIC[f]);
  const fallback = deck.fonts?.fallback ?? GENERIC[generic] ?? 'Arial';
  return {
    head: deck.fonts?.head ?? face,
    body: deck.fonts?.body ?? face,
    mono: deck.fonts?.mono ?? 'Courier New',
    fallback,
    monoFallback: deck.fonts?.monoFallback ?? 'Courier New',
  };
}

const bare = hex => hex.replace('#', '').toUpperCase();

function palettes(brand) {
  const { light, dark } = brand.tokens;
  return {
    light: { bg: light.surface, text: light.ink, muted: light.muted, line: light.line, card: light.elevated, cardText: light.ink, chip: light.accent, chipText: light.onAccent },
    dark: { bg: dark.surface, text: dark.ink, muted: dark.muted, line: dark.line, card: dark.elevated, cardText: dark.ink, chip: dark.accent, chipText: dark.onAccent },
    accent: { bg: light.accent, text: light.onAccent, muted: light.onAccent, line: light.onAccent, card: light.elevated, cardText: light.ink, chip: light.onAccent, chipText: light.accent },
  };
}

// Rough line count for a text box: average glyph width is about half the point size in a grotesque.
const lineCount = (text, size, width, bold = false) => Math.max(1, Math.ceil((text.length * size * (bold ? 0.58 : 0.55)) / 72 / width));
const blockHeight = (text, size, width, spacing = 1.2, bold = false) => (lineCount(text, size, width, bold) * size * spacing) / 72;

// Title geometry per layout: [bottom edge, width, largest size, smallest size, lines allowed]. Titles sit on the bottom
// edge, so content below starts at the same place whatever the title length.
const TITLE = {
  cover: [4.3, 11.2, 60, 48, 3],
  section: [4.2, 10.8, 54, 44, 3],
  statement: [2.0, 11.4, 36, 32, 2],
  image: [1.6, 11.4, 30, 28, 2],
  comparison: [2.0, 11.4, 36, 32, 2],
  data: [2.0, 11.4, 36, 32, 2],
  process: [2.0, 11.4, 36, 32, 2],
  closing: [3.8, 10.8, 60, 48, 2],
};

function titleSize(layout, title) {
  const [, w, max, min, lines] = TITLE[layout];
  for (let size = max; size >= min; size -= 2) if (lineCount(title, size, w, true) <= lines) return size;
  return null;
}

/** Runs for a paragraph with an optional highlighter phrase in the accent colour. */
function runs(text, highlight, colors, base = {}) {
  if (!highlight || !text.includes(highlight)) return [{ text, options: base }];
  const [before, ...rest] = text.split(highlight);
  const mark = { ...base, highlight: bare(colors.accent), color: bare(colors.onAccent) };
  return [before && { text: before, options: base }, { text: highlight, options: mark }, rest.join(highlight) && { text: rest.join(highlight), options: base }].filter(Boolean);
}

function imageSize(buffer) {
  if (buffer.readUInt32BE(0) === 0x89504e47) return { w: buffer.readUInt32BE(16), h: buffer.readUInt32BE(20) };
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    for (let i = 2; i < buffer.length;) {
      const marker = buffer[i + 1], length = buffer.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { w: buffer.readUInt16BE(i + 7), h: buffer.readUInt16BE(i + 5) };
      i += 2 + length;
    }
  }
  throw new Error('image must be a PNG or JPEG file');
}

/** Rewrites the Office colour scheme so theme colours in PowerPoint's pickers match the contract. */
function brandTheme(xml, brand) {
  const { light, dark } = brand.tokens;
  const slot = (name, hex) => `<a:${name}><a:srgbClr val="${bare(hex)}"/></a:${name}>`;
  const name = brand.name.replace(/[<>&"]/g, '');
  const scheme = `<a:clrScheme name="${name}">${slot('dk1', light.ink)}${slot('lt1', light.surface)}${slot('dk2', dark.surface)}${slot('lt2', light.elevated)}`
    + `${slot('accent1', light.accent)}${slot('accent2', light.ink)}${slot('accent3', light.muted)}${slot('accent4', light.line)}${slot('accent5', dark.elevated)}${slot('accent6', dark.muted)}`
    + `${slot('hlink', light.ink)}${slot('folHlink', light.muted)}</a:clrScheme>`;
  return xml.replace(/<a:clrScheme [\s\S]*?<\/a:clrScheme>/, scheme).replace(/(<a:theme [^>]*name=")[^"]*"/, `$1${name}"`);
}

async function load(name) {
  try { return (await import(name)).default; } catch {
    throw new Error(`${name} is not installed here. Run: npm install --no-save pptxgenjs`);
  }
}

/** Builds the deck and returns the .pptx file as a Buffer. `baseDir` resolves image paths. */
export async function buildDeck(brand, deck, { baseDir = process.cwd(), fallbackFonts = false } = {}) {
  const brandErrors = validateBrand(brand);
  if (brandErrors.length) throw new Error(`brand contract is invalid:\n${brandErrors.join('\n')}`);
  const deckErrors = validateDeck(deck);
  if (deckErrors.length) throw new Error(`deck is invalid:\n${deckErrors.join('\n')}`);

  const PptxGenJS = await load('pptxgenjs');
  const JSZip = await load('jszip');
  const named = fontsFrom(brand, deck);
  const fonts = fallbackFonts ? { head: named.fallback, body: named.fallback, mono: named.monoFallback } : named;
  const tones = palettes(brand);
  const accentColors = { accent: brand.tokens.light.accent, onAccent: brand.tokens.light.onAccent };
  const size = { body: deck.sizes?.body ?? 24, detail: deck.sizes?.detail ?? MIN_BODY_PT };
  const radius = Math.min(0.5, (parseFloat(brand.tokens.light.radius) / (brand.tokens.light.radius.endsWith('rem') ? 1 / 16 : 1)) / 96);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = deck.title;
  pptx.author = deck.author ?? brand.name;
  pptx.company = brand.name;
  pptx.theme = { headFontFace: fonts.head, bodyFontFace: fonts.body };

  // One master per layout and tone, each with a real title placeholder so screen readers and the outline see every title.
  const masters = new Set();
  const master = (layout, tone) => {
    const name = `${layout[0].toUpperCase()}${layout.slice(1)}${tone === DEFAULT_TONE[layout] ? '' : ` ${tone}`}`;
    if (masters.has(name)) return name;
    masters.add(name);
    const c = tones[tone];
    const [bottom, w, max, , lines] = TITLE[layout], h = (lines * max * 1.1) / 72;
    const objects = [{ placeholder: { options: { name: 'title', type: 'title', x: MX, y: bottom - h, w, h, fontFace: fonts.head, fontSize: max, bold: true, color: bare(c.text), align: 'left', valign: 'bottom', margin: 0 }, text: 'Title states the conclusion' } }];
    const chrome = !['cover', 'closing'].includes(layout);
    if (chrome) objects.push({ text: { text: deck.footer ?? brand.name, options: { x: MX, y: FOOT_Y, w: CW - 1.2, h: 0.3, fontFace: fonts.body, fontSize: 12, color: bare(c.muted), margin: 0, valign: 'top' } } });
    pptx.defineSlideMaster({
      title: name,
      background: { color: bare(c.bg) },
      objects,
      ...(chrome && { slideNumber: { x: W - MX - 1, y: FOOT_Y, w: 1, h: 0.3, fontFace: fonts.mono, fontSize: 12, color: bare(c.muted), align: 'right', margin: 0 } }),
    });
    return name;
  };

  let sectionCount = 0;
  deck.slides.forEach((spec, index) => {
    const tone = spec.tone ?? DEFAULT_TONE[spec.layout];
    const c = { ...tones[tone], ...accentColors };
    const slide = pptx.addSlide({ masterName: master(spec.layout, tone) });
    const where = `slides[${index}] (${spec.layout})`;
    const [titleBottom] = TITLE[spec.layout];
    const tsize = titleSize(spec.layout, spec.title);
    if (!tsize) throw new Error(`${where}: title is too long for the layout at a projected size; shorten it`);
    slide.addText(spec.title, { placeholder: 'title', fontSize: tsize, color: bare(c.text), align: 'left' });
    let y = titleBottom + 0.35;
    const sources = [...list(spec.source), ...(spec.layout === 'image' ? [spec.image.source] : [])];
    const floor = sources.length ? SOURCE_Y - 0.1 : FOOT_Y - 0.25;
    const fits = (bottom, what) => { if (bottom > floor + 0.01) throw new Error(`${where}: ${what} runs past the safe area; cut text or split the slide`); };
    const text = (value, opts) => slide.addText(value, { fontFace: fonts.body, color: bare(c.text), margin: 0, valign: 'top', ...opts });

    const body = (width = 10, sizePt = size.body, x = MX) => {
      if (spec.body) {
        const h = blockHeight(spec.body, sizePt, width, 1.3);
        fits(y + h, 'body');
        text(runs(spec.body, spec.highlight, c), { x, y, w: width, h, fontSize: sizePt, lineSpacingMultiple: 1.2 });
        y += h + 0.3;
      }
      if (spec.points?.length) {
        const h = spec.points.reduce((sum, p) => sum + blockHeight(p, size.detail + 2, width - 0.4, 1.35) + 0.12, 0);
        fits(y + h, 'points');
        text(spec.points.map((p, k) => ({ text: p, options: { bullet: { indent: 18 }, breakLine: k < spec.points.length - 1, paraSpaceAfter: 8 } })), { x, y, w: width, h, fontSize: size.detail + 2, color: bare(c.muted), lineSpacingMultiple: 1.15 });
        y += h + 0.3;
      }
    };

    switch (spec.layout) {
      case 'cover': {
        text(brand.name, { x: MX, y: MY, w: 6, h: 0.45, fontFace: fonts.head, fontSize: 20, bold: true });
        if (spec.subtitle) {
          const h = blockHeight(spec.subtitle, 28, 10.5, 1.3);
          fits(y + h, 'subtitle');
          text(runs(spec.subtitle, spec.highlight, c), { x: MX, y, w: 10.5, h, fontSize: 28, lineSpacingMultiple: 1.2 });
        }
        if (spec.context) {
          slide.addShape('line', { x: MX, y: FOOT_Y - 0.35, w: CW, h: 0, line: { color: bare(c.line), width: 0.75 } });
          text(spec.context, { x: MX, y: FOOT_Y - 0.2, w: CW, h: 0.4, fontFace: fonts.mono, fontSize: 14, color: bare(c.muted) });
        }
        break;
      }
      case 'section': {
        sectionCount += 1;
        text(String(sectionCount).padStart(2, '0'), { x: MX, y: MY + 0.2, w: 2, h: 0.5, fontFace: fonts.mono, fontSize: 20 });
        body(10);
        break;
      }
      case 'statement': body(10.8, size.body + 6); break;
      case 'image': {
        const buffer = readFileSync(path.resolve(baseDir, spec.image.path));
        const natural = imageSize(buffer);
        // The image leads. The caption goes beside it or below it, whichever leaves the image larger.
        const gap = 0.4, capSize = size.detail + 2, room = floor - y;
        const fit = (w, h) => { const s = Math.min(w / natural.w, h / natural.h); return { iw: natural.w * s, ih: natural.h * s }; };
        const besideW = 2.8, belowH = spec.caption ? blockHeight(spec.caption, capSize, CW, 1.35) + gap : 0;
        const beside = spec.caption ? fit(CW - besideW - gap, room) : fit(CW, room);
        const below = fit(CW, room - belowH);
        const side = spec.caption && beside.iw * beside.ih > below.iw * below.ih;
        const { iw, ih } = side || !spec.caption ? beside : below;
        if (ih < 2.5) throw new Error(`${where}: not enough room for the image; shorten the title or caption`);
        y += (room - ih - (side ? 0 : belowH)) / 2;
        const mime = buffer[0] === 0x89 ? 'image/png' : 'image/jpeg';
        slide.addImage({ data: `${mime};base64,${buffer.toString('base64')}`, x: MX, y, w: iw, h: ih, altText: spec.image.alt });
        if (spec.image.frame) slide.addShape('rect', { x: MX, y, w: iw, h: ih, fill: { type: 'none' }, line: { color: bare(c.line), width: 0.75 } });
        if (spec.caption && side) {
          const cw = CW - iw - gap, ch = blockHeight(spec.caption, capSize, cw, 1.35);
          if (ch > ih) throw new Error(`${where}: caption is longer than the image is tall; shorten it`);
          slide.addShape('line', { x: MX + iw + gap, y, w: cw, h: 0, line: { color: bare(c.line), width: 0.75 } });
          text(spec.caption, { x: MX + iw + gap, y: y + 0.2, w: cw, h: ch, fontSize: capSize, lineSpacingMultiple: 1.2 });
        } else if (spec.caption) {
          text(spec.caption, { x: MX, y: y + ih + gap - 0.1, w: CW, h: belowH - gap, fontSize: capSize, lineSpacingMultiple: 1.2 });
        }
        break;
      }
      case 'comparison': {
        const bh = blockHeight(spec.basis, size.detail + 2, CW, 1.3);
        text(spec.basis, { x: MX, y, w: CW, h: bh, fontSize: size.detail + 2, color: bare(c.muted) });
        y += bh + 0.35;
        const gap = 0.3, n = spec.columns.length, cw = (CW - gap * (n - 1)) / n;
        const need = Math.max(...spec.columns.map(col => 0.35 + 0.55 + col.points.reduce((s, p) => s + blockHeight(p, size.detail + 2, cw - 0.8, 1.35) + 0.12, 0) + 0.3));
        const ch = Math.max(need, Math.min(3.6, floor - y));
        fits(y + ch, 'columns');
        spec.columns.forEach((col, k) => {
          const x = MX + k * (cw + gap);
          const fill = col.mark ? c.accent : c.card, ink = col.mark ? c.onAccent : c.cardText;
          slide.addShape('roundRect', { x, y, w: cw, h: ch, rectRadius: radius, fill: { color: bare(fill) }, line: { color: bare(col.mark ? c.accent : c.line), width: 0.75 } });
          text(col.heading, { x: x + 0.35, y: y + 0.35, w: cw - 0.7, h: 0.5, fontFace: fonts.head, fontSize: 24, bold: true, color: bare(ink) });
          text(col.points.map((p, j) => ({ text: p, options: { bullet: { indent: 18 }, breakLine: j < col.points.length - 1, paraSpaceAfter: 8 } })), { x: x + 0.35, y: y + 1.05, w: cw - 0.7, h: ch - 1.3, fontSize: size.detail + 2, color: bare(ink), lineSpacingMultiple: 1.15 });
        });
        break;
      }
      case 'data': {
        if (spec.metric) {
          // The figure sits in a highlighter field; the label and any detail read beside it, or below when the figure is wide.
          const valueSize = 120, vh = (valueSize * 1.3) / 72, vw = (spec.metric.value.length * valueSize * 0.62) / 72 + 0.7;
          fits(y + vh, 'metric');
          text(spec.metric.value, { x: MX, y, w: vw, h: vh, fontFace: fonts.mono, fontSize: valueSize, bold: true, color: bare(c.onAccent), fill: { color: bare(c.accent) }, align: 'center', valign: 'middle' });
          const beside = CW - vw - 0.6 >= 5;
          const x = beside ? MX + vw + 0.6 : MX, width = beside ? CW - vw - 0.6 : 10;
          if (!beside) y += vh + 0.35;
          const lh = blockHeight(spec.metric.label, 28, width, 1.3);
          fits(y + lh, 'metric label');
          text(spec.metric.label, { x, y, w: width, h: lh, fontSize: 28, lineSpacingMultiple: 1.2 });
          y += lh + 0.3;
          body(width, size.detail + 2, x);
        } else {
          const values = spec.chart.values, mark = spec.chart.highlight;
          const colors = values.map((_, k) => bare(k === mark ? c.accent : c.text));
          slide.addChart(pptx.ChartType.bar, [{ name: spec.chart.name ?? spec.title, labels: spec.chart.labels, values }], {
            x: MX, y, w: CW, h: floor - y, barDir: 'bar', catAxisOrientation: 'maxMin', chartColors: colors, barGapWidthPct: 60,
            catAxisLabelFontFace: fonts.body, catAxisLabelFontSize: size.detail, catAxisLabelColor: bare(c.text), catAxisLineShow: false,
            valAxisHidden: true, valGridLine: { style: 'none' }, showValue: true, dataLabelPosition: 'outEnd',
            dataLabelFontFace: fonts.mono, dataLabelFontSize: size.detail, dataLabelColor: bare(c.text), dataLabelFormatCode: spec.chart.format ?? 'General',
            showLegend: false, showTitle: false, altText: spec.chart.alt ?? `${spec.title}. ${spec.chart.labels.map((l, k) => `${l}: ${values[k]}`).join(', ')}`,
          });
        }
        break;
      }
      case 'process': {
        const n = spec.steps.length, gap = 0.35, sw = (CW - gap * (n - 1)) / n, chip = 0.56;
        y += 0.45;
        const th = Math.max(...spec.steps.map(step => blockHeight(step.title, 24, sw, 1.2, true)));
        spec.steps.forEach((step, k) => {
          const x = MX + k * (sw + gap);
          if (k < n - 1) slide.addShape('line', { x: x + chip + 0.12, y: y + chip / 2, w: sw + gap - chip - 0.24, h: 0, line: { color: bare(c.line), width: 1.25 } });
          slide.addShape('roundRect', { x, y, w: chip, h: chip, rectRadius: radius / 2, fill: { color: bare(c.chip) }, line: { color: bare(c.chip), width: 0 } });
          text(String(k + 1), { x, y, w: chip, h: chip, fontFace: fonts.mono, fontSize: 20, bold: true, color: bare(c.chipText), align: 'center', valign: 'middle' });
          text(step.title, { x, y: y + chip + 0.3, w: sw, h: th, fontFace: fonts.head, fontSize: 24, bold: true, lineSpacingMultiple: 1.05, valign: 'bottom' });
          if (step.text) {
            const bh = blockHeight(step.text, size.detail, sw, 1.35);
            fits(y + chip + 0.3 + th + 0.15 + bh, `steps[${k}]`);
            text(step.text, { x, y: y + chip + 0.3 + th + 0.15, w: sw, h: bh, fontSize: size.detail, color: bare(c.muted), lineSpacingMultiple: 1.2 });
          }
        });
        break;
      }
      case 'closing': {
        body(10);
        const label = spec.action ?? brand.primaryAction.label;
        const bw = Math.min(CW, (label.length * 22 * 0.55) / 72 + 1);
        fits(y + 0.8, 'action');
        slide.addText(label, { shape: 'roundRect', rectRadius: 0.4, x: MX, y, w: bw, h: 0.8, fill: { color: bare(c.chip) }, color: bare(c.chipText), fontFace: fonts.head, fontSize: 22, bold: true, align: 'center', valign: 'middle', margin: 0 });
        text(brand.name, { x: MX, y: MY, w: 6, h: 0.45, fontFace: fonts.head, fontSize: 20, bold: true });
        if (spec.contact) {
          slide.addShape('line', { x: MX, y: FOOT_Y - 0.35, w: CW, h: 0, line: { color: bare(c.line), width: 0.75 } });
          text(spec.contact, { x: MX, y: FOOT_Y - 0.2, w: CW, h: 0.4, fontFace: fonts.mono, fontSize: 14 });
        }
        break;
      }
    }

    // Sources sit above the footer, numbered like the citations they back.
    if (sources.length) {
      const parts = sources.flatMap((s, k) => [
        { text: ` ${k + 1} `, options: { fontFace: fonts.mono, highlight: bare(c.accent), color: bare(c.onAccent) } },
        { text: ` ${s}${k < sources.length - 1 ? '     ' : ''}`, options: {} },
      ]);
      text(parts, { x: MX, y: SOURCE_Y, w: CW, h: 0.35, fontSize: 12, color: bare(c.muted), valign: 'middle' });
    }
    if (isText(spec.notes)) slide.addNotes(spec.notes);
  });

  const zip = await JSZip.loadAsync(await pptx.write({ outputType: 'nodebuffer' }));
  const themePath = 'ppt/theme/theme1.xml';
  zip.file(themePath, brandTheme(await zip.file(themePath).async('string'), brand));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const flag = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
  const [brandPath, deckPath, out] = [flag('brand'), flag('deck'), flag('out')];
  if (!brandPath || !deckPath || !out) { console.error('usage: node slides.mjs --brand brand.json --deck deck.json --out deck.pptx [--fallback-fonts]'); process.exit(1); }
  try {
    const brand = JSON.parse(readFileSync(brandPath, 'utf8'));
    const deck = JSON.parse(readFileSync(deckPath, 'utf8'));
    const fallbackFonts = args.includes('--fallback-fonts');
    writeFileSync(out, await buildDeck(brand, deck, { baseDir: path.dirname(path.resolve(deckPath)), fallbackFonts }));
    const f = fontsFrom(brand, deck);
    console.log(`wrote ${out}: ${deck.slides.length} slides`);
    console.log(fallbackFonts ? `fonts: ${f.fallback} and ${f.monoFallback} (fallback)` : `fonts: ${f.head} and ${f.mono}, named not embedded; without them installed, use --fallback-fonts for ${f.fallback} and ${f.monoFallback}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

