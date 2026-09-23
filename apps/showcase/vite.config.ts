import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { rmSync } from 'node:fs';

// public/local-ref holds git-ignored reference media for local study; keep it out of every build.
const dropLocalRef = { name: 'drop-local-ref', apply: 'build' as const, closeBundle() { rmSync(new URL('dist/local-ref', import.meta.url), { recursive: true, force: true }); } };

export default defineConfig({ plugins: [react(), dropLocalRef] });
