// Put the showcase build under the docs site at /examples/. Run after both apps build.
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';

const from = 'apps/showcase/dist', to = 'apps/docs/out/examples';
if (!existsSync(`${from}/index.html`)) throw new Error(`${from} is missing; build the showcase first`);
// Reference media for local study must never reach a deploy.
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? [`${dir}/${e.name}`, ...walk(`${dir}/${e.name}`)] : []);
if (walk(from).some(dir => dir.endsWith('/local-ref'))) throw new Error(`${from} contains local-ref; refusing to copy`);
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });
console.log(`copied ${from} to ${to}`);
