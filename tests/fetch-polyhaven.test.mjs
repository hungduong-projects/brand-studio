import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('provider include paths stay inside the asset folder', t => {
  const run = spawnSync('python3', [fileURLToPath(new URL('fetch-polyhaven.test.py', import.meta.url)), '-v'], { encoding: 'utf8', timeout: 10000 });
  if (run.error?.code === 'ENOENT') { t.skip('python3 is not installed'); return; }
  assert.equal(run.status, 0, run.error?.message ?? run.stdout + run.stderr);
});
