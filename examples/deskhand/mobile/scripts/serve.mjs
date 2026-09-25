// Serve the web export with the single-page fallback it expects. Used by verify.mjs and store-shots.mjs.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

export async function serve(dist) {
  if (!existsSync(path.join(dist, 'index.html'))) throw new Error('dist/ is missing. Run npm run export:web first.');
  const server = createServer((req, res) => {
    let file = path.join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = path.join(dist, 'index.html');
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}
