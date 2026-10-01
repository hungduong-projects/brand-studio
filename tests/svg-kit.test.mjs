import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { encodePng, hex6, inner, inside, iou, outsideCircle, readTags, root, shapes, unsafe, withSize } from '../plugins/brand-studio/skills/brand-design/scripts/svg-kit.mjs';

test('reads tags and skips the prolog, doctype and comments', () => {
  const svg = '<?xml version="1.0"?><!DOCTYPE svg><!-- <rect fill="red"/> --><svg viewBox="0 0 4 4"><rect x="1" y=\'2\' width="1" height="1"/></svg>';
  const tags = readTags(svg);
  assert.deepEqual(tags.map(t => [t.name, t.close, t.self]), [['svg', false, false], ['rect', false, true], ['svg', true, false]]);
  assert.deepEqual(tags[1].attrs, { x: '1', y: '2', width: '1', height: '1' });
  assert.equal(root(svg).viewBox, '0 0 4 4');
  assert.equal(root('<g/>'), null);
});

test('shapes inherit presentation attributes from groups', () => {
  const list = shapes('<svg fill="none"><g stroke="currentColor" stroke-width="2"><path d="M0 0" stroke-width="3"/><circle r="1"/></g><title>x</title></svg>');
  assert.deepEqual(list.map(s => [s.tag, s.attrs.fill, s.attrs.stroke, s.attrs['stroke-width']]), [['path', 'none', 'currentColor', '3'], ['circle', 'none', 'currentColor', '2']]);
});

test('flags scripts, media, live text, CSS, handlers and external links', () => {
  const problems = unsafe('<svg onload="x()"><script/><image/><text>Hi</text><style/><rect class="a" style="fill:red"/><use href="#ok"/><use xlink:href="http://x/y.svg#a"/></svg>');
  for (const p of ['event attribute onload', '<script>', '<image>', '<text>', '<style>', 'class attribute', 'style attribute', 'external xlink:href']) assert.ok(problems.some(q => q.includes(p)), `missing ${p}`);
  assert.ok(!problems.some(q => q.includes('external href')), 'an internal #id link is allowed');
});

test('inner returns the markup between root tags; withSize sets size and xmlns once', () => {
  assert.equal(inner('<svg viewBox="0 0 1 1"><g><rect/></g></svg>'), '<g><rect/></g>');
  const sized = withSize('<svg viewBox="0 0 1 1" width="10" height="10"><rect/></svg>', 64);
  assert.match(sized, /^<svg viewBox="0 0 1 1" xmlns="http:\/\/www.w3.org\/2000\/svg" width="64" height="64">/);
  assert.equal(sized.match(/width=/g).length, 1);
});

test('iou and outsideCircle measure masks', () => {
  assert.equal(iou([1, 1, 0, 0], [1, 0, 0, 0]), 0.5);
  assert.equal(iou([0, 0], [0, 0]), 1);
  const size = 10, full = new Uint8Array(size * size).fill(1), centre = new Uint8Array(size * size);
  centre[4 * size + 4] = centre[5 * size + 5] = 1;
  assert.equal(outsideCircle(centre, size, 0.2), 0);
  assert.ok(outsideCircle(full, size, 0.4) > 0);
  assert.equal(outsideCircle(full, size, 0.75), 0);
});

test('encodePng writes RGB without alpha for opaque store icons', () => {
  const rgba = Buffer.from([255, 0, 0, 255, 0, 255, 0, 255]);
  for (const [alpha, type, bytes] of [[true, 6, 4], [false, 2, 3]]) {
    const png = encodePng(2, 1, rgba, { alpha });
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(png.readUInt32BE(16), 2);
    assert.equal(png[25], type);
    const idat = png.indexOf('IDAT');
    const raw = inflateSync(png.subarray(idat + 4, idat + 4 + png.readUInt32BE(idat - 4)));
    assert.equal(raw.length, 1 + 2 * bytes);
    assert.deepEqual([...raw.subarray(1, 4)], [255, 0, 0]);
  }
});

test('hex6 accepts six-digit hex in any case; inside keeps paths in a folder', () => {
  assert.ok(hex6('#FFE14D') && hex6('#ffe14d'));
  assert.ok(!hex6('#fff') && !hex6('yellow'));
  assert.ok(inside('/a/b', 'parts/x.svg'));
  assert.ok(!inside('/a/b', '../x.svg'));
  assert.ok(!inside('/a/b', '/etc/passwd'));
});
