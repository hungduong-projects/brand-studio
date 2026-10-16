import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../plugins/brand-studio/skills/post-video/scripts/post-video.mjs', import.meta.url));
const VOICE = fileURLToPath(new URL('../plugins/brand-studio/skills/post-video/scripts/voice-over.mjs', import.meta.url));
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ffmpeg = spawnSync('ffmpeg', ['-version']).status === 0 && spawnSync('ffprobe', ['-version']).status === 0;

// A film of two beats: the square turns from grey to orange on "hello", and the film ends after "bye".
const PAGE = `<!doctype html><html><body style="margin:0;display:grid;place-items:center;height:100vh;font:24px system-ui">
<div id="sq" style="width:200px;height:200px;background:#888"></div><p>Hello square</p>
<script>
const wait = ms => new Promise(done => setTimeout(done, ms));
const beat = (id, ms) => { window.filmBeat?.(id); return wait(Math.max(ms, (window.filmVoice?.[id] ?? -1) * 1000 + 100)); };
window.filmStart = () => { (async () => {
  await beat('hello', 300); document.getElementById('sq').style.background = '#e8590c';
  await beat('bye', 300); window.filmDone = Date.now();
})(); };
</script></body></html>`;

test('a narrated recording places each voice line on its beat, adds stereo AAC sound and writes Facebook-named captions', { skip: !ffmpeg && 'ffmpeg is not installed' }, () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'post-video-'));
  writeFileSync(path.join(dir, 'page.html'), PAGE);
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.8', '-b:a', '128k', path.join(dir, 'hello.mp3')]);
  writeFileSync(path.join(dir, 'voice.json'), JSON.stringify({ lines: [
    { id: 'hello', text: 'Brand studio dot J S dot org, this square turns orange.', caption: 'brandstudio.js.org: this square turns orange.', file: 'hello.mp3', seconds: 0.8 },
    { id: 'gone', text: 'No beat plays this line.', file: 'hello.mp3', seconds: 0.8 },
  ] }));
  const out = path.join(dir, 'film.mp4');
  const r = spawnSync(process.execPath, [SCRIPT, path.join(dir, 'page.html'), '--format', 'square', '--slow', '.5', '--fps', '15', '--voice', path.join(dir, 'voice.json'), '--out', out], { encoding: 'utf8', cwd: ROOT });
  assert.equal(r.status, 0, r.stderr);
  const result = JSON.parse(r.stdout.trim());
  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.some(w => w.includes('voice line "gone" has no beat')), JSON.stringify(result.warnings));
  assert.ok(result.warnings.some(w => w.includes('voice line "hello" reads at')), 'a 45-character caption up for about a second reads faster than 20 a second');
  assert.ok(result.seconds >= 1.1, `the film holds "hello" for its line: ${result.seconds}s`);
  assert.equal(result.captions, path.join(dir, 'film.en_US.srt'));
  assert.ok(!existsSync(path.join(dir, 'film.silent.mp4')));

  const streams = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,sample_rate,channels', '-of', 'json', out], { encoding: 'utf8' }).stdout).streams;
  assert.deepEqual(streams.map(s => [s.codec_type, s.codec_name]), [['video', 'h264'], ['audio', 'aac']]);
  assert.deepEqual([streams[0].width, streams[0].height, streams[1].sample_rate, streams[1].channels], [1080, 1080, '48000', 2], 'a mono voice still mixes to stereo');

  const srt = readFileSync(result.captions, 'utf8'), at = t => t.split(/[:,]/).reduce((a, n, i) => a + n * [3600, 60, 1, .001][i], 0);
  const [, start, end] = srt.match(/^1\n(\S+) --> (\S+)\nbrandstudio\.js\.org:\nthis square turns orange\.\n$/) ?? [];
  assert.ok(start, srt);
  const held = Math.min(at(start) + .8 + .5, result.seconds - 2 / 15);
  assert.ok(Math.abs(at(end) - held) < .01, `the caption stays half a second past its 0.8 s line, or until two frames before the end: ${start} --> ${end}, expected ${held.toFixed(3)}`);
});

test('a gap under half a second between captions closes to two frames, and the last caption keeps its half second', { skip: !ffmpeg && 'ffmpeg is not installed' }, () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'post-video-'));
  // No filmStart, so the film runs for --seconds. The second beat comes 1.6 s after the first, 0.3 s after the first caption's hold.
  writeFileSync(path.join(dir, 'page.html'), `<!doctype html><html><body><p>Two lines</p><script>
(function wait() { if (!window.__t0) return requestAnimationFrame(wait); window.filmBeat('one'); setTimeout(() => window.filmBeat('two'), 1600); })();
</script></body></html>`);
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.8', '-b:a', '128k', path.join(dir, 'tone.mp3')]);
  writeFileSync(path.join(dir, 'voice.json'), JSON.stringify({ lines: [
    { id: 'one', text: 'The square turns orange.', file: 'tone.mp3', seconds: 0.8 },
    { id: 'two', text: 'Then it turns blue.', file: 'tone.mp3', seconds: 0.8 },
  ] }));
  const r = spawnSync(process.execPath, [SCRIPT, path.join(dir, 'page.html'), '--format', 'square', '--slow', '1', '--fps', '15', '--seconds', '3.2', '--voice', path.join(dir, 'voice.json'), '--out', path.join(dir, 'film.mp4')], { encoding: 'utf8', cwd: ROOT });
  assert.equal(r.status, 0, r.stderr);
  const result = JSON.parse(r.stdout.trim()), at = t => t.split(/[:,]/).reduce((a, n, i) => a + n * [3600, 60, 1, .001][i], 0);
  const [one, two] = [...readFileSync(result.captions, 'utf8').matchAll(/(\S+) --> (\S+)/g)].map(([, start, end]) => [at(start), at(end)]);
  assert.ok(Math.abs(one[1] - (two[0] - 2 / 15)) < .01, `the first caption runs on to two frames before the second: ${one} then ${two}`);
  const held = Math.min(two[0] + .8 + .5, result.seconds - 2 / 15);
  assert.ok(Math.abs(two[1] - held) < .01, `the last caption stays half a second past its line, whatever the film's length: ${two} in ${result.seconds} s, expected ${held.toFixed(3)}`);
});

