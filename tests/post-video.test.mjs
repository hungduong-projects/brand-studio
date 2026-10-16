import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../plugins/brand-studio/skills/post-video/scripts/post-video.mjs', import.meta.url));
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
  assert.ok(result.warnings.some(w => w.includes('voice line "hello" reads at')), 'a 45-character caption over 0.8 s reads faster than 20 a second');
  assert.ok(result.seconds >= 1.1, `the film holds "hello" for its line: ${result.seconds}s`);
  assert.equal(result.captions, path.join(dir, 'film.en_US.srt'));
  assert.ok(!existsSync(path.join(dir, 'film.silent.mp4')));

  const streams = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,sample_rate,channels', '-of', 'json', out], { encoding: 'utf8' }).stdout).streams;
  assert.deepEqual(streams.map(s => [s.codec_type, s.codec_name]), [['video', 'h264'], ['audio', 'aac']]);
  assert.deepEqual([streams[0].width, streams[0].height, streams[1].sample_rate, streams[1].channels], [1080, 1080, '48000', 2], 'a mono voice still mixes to stereo');

  const srt = readFileSync(result.captions, 'utf8');
  assert.match(srt, /^1\n00:00:00,\d{3} --> 00:00:00,[5-9]\d{2}\nbrandstudio\.js\.org:\nthis square turns orange\.\n$/);
});
