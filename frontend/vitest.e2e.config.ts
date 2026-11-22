/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * End-to-end UI tests: render the real app in jsdom against a RUNNING backend
 * (through the Vite dev server proxy on http://localhost:3000). Not part of `npm test`.
 * Start the backend and `npm run dev` first, then `npm run test:e2e`.
 */
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['e2e/**/*.e2e.test.tsx'],
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:3000/' } },
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 30_000,
    fileParallelism: false,
    css: false,
  },
})
