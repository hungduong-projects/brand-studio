// App Store and Google Play screenshots from the web export, using the brand-design skill's store-shots.mjs.
// iOS screens go to the App Store sizes, Android-convention screens (?os=android) to Google Play.
//
//   npm run export:web && node scripts/store-shots.mjs
//
// Writes every size to store-shots/raw/ (ignored by git). The committed store-shots/*.jpg are a hand-picked few.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(here, '..');
const skill = path.join(app, '../../../plugins/brand-studio/skills/brand-design/scripts/store-shots.mjs');
const run = args => new Promise((resolve, reject) => spawn(process.execPath, args, { stdio: 'inherit' })
  .on('exit', code => code ? reject(new Error(`store-shots.mjs exited with ${code}`)) : resolve()));
const server = await serve(path.join(app, 'dist'));
try {
  for (const [plan, stores] of [['plan-ios.json', 'apple'], ['plan-android.json', 'play']]) {
    // Async, so this process can keep serving while the script loads pages.
    await run([skill, `${server.origin}/`, '--brand', path.join(app, 'src/brand/brand.json'),
      '--plan', path.join(app, 'store-shots', plan), '--stores', stores, '--out', path.join(app, 'store-shots/raw', stores)]);
  }
} finally {
  server.close();
}
