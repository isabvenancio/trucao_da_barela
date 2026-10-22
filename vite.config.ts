/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.ts', 'src/bots/**/*.ts'],
      exclude: ['**/__tests__/**', '**/index.ts'],
      thresholds: { lines: 90 },
    },
  },
});
