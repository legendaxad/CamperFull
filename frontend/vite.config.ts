/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Where the dev server forwards /api requests (the backend's PORT, 8080 by default).
  const apiProxyTarget = env.VITE_DEV_API_PROXY ?? 'http://localhost:8080'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      // Must match the backend's CLIENT_URL (CORS + CSRF origin check), which defaults to :3000.
      port: 3000,
      strictPort: true,
      // Same-origin /api in development: cookies are first-party and no CORS preflight is needed.
      proxy: {
        '/api': { target: apiProxyTarget, changeOrigin: false },
      },
    },
    preview: { port: 3000 },
    test: {
      environment: 'jsdom',
      globals: false,
      // e2e/ needs a running backend; it has its own config (npm run test:e2e).
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
