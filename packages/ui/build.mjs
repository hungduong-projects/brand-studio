import { readFileSync, writeFileSync } from 'node:fs';
const parts = ['styles.css', 'ai.css', 'effects.css', 'app.css', 'story.css'];
writeFileSync(new URL('./dist/styles.css', import.meta.url), parts.map(part => readFileSync(new URL(`./src/${part}`, import.meta.url), 'utf8')).join('\n'));
