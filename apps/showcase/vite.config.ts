import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// public/local-ref holds git-ignored reference media for local study; keep it out of every build.
const dropLocalRef = { name: 'drop-local-ref', apply: 'build' as const, closeBundle() { rmSync(new URL('dist/local-ref', import.meta.url), { recursive: true, force: true }); } };

// In dev, read @brand-studio/ui from its source so package edits show up without a rebuild. Builds keep the published dist.
const uiSource = fileURLToPath(new URL('../../packages/ui/src/', import.meta.url));
// Same order as packages/ui/build.mjs.
const uiCss = ['styles.css', 'ai.css', 'effects.css', 'app.css', 'nav.css', 'data.css', 'story.css', 'product.css'];
const liveUi: Plugin = {
  name: 'live-ui-source',
  apply: 'serve',
  enforce: 'pre',
  resolveId(id) {
    if (id === '@brand-studio/ui') return `${uiSource}index.ts`;
    if (id === '@brand-studio/ui/styles.css') return 'virtual:bs-ui-styles.css';
  },
  load(id) {
    if (id === 'virtual:bs-ui-styles.css') return uiCss.map(part => `@import "${uiSource}${part}";`).join('\n');
  },
};

export default defineConfig({ plugins: [liveUi, react(), dropLocalRef] });
