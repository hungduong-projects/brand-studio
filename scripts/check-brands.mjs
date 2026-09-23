// Validate every brand contract in the repo (*.brand.json and brand/brand.json), not just the skill's sample.
import { globSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const files = globSync(['{apps,plugins}/**/*.brand.json', '{apps,plugins}/**/brand/brand.json'], { exclude: path => path.includes('node_modules') || path.endsWith('/out') || path.endsWith('/dist') }).sort();
if (files.length === 0) throw new Error('No *.brand.json files found');
let failed = 0;
for (const file of files) {
  try {
    execFileSync(process.execPath, ['plugins/brand-studio/skills/brand-design/scripts/brand-check.mjs', file], { stdio: 'pipe' });
    console.log(`ok   ${file}`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${file}\n${String(error.stdout ?? '') + String(error.stderr ?? '')}`);
  }
}
if (failed) process.exit(1);