test('a sentence too long for one caption splits into even captions at a sensible break, never leaving a word alone', { skip: !ffmpeg && 'ffmpeg is not installed' }, () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'post-video-'));
  writeFileSync(path.join(dir, 'page.html'), `<!doctype html><html><body><p>One line</p><script>
(function wait() { if (!window.__t0) return requestAnimationFrame(wait); window.filmBeat('one'); })();
</script></body></html>`);
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-b:a', '128k', path.join(dir, 'tone.mp3')]);
  writeFileSync(path.join(dir, 'voice.json'), JSON.stringify({ lines: [
    { id: 'one', text: 'Fun fact: people liked a model trained this way better than one a hundred times bigger.', file: 'tone.mp3', seconds: 1 },
  ] }));
  const r = spawnSync(process.execPath, [SCRIPT, path.join(dir, 'page.html'), '--format', 'square', '--slow', '1', '--fps', '15', '--seconds', '1.5', '--voice', path.join(dir, 'voice.json'), '--out', path.join(dir, 'film.mp4')], { encoding: 'utf8', cwd: ROOT });
  assert.equal(r.status, 0, r.stderr);
  const cues = [...readFileSync(JSON.parse(r.stdout.trim()).captions, 'utf8').matchAll(/--> \S+\n([^]*?)\n(?:\n|$)/g)].map(m => m[1].replace(/\n/g, ' '));
  assert.deepEqual(cues, ['Fun fact: people liked a model trained this way', 'better than one a hundred times bigger.']);
});

test('a voice clip far too short for its words warns that it has likely dropped words', { skip: !ffmpeg && 'ffmpeg is not installed' }, () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'voice-over-')), out = path.join(dir, 'voice');
  const text = 'This sentence has far too many words to fit in one second of speech.';
  mkdirSync(out);
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=1', path.join(out, 'line.mp3')]);
  // The clip on disk matches the line's key, so the script keeps it and never calls Fish Audio.
  const key = createHash('sha256').update(JSON.stringify([text, null, 's2.1-pro', 1])).digest('hex').slice(0, 16);
  writeFileSync(path.join(out, 'voice.json'), JSON.stringify({ lines: [{ id: 'line', key }] }));
  writeFileSync(path.join(dir, 'script.json'), JSON.stringify({ lines: [{ id: 'line', text }] }));
  const r = spawnSync(process.execPath, [VOICE, path.join(dir, 'script.json'), '--out', out], { encoding: 'utf8', env: { ...process.env, FISH_API_KEY: 'test' } });
  assert.equal(r.status, 0, r.stderr);
  const result = JSON.parse(r.stdout.trim());
  assert.equal(result.generated, 0);
  assert.ok(result.wpm > 260, `14 words in about a second: ${result.wpm} words a minute`);
  assert.match(result.warnings[0] ?? '', /^line is spoken at \d+ words a minute, so the clip has likely dropped words/);
});

test('a line far above the others in pitch warns that it can sound like another speaker', { skip: !ffmpeg && 'ffmpeg is not installed' }, () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'voice-over-')), out = path.join(dir, 'voice');
  mkdirSync(out);
  // Two lines at 130 Hz and one at 300 Hz, about 14.5 semitones higher, all cached so Fish Audio is never called.
  const lines = [['a', 130], ['b', 130], ['c', 300]].map(([id, hz]) => {
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `sine=frequency=${hz}:duration=1.5`, path.join(out, `${id}.mp3`)]);
    return { id, text: `Line ${id} is here.`, key: createHash('sha256').update(JSON.stringify([`Line ${id} is here.`, null, 's2.1-pro', 1])).digest('hex').slice(0, 16) };
  });
  writeFileSync(path.join(out, 'voice.json'), JSON.stringify({ lines: lines.map(({ id, key }) => ({ id, key })) }));
  writeFileSync(path.join(dir, 'script.json'), JSON.stringify({ lines: lines.map(({ id, text }) => ({ id, text })) }));
  const r = spawnSync(process.execPath, [VOICE, path.join(dir, 'script.json'), '--out', out], { encoding: 'utf8', env: { ...process.env, FISH_API_KEY: 'test' } });
  assert.equal(r.status, 0, r.stderr);
  const result = JSON.parse(r.stdout.trim());
  assert.equal(result.generated, 0);
  assert.ok(result.drift > 5, `per-line pitch spread: ${result.drift} semitones`);
  assert.deepEqual(result.warnings.map(w => w.split(' ')[0]), ['c'], JSON.stringify(result.warnings));
  assert.match(result.warnings[0], /^c sits 1[45]\.\d semitones above the other lines, so it can sound like another speaker/);
});
