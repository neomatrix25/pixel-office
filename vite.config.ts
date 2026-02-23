import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  base: './',
  server: {
    // Proxy /api requests to the OpenClaw gateway in dev mode.
    // Set OPENCLAW_GATEWAY_URL env var to the internal gateway address.
    proxy: process.env.OPENCLAW_GATEWAY_URL
      ? {
          '/api': {
            target: process.env.OPENCLAW_GATEWAY_URL,
            changeOrigin: true,
          },
          '/sessions_list': {
            target: process.env.OPENCLAW_GATEWAY_URL,
            changeOrigin: true,
          },
        }
      : undefined,
  },
})
