/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// Relative base so the built site works under a GitHub Pages project subpath.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
