import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
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

// The docs site serves the build under /examples/. Each page gets its own index.html so a static host finds it without a rewrite rule.
const pages = ['camera', 'deskhand', 'sneaker'];
const pageFolders = { name: 'page-folders', apply: 'build' as const, closeBundle() {
  const index = new URL('dist/index.html', import.meta.url);
  for (const page of pages) {
    mkdirSync(new URL(`dist/${page}/`, import.meta.url), { recursive: true });
    copyFileSync(index, new URL(`dist/${page}/index.html`, import.meta.url));
  }
} };

export default defineConfig(({ command, isPreview }) => ({ base: command === 'build' || isPreview ? '/examples/' : '/', plugins: [liveUi, react(), dropLocalRef, pageFolders] }));
