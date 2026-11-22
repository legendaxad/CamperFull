/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    /*
     * Port 5173 matches the backend's default ADMIN_URL (CORS + origin allow-list).
     * In development `/api` is proxied to the backend so auth cookies stay first-party.
     */
    server: {
      port: 5173,
      strictPort: true,
      proxy: { '/api': { target: env.VITE_DEV_API_TARGET || 'http://localhost:8080', changeOrigin: true } },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts'
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) return 'motion'
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
